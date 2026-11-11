/// <reference types="@cloudflare/workers-types" />
import { z } from 'zod';
import { company } from '../../src/data/company';
import { surveyAutoreply, surveyNotification, type MailRow } from '../email';
import { fieldMsg, isLocale, msg, type Locale } from '../messages';
import {
  type Env,
  oneLine,
  rateCount,
  rateLimited,
  respond,
  safeError,
  sameOrigin,
  sendResend,
  sendTelegram,
  verifyTurnstile,
} from '../lib';

// POST /api/survey - проверката за европейско финансиране (/eu-funding). Две събития:
//   event=step   - потребителят мина стъпка N (JS, след „Напред“). Частичните отговори отиват
//                  в Telegram, за да се вижда докъде стигат хората. Без лични данни.
//   event=submit - цялата проверка: Turnstile → Zod → имейл до нас + потвърждение + Telegram.
// Ред на защитите: произход → размер → honeypot → timing (само submit) → rate limit (KV) →
// Turnstile (само submit) → Zod. С INQUIRY_MOCK=1 нищо не се изпраща - логва се.

const RATE_LIMIT = 40; // на час, на IP: до 4 стъпки + повторения
const RATE_WINDOW = 60 * 60;
const MIN_SECONDS = 3;
const MAX_BODY = 32 * 1024;

const OPTIONS = {
  registered: { gt3: 'Повече от 3 години', '1-3': 'Между 1 и 3 години', lt1: 'По-малко от 1 година', no: 'Още не е регистрирана' },
  staff: { lt10: 'под 10', '10-50': 'между 10 и 49', '50-250': 'между 50 и 249', gt250: '250 и повече' },
  revenue: {
    none: 'нямат приходи още',
    lt100k: 'под 100 000 €',
    '100-150k': '100 000 – 150 000 €',
    '150-400k': '150 000 – 400 000 €',
    '400k-2m': '400 000 € – 2 млн. €',
    gt2m: 'над 2 млн. €',
  },
  wants: {
    soft: 'софтуер и дигитализация',
    mach: 'машини и оборудване',
    green: 'зелени технологии и енергийна ефективност',
    shop: 'онлайн магазин или сайт',
    train: 'обучение на служителите',
    other: 'друго',
  },
  budget: { lt50k: 'до 50 000 €', '50-150k': '50 000 – 150 000 €', '150-500k': '150 000 – 500 000 €', gt500k: 'над 500 000 €', unknown: 'още не знаят' },
  cofin: { yes: 'да', maybe: 'не е сигурен', no: 'не' },
  debts: { no: 'не', yes: 'да', unknown: 'не знае' },
} as const;

const oneOf = <K extends keyof typeof OPTIONS>(k: K) => z.enum(Object.keys(OPTIONS[k]) as [string, ...string[]]);

const fields = {
  registered: oneOf('registered'),
  staff: oneOf('staff'),
  revenue: oneOf('revenue'),
  company: z.string().trim().min(2).max(120),
  eik: z.string().trim().regex(/^(\d{9}|\d{13})?$/),
  city: z.string().trim().min(2).max(80),
  activity: z.string().trim().min(3).max(200),
  wants: z
    .string()
    .trim()
    .refine((v) => v.split(',').filter(Boolean).length > 0 && v.split(',').every((w) => w in OPTIONS.wants)),
  description: z.string().trim().min(10).max(1000),
  budget: oneOf('budget'),
  cofin: oneOf('cofin'),
  debts: oneOf('debts'),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().regex(/^\+?[\d\s()./-]{6,40}$/),
  consentPartner: z.literal('on'),
  consentPrivacy: z.literal('on'),
};
type Field = keyof typeof fields;

const LABELS: Record<Field, string> = {
  registered: 'Фирмата съществува',
  staff: 'Служители',
  revenue: 'Приходи (средно за 3 г.)',
  company: 'Фирма',
  eik: 'ЕИК',
  city: 'Населено място',
  activity: 'Дейност',
  wants: 'Иска да финансира',
  description: 'Идея',
  budget: 'Бюджет',
  cofin: 'Собствено участие',
  debts: 'Просрочени задължения',
  name: 'Име',
  email: 'Имейл',
  phone: 'Телефон',
  consentPartner: 'Запознат с предоставянето на партньора',
  consentPrivacy: 'Политика за поверителност',
};

// Личните данни (последната стъпка) никога не тръгват с частично известие.
// Telegram е извън ЕС: частичните известия носят само отговорите с избор, без свободен текст и без
// данни, по които може да се познае фирма или човек (ЕТ носи името на собственика).
const STEP_SAFE: Field[] = ['registered', 'staff', 'revenue', 'wants', 'budget', 'cofin', 'debts'];

const full = z
  .object(fields)
  .refine((d) => d.registered === 'no' || d.eik !== '', { path: ['eik'] });

function display(f: Field, v: string): string {
  if (f === 'wants') return v.split(',').map((w) => OPTIONS.wants[w as keyof typeof OPTIONS.wants] ?? w).join(', ');
  if (f in OPTIONS) return (OPTIONS as Record<string, Record<string, string>>)[f][v] ?? v;
  if (f === 'consentPartner' || f === 'consentPrivacy') return v === 'on' ? 'да' : 'не';
  return v;
}

const rowsOf = (d: Partial<Record<Field, string>>): MailRow[] =>
  (Object.keys(LABELS) as Field[])
    .filter((f) => f !== 'description' && d[f])
    .map((f) => ({ label: LABELS[f], value: display(f, String(d[f])) }));

const refFor = (session: string) =>
  'ЛЧ-' + (session.replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase() || String(Date.now()).slice(-6));

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (Number(request.headers.get('content-length') ?? '0') > MAX_BODY) return new Response(null, { status: 413 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response(null, { status: 400 });
  }
  const field = (name: string) => {
    const all = form.getAll(name).filter((v): v is string => typeof v === 'string');
    return all.join(',');
  };
  const locale: Locale = isLocale(field('locale')) ? (field('locale') as Locale) : 'bg';
  const mock = env.INQUIRY_MOCK === '1';
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const base = locale === 'bg' ? '' : '/en';
  const event = field('event') === 'step' ? 'step' : 'submit';
  const step = Math.min(5, Math.max(1, Number(field('step')) || 5));
  const session = /^[a-z0-9-]{4,40}$/i.test(field('session')) ? field('session') : '';
  const ref = refFor(session);
  const ok = (extra: Record<string, unknown> = {}) => respond(wantsJson, 200, { ok: true, ...extra }, `${base}/contact/sent`);
  const fail = (status: number, message: string, errors?: Record<string, string>) =>
    respond(wantsJson, status, { ok: false, message, errors }, `${base}/contact/error`);

  if (field('website') !== '') {
    console.log('[survey] honeypot hit, dropped');
    return ok({ ref });
  }
  const ts = Number(field('ts'));
  if (event === 'submit' && ts > 0 && Date.now() - ts < MIN_SECONDS * 1000) {
    console.log('[survey] submitted too fast, dropped');
    return ok({ ref });
  }
  const rlKey = `rl:s:${ip}`;
  if (await rateLimited(env, rlKey, RATE_LIMIT)) return fail(429, msg(locale, 'error.rate'));

  const raw = Object.fromEntries((Object.keys(fields) as Field[]).map((f) => [f, field(f)])) as Record<Field, string>;
  raw.eik = raw.eik.replace(/\s/g, '');

  // Частично известие след стъпка: само валидните стойности, без лични данни.
  if (event === 'step') {
    const clean: Partial<Record<Field, string>> = {};
    for (const f of Object.keys(fields) as Field[]) {
      if (!STEP_SAFE.includes(f) || !raw[f]) continue;
      if (fields[f].safeParse(raw[f]).success) clean[f] = raw[f];
    }
    const text = [
      `🇪🇺 Проверка за ЕС финансиране · стъпка ${step} от 5 · ${ref} (${locale})`,
      '',
      ...rowsOf(clean).map((r) => `${r.label}: ${r.value}`),
    ].join('\n');
    await rateCount(env, rlKey, RATE_WINDOW);
    if (mock) {
      console.log('[survey] MOCK step:\n' + text);
      return ok({ ref, mock: text });
    }
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      try {
        await sendTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, text);
      } catch (err) {
        console.error('[survey] telegram failed:', safeError(err));
      }
    }
    return ok({ ref });
  }

  if (!mock) {
    if (!env.TURNSTILE_SECRET) {
      console.error('[survey] TURNSTILE_SECRET missing');
      return fail(500, msg(locale, 'error.generic'));
    }
    const token = field('cf-turnstile-response');
    if (!token || !(await verifyTurnstile(env.TURNSTILE_SECRET, token, ip))) {
      return fail(400, msg(locale, 'error.turnstile'), { turnstile: msg(locale, 'error.turnstile') });
    }
  }

  const parsed = full.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const f = String(issue.path[0] ?? '');
      if (f && !errors[f]) errors[f] = fieldMsg(locale, f);
    }
    return fail(422, msg(locale, 'error.check'), errors);
  }
  const d = parsed.data;
  await rateCount(env, rlKey, RATE_WINDOW);

  const all = d as unknown as Record<Field, string>;
  const notify = surveyNotification({ ref, rows: rowsOf(all), company: oneLine(d.company), locale, description: d.description });
  const reply = surveyAutoreply({ ref, name: oneLine(d.name), company: oneLine(d.company), locale });
  // Само известие без лични данни; цялата проверка е в пощата.
  const telegram = [`✅ Лист с чакащи (ЕС) · ${ref} (${locale})`, 'Детайлите са в пощата.'].join('\n');

  if (mock) {
    console.log('[survey] MOCK - would send:\n' + notify.text + '\n---\n' + reply.text + '\n---\n' + telegram);
    return ok({ ref });
  }
  if (!env.RESEND_API_KEY) {
    console.error('[survey] RESEND_API_KEY missing');
    return fail(500, msg(locale, 'error.generic'));
  }
  try {
    await sendResend(env.RESEND_API_KEY, { ...notify, to: env.NOTIFY_TO?.trim() || company.email, replyTo: d.email });
  } catch (err) {
    console.error('[survey] resend notify failed:', safeError(err));
    return fail(502, msg(locale, 'error.generic'));
  }
  try {
    await sendResend(env.RESEND_API_KEY, { ...reply, to: d.email, replyTo: company.contactEmail });
  } catch (err) {
    console.error('[survey] resend autoreply failed:', safeError(err));
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    try {
      await sendTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, telegram);
    } catch (err) {
      console.error('[survey] telegram failed:', safeError(err));
    }
  }
  return ok({ ref });
};

export const onRequest: PagesFunction<Env> = async () => new Response(null, { status: 405, headers: { allow: 'POST' } });

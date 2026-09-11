/// <reference types="@cloudflare/workers-types" />
import { z } from 'zod';
import { company } from '../../src/data/company';
import { type Locale } from '../../src/i18n/ui';
import {
  type Env,
  type UiKey,
  isLocale,
  oneLine,
  rateCount,
  rateLimited,
  respond,
  safeError,
  sameOrigin,
  sendResend,
  sendTelegram,
  t,
  verifyTurnstile,
} from '../lib';

// POST /api/survey - стъпковата анкета за допустимост на лендингите по процедури
// (src/components/EligibilitySurvey.astro, docs/11). Три вида заявки от една и съща форма:
//   event=step   - потребителят завърши стъпка N (JS, след „Напред“): частичните отговори
//                  отиват в Telegram, за да се вижда докъде стигат хората и къде спират;
//   event=stop   - отговори „не“ на първия въпрос (фирмата е регистрирана след срока);
//   event=submit - цялата анкета: Turnstile → Zod → имейл до нас + автоотговор + Telegram.
// Ред на защитите: произход → размер → honeypot → timing (само submit) → rate limit (KV) →
// Turnstile (само submit) → Zod. С INQUIRY_MOCK=1 нищо не се изпраща - логва се.
// Лични данни (име, имейл, телефон) са в последната стъпка и тръгват само при submit -
// частичните известия носят само данни за фирмата (content/bg/privacy.md).

const STAFF = ['lt10', '10-50', '50-250', 'gt250'] as const;
const REVENUE = ['lt100k', '100k-150k', '150k-400k', 'gt400k'] as const;
const TOTAL = 5;
const RATE_LIMIT = 40; // на час, на IP - до 5 стъпки + повторения на една анкета
const RATE_WINDOW = 60 * 60;
const MIN_SECONDS = 3;
const MAX_BODY = 32 * 1024;

const fields = {
  registered: z.enum(['yes', 'no']),
  staff: z.enum(STAFF),
  revenue: z.enum(REVENUE),
  company: z.string().trim().min(2).max(120),
  // ЕИК/БУЛСТАТ: 9 или 13 цифри.
  eik: z.string().trim().regex(/^\d{9}(\d{4})?$/),
  city: z.string().trim().min(2).max(80),
  activity: z.string().trim().min(3).max(200),
  description: z.string().trim().min(10).max(1000),
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()./-]{5,40}$/),
  consent: z.literal('on'),
};
type Field = keyof typeof fields;
type Survey = { [K in Field]: z.infer<(typeof fields)[K]> };

// Полетата по стъпки - редът в известията и коя стъпка да се отвори при грешка.
const STEP_FIELDS: readonly (readonly Field[])[] = [
  ['registered'],
  ['staff', 'revenue'],
  ['company', 'eik', 'city'],
  ['activity', 'description'],
  ['name', 'email', 'phone', 'consent'],
];

const full = z.object(fields);
const meta = z.object({
  event: z.enum(['step', 'stop', 'submit']).default('submit'),
  step: z.coerce.number().int().min(1).max(TOTAL).default(TOTAL),
  // Генерира се от скрипта при първата стъпка; свързва известията от една и съща анкета.
  session: z.string().trim().regex(/^[a-z0-9-]{6,40}$/i).optional().or(z.literal('')),
  campaign: z.string().trim().regex(/^[a-z0-9-]{1,80}$/),
});

// Грешка по поле → UI низ (src/i18n/ui.ts).
const ERROR_KEY: Record<Field, UiKey> = {
  registered: 'survey.error.registered',
  staff: 'survey.error.staff',
  revenue: 'survey.error.revenue',
  company: 'survey.error.company',
  eik: 'survey.error.eik',
  city: 'survey.error.city',
  activity: 'survey.error.activity',
  description: 'survey.error.description',
  name: 'error.name',
  email: 'error.email',
  phone: 'survey.error.phone',
  consent: 'error.consent',
};

// Етикет на полето в известието (име и имейл ползват низовете на общата форма).
const LABEL_KEY: Record<Field, UiKey> = {
  registered: 'survey.notify.registered',
  staff: 'survey.staff',
  revenue: 'survey.revenue',
  company: 'survey.company',
  eik: 'survey.eik',
  city: 'survey.city',
  activity: 'survey.activity',
  description: 'survey.description',
  name: 'form.name',
  email: 'form.email',
  phone: 'survey.phone',
  consent: 'form.consent',
};

// Стойност за известието: етикетите на списъците вместо кодовете им; „да/не“ за регистрацията.
function display(field: Field, value: string): string {
  if (field === 'registered') return t('bg', value === 'yes' ? 'survey.yes' : 'survey.no');
  if (field === 'staff' || field === 'revenue') return t('bg', `survey.${field}.${value}` as UiKey);
  return value;
}

function notificationText(
  locale: Locale,
  d: Partial<Survey>,
  head: { campaign: string; session: string; status: string },
  ip: string,
): string {
  const lines = [
    `${t('bg', 'survey.notify.title')} · ${head.campaign} · ${head.status}${head.session ? ` · #${head.session.slice(0, 6)}` : ''}`,
    '',
  ];
  for (const step of STEP_FIELDS) {
    for (const f of step) {
      const v = d[f];
      if (f === 'consent' || v === undefined || v === '') continue;
      const label = t('bg', LABEL_KEY[f]);
      lines.push(`${label}: ${display(f, String(v))}`);
    }
  }
  lines.push('', `— ${locale} · ${ip}`);
  return lines.join('\n');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  const length = Number(request.headers.get('content-length') ?? '0');
  if (length > MAX_BODY) return new Response(null, { status: 413 });
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return new Response(null, { status: 400 });
  }
  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === 'string' ? v : '';
  };
  const locale: Locale = isLocale(field('locale')) ? (field('locale') as Locale) : 'bg';
  const mock = env.INQUIRY_MOCK === '1';
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const base = locale === 'bg' ? '' : `/${locale}`;
  const sentUrl = `${base}/f/sent`;
  const ineligibleUrl = `${base}/f/not-eligible`;
  const errorUrl = `${base}/contact/error`;
  const ok = (extra: Record<string, unknown> = {}, redirectTo = sentUrl) => respond(wantsJson, 200, { ok: true, ...extra }, redirectTo);
  const fail = (status: number, key: UiKey, errors?: Record<string, string>) =>
    respond(wantsJson, status, { ok: false, message: t(locale, key), errors }, errorUrl);

  const m = meta.safeParse({ event: field('event') || undefined, step: field('step') || undefined, session: field('session'), campaign: field('campaign') });
  if (!m.success) return new Response(null, { status: 400 });
  const { event, step, campaign } = m.data;
  const session = m.data.session ?? '';

  // Honeypot - ботовете го попълват; отговаряме „успех“, без да изпращаме.
  if (field('website') !== '') {
    console.log('[survey] honeypot hit, dropped');
    return ok();
  }
  // Timing - само за цялата анкета (стъпките идват по-късно от зареждането по дефиниция).
  const ts = Number(field('ts'));
  if (event === 'submit' && ts > 0 && Date.now() - ts < MIN_SECONDS * 1000) {
    console.log('[survey] submitted too fast, dropped');
    return ok();
  }
  const rlKey = `rl:s:${ip}`;
  if (await rateLimited(env, rlKey, RATE_LIMIT)) return fail(429, 'error.rate');

  const raw = Object.fromEntries((Object.keys(fields) as Field[]).map((f) => [f, field(f)]));

  // Частично известие: стъпка или спиране. Само валидните стойности минават (без Zod грешки към
  // клиента - никой не чака отговор); невалидното просто не се показва.
  if (event !== 'submit') {
    const clean: Partial<Survey> = {};
    for (const f of Object.keys(fields) as Field[]) {
      // Личните данни (последната стъпка) никога не тръгват с частично известие - privacy.md.
      if (STEP_FIELDS[TOTAL - 1].includes(f)) continue;
      const r = fields[f].safeParse(raw[f]);
      if (r.success) (clean as Record<string, unknown>)[f] = r.data;
    }
    const status =
      event === 'stop'
        ? `${t('bg', 'survey.notify.stopped', { n: String(step) })} · ${t('bg', 'survey.notify.ineligible')}`
        : t('bg', 'survey.notify.step', { n: String(step), total: String(TOTAL) });
    const text = notificationText(locale, clean, { campaign, session, status }, ip);
    await rateCount(env, rlKey, RATE_WINDOW);
    if (mock) {
      console.log('[survey] MOCK — would send:\n' + text);
      return ok({ mock: text });
    }
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      try {
        await sendTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, text);
      } catch (err) {
        console.error('[survey] telegram failed:', safeError(err));
      }
    }
    return ok();
  }

  // Цялата анкета.
  if (!mock) {
    if (!env.TURNSTILE_SECRET) {
      console.error('[survey] TURNSTILE_SECRET missing');
      return fail(500, 'error.generic');
    }
    const token = field('cf-turnstile-response');
    if (!token || !(await verifyTurnstile(env.TURNSTILE_SECRET, token, ip))) {
      return fail(400, 'error.turnstile', { turnstile: t(locale, 'error.turnstile') });
    }
  }

  // „Не“ на първия въпрос (без JS формата стига дотук цяла): известие и страница „не е подходяща“.
  if (raw.registered === 'no') {
    const status = `${t('bg', 'survey.notify.stopped', { n: '1' })} · ${t('bg', 'survey.notify.ineligible')}`;
    const text = notificationText(locale, { registered: 'no' }, { campaign, session, status }, ip);
    await rateCount(env, rlKey, RATE_WINDOW);
    if (mock) {
      console.log('[survey] MOCK — would send:\n' + text);
      return ok({ ineligible: true, mock: text }, ineligibleUrl);
    }
    if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
      try {
        await sendTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, text);
      } catch (err) {
        console.error('[survey] telegram failed:', safeError(err));
      }
    }
    return ok({ ineligible: true }, ineligibleUrl);
  }

  const parsed = full.safeParse(raw);
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const f = String(issue.path[0] ?? '') as Field;
      if (f && !errors[f]) errors[f] = t(locale, ERROR_KEY[f] ?? 'error.generic');
    }
    return fail(422, 'error.generic', errors);
  }
  const data = parsed.data;
  await rateCount(env, rlKey, RATE_WINDOW);

  const status = t('bg', 'survey.notify.done');
  const notify = notificationText(locale, data, { campaign, session, status }, ip);
  if (mock) {
    console.log('[survey] MOCK — would send:\n' + notify);
    return ok({ mock: notify });
  }
  if (!env.RESEND_API_KEY) {
    console.error('[survey] RESEND_API_KEY missing');
    return fail(500, 'error.generic');
  }
  try {
    await sendResend(env.RESEND_API_KEY, {
      to: env.NOTIFY_TO?.trim() || company.email,
      subject: t('bg', 'mail.survey.subject', { name: oneLine(data.name), campaign }),
      text: notify,
      replyTo: data.email,
    });
    await sendResend(env.RESEND_API_KEY, {
      to: data.email,
      subject: t(locale, 'mail.survey.autoreply.subject'),
      text: t(locale, 'mail.survey.autoreply.body', { email: data.email, phone: data.phone }),
    });
  } catch (err) {
    console.error('[survey] resend failed:', safeError(err));
    return fail(502, 'error.generic');
  }
  // Telegram получава цялата анкета (както запитването; docs/09). Известие, не условие.
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    try {
      await sendTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, notify);
    } catch (err) {
      console.error('[survey] telegram failed:', safeError(err));
    }
  }
  return ok();
};

export const onRequest: PagesFunction<Env> = async ({ request }) =>
  request.method === 'POST'
    ? new Response(null, { status: 405 })
    : new Response(null, { status: 405, headers: { allow: 'POST' } });

// За тестове и за компонента: същите списъци с опции.
export { STAFF, REVENUE, TOTAL };
export type { Survey };

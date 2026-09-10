/// <reference types="@cloudflare/workers-types" />
import { z } from 'zod';
import { company } from '../../src/data/company';
import { ui, type Locale } from '../../src/i18n/ui';

// POST /api/inquiry — Cloudflare Pages Function. Ред (CLAUDE.md §Стек):
// honeypot → timing → rate limit (KV) → Turnstile siteverify → Zod → Resend (известие +
// автоотговор) → Telegram → отговор. С INQUIRY_MOCK=1 нищо не се изпраща — payload-ът се
// логва. Работи и без JS: form POST → 303 към /contact/sent или /contact/error.

interface Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  // Къде отива известието за запитване; по подразбиране company.email (hello@).
  NOTIFY_TO?: string;
  INQUIRY_RL?: KVNamespace;
  INQUIRY_MOCK?: string;
}

const TYPES = ['erp', 'eu', 'shop', 'app', 'other'] as const;
const RATE_LIMIT = 5; // на час, на IP
const RATE_WINDOW = 60 * 60;
const MIN_SECONDS = 3;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  company: optionalText(120),
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()./-]{5,40}$/)
    .optional()
    .or(z.literal('')),
  // Кратката форма няма поле type → 'other'; пълната го праща и празно е грешка (проверява се
  // отделно по-долу, защото Zod не различава „липсва“ от „празно“ след трансформация).
  type: z.enum(TYPES).default('other'),
  message: z.string().trim().min(10).max(2000),
  consent: z.literal('on'),
});

type Inquiry = z.infer<typeof schema>;

const isLocale = (v: unknown): v is Locale => v === 'bg' || v === 'en';

function t(locale: Locale, key: keyof (typeof ui)['bg'], vars: Record<string, string> = {}) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), ui[locale][key]);
}

function respond(
  wantsJson: boolean,
  status: number,
  body: { ok: boolean; message?: string; errors?: Record<string, string> },
  redirectTo: string,
) {
  if (wantsJson) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return new Response(null, { status: 303, headers: { location: redirectTo } });
}

async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

async function sendResend(apiKey: string, mail: { to: string; subject: string; text: string; replyTo?: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${company.brand} <${company.email}>`,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      ...(mail.replyTo ? { reply_to: mail.replyTo } : {}),
    }),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

async function sendTelegram(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}: ${await res.text()}`);
}

function notificationText(locale: Locale, d: Inquiry, ip: string): string {
  const typeLabel = t(locale, `form.type.${d.type}` as keyof (typeof ui)['bg']);
  return [
    `${t('bg', 'form.name')}: ${d.name}`,
    d.company ? `${t('bg', 'form.company')}: ${d.company}` : null,
    `${t('bg', 'form.email')}: ${d.email}`,
    d.phone ? `${t('bg', 'form.phone')}: ${d.phone}` : null,
    `${t('bg', 'form.type')}: ${typeLabel}`,
    '',
    d.message,
    '',
    `— ${locale} · ${ip}`,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const wantsJson = (request.headers.get('accept') ?? '').includes('application/json');
  const form = await request.formData();
  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === 'string' ? v : '';
  };
  const locale: Locale = isLocale(field('locale')) ? (field('locale') as Locale) : 'bg';
  const mock = env.INQUIRY_MOCK === '1';
  const ip = request.headers.get('cf-connecting-ip') ?? '0.0.0.0';
  const base = locale === 'bg' ? '' : `/${locale}`;
  const sentUrl = `${base}/contact/sent`;
  const errorUrl = `${base}/contact/error`;
  const ok = () => respond(wantsJson, 200, { ok: true }, sentUrl);
  const fail = (status: number, key: keyof (typeof ui)['bg'], errors?: Record<string, string>) =>
    respond(wantsJson, status, { ok: false, message: t(locale, key), errors }, errorUrl);

  // 2. Timing — полето ts се попълва от скрипта при зареждане; под 3 s е бот.
  const ts = Number(field('ts'));
  const hasJs = ts > 0;
  if (hasJs && Date.now() - ts < MIN_SECONDS * 1000) {
    console.log('[inquiry] submitted too fast, dropped');
    return ok();
  }

  // 1. Honeypot — ботовете го попълват; отговаряме „успех“, без да изпращаме. При
  // работещ скрипт (има ts) попълнено поле е по-скоро autofill на браузъра — игнорира се.
  if (field('website') !== '') {
    if (!hasJs) {
      console.log('[inquiry] honeypot hit, dropped');
      return ok();
    }
    console.log('[inquiry] honeypot filled with JS present — treated as autofill');
  }

  // 3. Rate limit — 5 на час на IP, през KV. Чете се тук, брои се едва след валидна
  // заявка, за да не заключи човек с пет правописни грешки. Без binding се прескача.
  const rlKey = `rl:${ip}`;
  if (env.INQUIRY_RL) {
    const count = Number((await env.INQUIRY_RL.get(rlKey)) ?? '0');
    if (count >= RATE_LIMIT) return fail(429, 'error.rate');
  }

  // 4. Turnstile
  if (!mock) {
    if (!env.TURNSTILE_SECRET) {
      console.error('[inquiry] TURNSTILE_SECRET missing');
      return fail(500, 'error.generic');
    }
    const token = field('cf-turnstile-response');
    if (!token || !(await verifyTurnstile(env.TURNSTILE_SECRET, token, ip))) {
      return fail(400, 'error.turnstile', { turnstile: t(locale, 'error.turnstile') });
    }
  }

  // 5. Zod — грешките са по поле, за да стигнат до aria-describedby.
  const parsed = schema.safeParse({
    name: field('name'),
    company: field('company'),
    email: field('email'),
    phone: field('phone'),
    type: field('type') || undefined,
    message: field('message'),
    consent: field('consent'),
  });
  const errors: Record<string, string> = {};
  if (form.has('type') && field('type') === '') errors.type = t(locale, 'error.type');
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const f = String(issue.path[0] ?? '');
      const key = `error.${f}` as keyof (typeof ui)['bg'];
      if (f && !errors[f]) errors[f] = ui[locale][key] ?? t(locale, 'error.generic');
    }
  }
  if (!parsed.success || Object.keys(errors).length > 0) return fail(422, 'error.generic', errors);
  const data = parsed.data;

  if (env.INQUIRY_RL) {
    const count = Number((await env.INQUIRY_RL.get(rlKey)) ?? '0');
    await env.INQUIRY_RL.put(rlKey, String(count + 1), { expirationTtl: RATE_WINDOW });
  }

  // 6-7. Resend (известие + автоотговор) и Telegram
  const notify = notificationText(locale, data, ip);
  if (mock) {
    console.log('[inquiry] MOCK — would send:\n' + notify);
    return ok();
  }
  if (!env.RESEND_API_KEY) {
    console.error('[inquiry] RESEND_API_KEY missing');
    return fail(500, 'error.generic');
  }
  try {
    await sendResend(env.RESEND_API_KEY, {
      to: env.NOTIFY_TO?.trim() || company.email,
      subject: t('bg', 'mail.notify.subject', { name: data.name }),
      text: notify,
      replyTo: data.email,
    });
    await sendResend(env.RESEND_API_KEY, {
      to: data.email,
      subject: t(locale, 'mail.autoreply.subject'),
      text: t(locale, 'mail.autoreply.body', { email: data.email, phone: company.phone }),
    });
  } catch (err) {
    console.error('[inquiry] resend failed', err);
    return fail(502, 'error.generic');
  }
  // Telegram получава цялото запитване (решение на Марти, 10.09.2026; описано в privacy.md).
  // Известие, не условие: ако падне, запитването вече е в пощата.
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    try {
      await sendTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, notify);
    } catch (err) {
      console.error('[inquiry] telegram failed', err);
    }
  }
  return ok();
};

export const onRequest: PagesFunction<Env> = async ({ request }) =>
  request.method === 'POST'
    ? new Response(null, { status: 405 })
    : new Response(null, { status: 405, headers: { allow: 'POST' } });

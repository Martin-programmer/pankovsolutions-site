/// <reference types="@cloudflare/workers-types" />
import { company } from '../src/data/company';
import { ui, type Locale } from '../src/i18n/ui';

// Общото между двата endpoint-а (functions/api/inquiry.ts - формата за запитване;
// functions/api/survey.ts - анкетата за допустимост на лендингите): env, отговори, защити,
// изпращане през Resend и Telegram. Логиката на всяка форма е в нейния файл.

export interface Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  // Къде отива известието; по подразбиране company.email (hello@).
  NOTIFY_TO?: string;
  INQUIRY_RL?: KVNamespace;
  INQUIRY_MOCK?: string;
}

export type UiKey = keyof (typeof ui)['bg'];

export const isLocale = (v: unknown): v is Locale => v === 'bg' || v === 'en';

export function t(locale: Locale, key: UiKey, vars: Record<string, string> = {}) {
  return Object.entries(vars).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, v), ui[locale][key]);
}

// JSON за fetch (accept: application/json), иначе 303 към страница - формите работят и без JS.
export function respond(
  wantsJson: boolean,
  status: number,
  body: { ok: boolean; message?: string; errors?: Record<string, string>; [k: string]: unknown },
  redirectTo: string,
) {
  if (wantsJson) {
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
    });
  }
  return new Response(null, { status: 303, headers: { location: redirectTo, 'cache-control': 'no-store' } });
}

// Само нашият произход може да праща формата (защита от cross-site POST). Origin липсва при
// някои не-браузърни клиенти - тогава се гледа Sec-Fetch-Site; без нито едно - пропуска се.
export function sameOrigin(request: Request): boolean {
  const own = new URL(request.url).origin;
  const origin = request.headers.get('origin');
  if (origin) return origin === own;
  const site = request.headers.get('sec-fetch-site');
  return !site || site === 'same-origin' || site === 'none';
}

// Лог без лични данни и без секрети: само класът на грешката и статусът.
export function safeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  return msg.replace(/bot\d+:[A-Za-z0-9_-]+/g, 'bot[token]').split('\n')[0].slice(0, 120);
}

// Един ред, без CR/LF - за теми на имейли и етикети.
export const oneLine = (s: string) => s.replace(/[\r\n\t]+/g, ' ').trim();

export async function verifyTurnstile(secret: string, token: string, ip: string): Promise<boolean> {
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ secret, response: token, remoteip: ip }),
  });
  const data = (await res.json()) as { success?: boolean };
  return data.success === true;
}

export async function sendResend(apiKey: string, mail: { to: string; subject: string; text: string; replyTo?: string }) {
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
  // Тялото на грешката може да съдържа адреса на получателя - в лога отива само статусът.
  if (!res.ok) throw new Error(`Resend ${res.status}`);
}

export async function sendTelegram(token: string, chatId: string, text: string) {
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
  if (!res.ok) throw new Error(`Telegram ${res.status}`);
}

// Rate limit през KV: чете се преди работа, брои се след валидна заявка. Без binding се прескача.
export async function rateLimited(env: Env, key: string, limit: number): Promise<boolean> {
  if (!env.INQUIRY_RL) return false;
  return Number((await env.INQUIRY_RL.get(key)) ?? '0') >= limit;
}

export async function rateCount(env: Env, key: string, windowSeconds: number): Promise<void> {
  if (!env.INQUIRY_RL) return;
  const count = Number((await env.INQUIRY_RL.get(key)) ?? '0');
  await env.INQUIRY_RL.put(key, String(count + 1), { expirationTtl: windowSeconds });
}

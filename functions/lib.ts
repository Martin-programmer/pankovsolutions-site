/// <reference types="@cloudflare/workers-types" />
import { company } from '../src/data/company';
import type { Mail } from './email';

// Общото между endpoint-ите (functions/api/inquiry.ts - формата за запитване;
// functions/api/survey.ts - проверката за ЕС финансиране; functions/api/consent.ts - записът
// на съгласията за бисквитки): env, отговори, защити, изпращане през Resend и Telegram.

export interface Env {
  RESEND_API_KEY?: string;
  TURNSTILE_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_CHAT_ID?: string;
  // Къде отива известието; по подразбиране company.email (hello@).
  NOTIFY_TO?: string;
  INQUIRY_RL?: KVNamespace;
  // Доказателства за съгласие за бисквитки (KV namespace „consent-log“). По избор.
  CONSENT_LOG?: KVNamespace;
  INQUIRY_MOCK?: string;
  // Odoo CRM (support.pankovsolutions.com): всяко запитване става възможност в CRM-а. По избор.
  ODOO_URL?: string;
  ODOO_DB?: string;
  ODOO_UID?: string;
  ODOO_API_KEY?: string;
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

export async function sendResend(apiKey: string, mail: Mail & { to: string; replyTo?: string }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: `${company.brand} <${company.email}>`,
      to: [mail.to],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
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

// ---- Odoo CRM ------------------------------------------------------------------------------
// Външното JSON-RPC на Odoo (/jsonrpc → object.execute_kw) с API ключ на отделен потребител,
// който има права само за CRM. Ако нещо липсва или Odoo не отговори, запитването пак е в пощата.
async function odoo(env: Env, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}) {
  const res = await fetch(`${env.ODOO_URL!.replace(/\/$/, '')}/jsonrpc`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'call',
      params: { service: 'object', method: 'execute_kw', args: [env.ODOO_DB, Number(env.ODOO_UID), env.ODOO_API_KEY, model, method, args, kwargs] },
    }),
  });
  const body = (await res.json()) as { result?: unknown; error?: { data?: { message?: string } } };
  if (!res.ok || body.error) throw new Error(`Odoo ${model}.${method}: ${body.error?.data?.message ?? res.status}`);
  return body.result;
}

export const odooEnabled = (env: Env) => Boolean(env.ODOO_URL && env.ODOO_DB && env.ODOO_UID && env.ODOO_API_KEY);

const SOURCE_NAMES: Record<string, string> = {
  'google-ads': 'Google Ads',
  meta: 'Meta',
  organic: 'Сайт (органично)',
};

export async function createOdooLead(
  env: Env,
  d: { name: string; company: string; email: string; phone: string; message: string; serviceTag?: string; serviceName?: string; locale: string; src: string; campaign: string; landing: string; page: string },
) {
  const esc = (t: string) => t.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
  const src = SOURCE_NAMES[d.src] ?? '';
  const ids = async (model: string, name: string) => (name ? ((await odoo(env, model, 'search', [[['name', '=', name]]], { limit: 1 })) as number[]) : []);
  const [tag] = d.serviceTag ? await ids('crm.tag', d.serviceTag) : [];
  const [source] = await ids('utm.source', src);
  const info = [
    ['Услуга', d.serviceName ?? '—'],
    ['Източник', src || d.src || '—'],
    ['Кампания', d.campaign || '—'],
    ['Първа страница', d.landing || '—'],
    ['Изпратено от', d.page || '—'],
    ['Език', d.locale],
  ];
  const description =
    `<p>${esc(d.message).replace(/\n/g, '<br>')}</p><hr><p>` + info.map(([k, v]) => `<b>${k}:</b> ${esc(v)}`).join('<br>') + '</p>';
  const title = [d.serviceName, d.company || d.name].filter(Boolean).join(' – ');
  return odoo(env, 'crm.lead', 'create', [
    {
      type: 'opportunity',
      name: title || 'Запитване от сайта',
      contact_name: d.name,
      partner_name: d.company || false,
      email_from: d.email,
      phone: d.phone,
      description,
      tag_ids: tag ? [[6, 0, [tag]]] : false,
      source_id: source ?? false,
    },
  ]);
}

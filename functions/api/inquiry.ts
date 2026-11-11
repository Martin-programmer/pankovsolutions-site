/// <reference types="@cloudflare/workers-types" />
import { z } from 'zod';
import { company } from '../../src/data/company';
import { inquiryAutoreply, inquiryNotification } from '../email';
import { fieldMsg, isLocale, msg, SERVICES, type Locale } from '../messages';
import { type Env, oneLine, respond, safeError, sameOrigin, sendResend, sendTelegram, verifyTurnstile } from '../lib';

// POST /api/inquiry - формата за запитване (начална страница и /contact).
// Ред: произход → размер → timing (< 3 s) → honeypot → rate limit (KV, 5/час/IP) →
// Turnstile → Zod → Resend (известие до нас + автоотговор, HTML) → Telegram → отговор.
// С INQUIRY_MOCK=1 нищо не се изпраща - съдържанието се логва.
// Без JS: обикновен POST → 303 към /contact/sent или /contact/error.

const RATE_LIMIT = 5;
const RATE_WINDOW = 60 * 60;
const MIN_SECONDS = 3;
const MAX_BODY = 32 * 1024;

const optionalText = (max: number) => z.string().trim().max(max).optional().or(z.literal(''));

const schema = z.object({
  name: z.string().trim().min(2).max(80),
  company: optionalText(120),
  service: z
    .string()
    .trim()
    .refine((v) => v === '' || v in SERVICES)
    .optional(),
  email: z.string().trim().email().max(200),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s()./-]{6,40}$/),
  message: z.string().trim().min(10).max(3000),
});

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
  const base = locale === 'bg' ? '' : '/en';
  const ok = () => respond(wantsJson, 200, { ok: true }, `${base}/contact/sent`);
  const fail = (status: number, message: string, errors?: Record<string, string>) =>
    respond(wantsJson, status, { ok: false, message, errors }, `${base}/contact/error`);

  // Timing: ts се попълва от скрипта при зареждане; под 3 s е бот.
  const ts = Number(field('ts'));
  const hasJs = ts > 0;
  if (hasJs && Date.now() - ts < MIN_SECONDS * 1000) {
    console.log('[inquiry] submitted too fast, dropped');
    return ok();
  }
  // Honeypot: без JS попълнено поле = бот. С JS по-скоро е autofill - пропуска се.
  if (field('website') !== '' && !hasJs) {
    console.log('[inquiry] honeypot hit, dropped');
    return ok();
  }

  const rlKey = `rl:${ip}`;
  if (env.INQUIRY_RL && Number((await env.INQUIRY_RL.get(rlKey)) ?? '0') >= RATE_LIMIT) {
    return fail(429, msg(locale, 'error.rate'));
  }

  if (!mock) {
    if (!env.TURNSTILE_SECRET) {
      console.error('[inquiry] TURNSTILE_SECRET missing');
      return fail(500, msg(locale, 'error.generic'));
    }
    const token = field('cf-turnstile-response');
    if (!token || !(await verifyTurnstile(env.TURNSTILE_SECRET, token, ip))) {
      return fail(400, msg(locale, 'error.turnstile'), { turnstile: msg(locale, 'error.turnstile') });
    }
  }

  const parsed = schema.safeParse({
    name: field('name'),
    company: field('company'),
    service: field('service'),
    email: field('email'),
    phone: field('phone'),
    message: field('message'),
  });
  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const f = String(issue.path[0] ?? '');
      if (f && !errors[f]) errors[f] = fieldMsg(locale, f);
    }
    return fail(422, msg(locale, 'error.check'), errors);
  }
  const d = parsed.data;

  if (env.INQUIRY_RL) {
    const count = Number((await env.INQUIRY_RL.get(rlKey)) ?? '0');
    await env.INQUIRY_RL.put(rlKey, String(count + 1), { expirationTtl: RATE_WINDOW });
  }

  const service = d.service ? SERVICES[d.service] : undefined;
  const notify = inquiryNotification({
    name: oneLine(d.name),
    company: d.company ? oneLine(d.company) : '',
    email: d.email,
    phone: d.phone,
    service: service?.bg,
    message: d.message,
    locale,
  });
  const reply = inquiryAutoreply({ name: oneLine(d.name), message: d.message, service: service?.[locale], locale });
  // Telegram е извън ЕС, затова там отива само известие без лични данни; самото запитване е в пощата.
  const telegram = [`📩 Ново запитване (${locale})`, service ? `Услуга: ${service.bg}` : null, 'Детайлите са в пощата.']
    .filter((l) => l !== null)
    .join('\n');

  if (mock) {
    console.log('[inquiry] MOCK - would send:\n' + notify.text + '\n---\n' + reply.text + '\n---\n' + telegram);
    return ok();
  }
  if (!env.RESEND_API_KEY) {
    console.error('[inquiry] RESEND_API_KEY missing');
    return fail(500, msg(locale, 'error.generic'));
  }
  try {
    await sendResend(env.RESEND_API_KEY, { ...notify, to: env.NOTIFY_TO?.trim() || company.email, replyTo: d.email });
  } catch (err) {
    console.error('[inquiry] resend notify failed:', safeError(err));
    return fail(502, msg(locale, 'error.generic'));
  }
  // Автоотговорът и Telegram са известия: ако паднат, запитването вече е в пощата ни.
  try {
    await sendResend(env.RESEND_API_KEY, { ...reply, to: d.email, replyTo: company.contactEmail });
  } catch (err) {
    console.error('[inquiry] resend autoreply failed:', safeError(err));
  }
  if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
    try {
      await sendTelegram(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, telegram);
    } catch (err) {
      console.error('[inquiry] telegram failed:', safeError(err));
    }
  }
  return ok();
};

export const onRequest: PagesFunction<Env> = async () => new Response(null, { status: 405, headers: { allow: 'POST' } });

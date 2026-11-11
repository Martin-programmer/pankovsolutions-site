/// <reference types="@cloudflare/workers-types" />
import { z } from 'zod';
import { type Env, sameOrigin } from '../lib';

// POST /api/consent - доказателство за съгласието за бисквитки (чл. 7, ал. 1 GDPR: трябва да
// можем да докажем, че посетителят е дал съгласие). public/consent.js праща запис при всеки
// избор: случаен ID (същият като в бисквитката ps_consent), време, версия на политиката,
// категориите и как е избрано. IP адресът не се пази - записът не идентифицира човека, освен
// ако той сам не ни даде ID-то от бисквитката си.
// Записите отиват в KV namespace CONSENT_LOG (ако е свързан), иначе само в лога на Worker-а.

const schema = z.object({
  id: z.string().regex(/^[0-9a-f-]{8,40}$/i),
  ts: z.string().max(40),
  version: z.string().max(20),
  analytics: z.boolean(),
  marketing: z.boolean(),
  method: z.enum(['accept_all', 'reject_all', 'custom', 'withdraw']),
  page: z.string().max(200),
});

// Пази се 3 години след последния избор (давност за административни нарушения + запас).
const TTL = 3 * 365 * 24 * 60 * 60;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return new Response(null, { status: 403 });
  if (Number(request.headers.get('content-length') ?? '0') > 2048) return new Response(null, { status: 413 });
  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return new Response(null, { status: 422 });
  const record = { ...parsed.data, received: new Date().toISOString(), ua: (request.headers.get('user-agent') ?? '').slice(0, 200) };
  if (env.CONSENT_LOG) {
    await env.CONSENT_LOG.put(`consent:${record.id}:${record.received}`, JSON.stringify(record), { expirationTtl: TTL });
  } else {
    console.log('[consent]', JSON.stringify(record));
  }
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
};

export const onRequest: PagesFunction<Env> = async () => new Response(null, { status: 405, headers: { allow: 'POST' } });

/// <reference types="@cloudflare/workers-types" />
// Студио за реклами и постове (/studio): закрито с парола, вика Kie.ai (изображения, видео,
// текстове) със ключа на Марти, който стои само като Secret KIE_API_KEY в Cloudflare.
// Маршрути под /api/studio/*:
//   POST login · POST logout · GET me · GET credit · POST write · POST generate · GET task
//   POST upload · GET img (прокси за картинките, за да може canvas да ги изнесе) · GET/POST history
import { safeError } from '../lib';

export interface StudioEnv {
  ASSETS: Fetcher;
  KIE_API_KEY?: string;
  STUDIO_PASSWORD?: string;
  STUDIO_KV?: KVNamespace;
  INQUIRY_RL?: KVNamespace;
}

const KIE = 'https://api.kie.ai';
const COOKIE = 'ps_studio';
const SESSION_DAYS = 30;
const enc = new TextEncoder();

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

// ---- Сесия: бисквитка "<изтича>.<hmac>" с ключ, извлечен от паролата. Смяна на паролата = изход навсякъде.
async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode('ps-studio:' + secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return btoa(String.fromCharCode(...new Uint8Array(sig))).replace(/[+/=]/g, (c) => ({ '+': '-', '/': '_', '=': '' })[c]!);
}
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
};
async function authed(request: Request, env: StudioEnv) {
  if (!env.STUDIO_PASSWORD) return false;
  const raw = (request.headers.get('cookie') ?? '').split(/;\s*/).find((c) => c.startsWith(COOKIE + '='))?.slice(COOKIE.length + 1);
  if (!raw) return false;
  const [exp, sig] = raw.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.STUDIO_PASSWORD, exp));
}

// ---- Kie
async function kie(env: StudioEnv, path: string, init: RequestInit = {}) {
  const res = await fetch(KIE + path, {
    ...init,
    headers: { authorization: `Bearer ${env.KIE_API_KEY}`, 'content-type': 'application/json', accept: 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: Record<string, unknown> = {};
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text.slice(0, 500) };
  }
  if (!res.ok) throw new Error(`Kie ${res.status}: ${String(body.msg ?? body.message ?? body.raw ?? '')}`);
  return body;
}

// Моделите за изображения и видео: как се казват в Kie и как им се подават полетата.
type GenReq = { model: string; prompt: string; aspect: string; resolution?: string; refs?: string[]; duration?: number };
const MODELS: Record<string, (r: GenReq) => { model: string; input: Record<string, unknown> }> = {
  'nano-banana-pro': (r) => ({
    model: 'nano-banana-pro',
    input: { prompt: r.prompt, aspect_ratio: r.aspect, resolution: r.resolution ?? '2K', output_format: 'png', ...(r.refs?.length ? { image_input: r.refs.slice(0, 8) } : {}) },
  }),
  'nano-banana-2': (r) => ({
    model: 'nano-banana-2',
    input: { prompt: r.prompt, aspect_ratio: r.aspect, resolution: r.resolution ?? '2K', output_format: 'png', ...(r.refs?.length ? { image_input: r.refs.slice(0, 8) } : {}) },
  }),
  // GPT Image 2.6 Flare (ноември 2026): най-добре следва указания и изписва текст; поддържа 4:5.
  'gpt-image-2-6': (r) => {
    const input = { prompt: r.prompt, aspect_ratio: r.aspect, resolution: r.resolution ?? '2K', quality: 'high', output_format: 'png' };
    return r.refs?.length
      ? { model: 'gpt-image-2-6/flare-image-to-image', input: { ...input, input_urls: r.refs.slice(0, 16) } }
      : { model: 'gpt-image-2-6/flare-text-to-image', input };
  },
  'gpt-image-2': (r) => {
    // GPT Image 2 няма 4:5 и 2:3; най-близкото е 3:4.
    const aspect = ['1:1', '9:16', '16:9', '4:3', '3:4'].includes(r.aspect) ? r.aspect : '3:4';
    const resolution = aspect === '1:1' && r.resolution === '4K' ? '2K' : (r.resolution ?? '2K');
    return r.refs?.length
      ? { model: 'gpt-image-2-image-to-image', input: { prompt: r.prompt, input_urls: r.refs.slice(0, 16), aspect_ratio: aspect, resolution } }
      : { model: 'gpt-image-2-text-to-image', input: { prompt: r.prompt, aspect_ratio: aspect, resolution } };
  },
  // Seedream 5.5 (9.11.2026): най-последователен стил в серия, добра светлина и материи.
  'seedream-5-5': (r) => {
    const aspect = ['1:1', '4:3', '3:4', '16:9', '9:16', '2:3', '3:2', '21:9'].includes(r.aspect) ? r.aspect : '3:4';
    const size = r.resolution === '1K' ? '1K' : '2K';
    return r.refs?.length
      ? { model: 'seedream/5-5-image-to-image', input: { prompt: r.prompt, image_urls: r.refs.slice(0, 10), aspect_ratio: aspect, size, output_format: 'png' } }
      : { model: 'seedream/5-5-text-to-image', input: { prompt: r.prompt, aspect_ratio: aspect, size, output_format: 'png' } };
  },
  // Flux 3 Klein: най-евтиният (~0,01 $), добър текст; за бързи чернови.
  'flux-3-klein': (r) => {
    const aspect = ['1:1', '4:3', '3:4', '3:2', '2:3', '16:9', '9:16', '21:9', '9:21'].includes(r.aspect) ? r.aspect : '3:4';
    const input = { prompt: r.prompt, aspect_ratio: aspect, resolution: r.resolution ?? '2K', output_format: 'png', enhance_prompt: false };
    return r.refs?.length
      ? { model: 'flux-3/klein-edit-image', input: { ...input, image_urls: r.refs.slice(0, 10) } }
      : { model: 'flux-3/klein-text-to-image', input };
  },
};

// ---- Писане на текстове с Gemini през Kie (OpenAI-съвместим chat).
const WRITER_RULES = `Ти си копирайтър на Pankov Solutions, българска фирма, която прави бизнес системи (ERP, CRM, склад), онлайн магазини и софтуер по поръчка за малки и средни фирми.
Пишеш реклами и постове за Facebook и Instagram на български, на „Вие“ с главна буква, кратко и конкретно, като собственик на фирма, не като агенция.

Правила, които не се нарушават:
- Ползвай САМО фактите, цифрите, цените, клиентите и цитатите от ЗНАНИЕТО по-долу. Нищо не измисляй: нито клиенти, нито проценти, нито срокове, нито отзиви.
- Цитат от клиент се ползва само дословно и само с подписа от знанието.
- Цените са „от 900 €“ / „от 4 050 €“ (склад „от 3 150 €“), винаги „без ДДС“.
- Не пиши, че сме официален партньор на Odoo. Odoo може да се споменава като платформа, но не в заглавието.
- Не споменавай Плевен и конкретни европейски програми.
- Без клишета („революционен“, „иновативно решение“, „в днешния динамичен свят“), без емоджита в заглавието, най-много 1–2 емоджита в основния текст.
- Заглавие на визията: до 6 думи. Подзаглавие: до 12 думи. Бутон: 2–3 думи.
- Описанието на картинката (image_prompt) е на английски, за AI модел: реалистична снимка или сцена от българска малка фирма (склад, офис, цех, магазин), естествена светлина, без текст в картинката, без лога, без лица в близък план. Ако има истински скрийншот (ref_image), опиши го като екран на лаптоп/монитор/телефон в сцената и напиши "use the provided screenshot exactly as the screen content".
- Цветове на марката, ако са нужни в сцената: тъмносиньо #0A2A66 и лайм #C6F24E като малък акцент.

Отговаряш САМО с валиден JSON без markdown: {"concepts":[{"angle":"...","headline":"...","sub":"...","cta":"...","primary_text":"...","hashtags":"...","image_prompt":"...","ref_image":"/img/... или празно","link":"https://pankovsolutions.com/..."}]}`;

type Topic = { key: string; name: string; url: string; description: string; h1: string; lead: string; facts: unknown; quotes: unknown; prices: unknown; faq: unknown; images: { src: string; alt: string }[]; text: string };

async function write(env: StudioEnv, request: Request, body: { topics?: string[]; kind?: string; count?: number; angle?: string; model?: string }) {
  const k = (await (await env.ASSETS.fetch(new URL('/studio/knowledge.json', request.url))).json()) as {
    offer: unknown;
    company: unknown;
    services: Topic[];
    projects: Topic[];
  };
  const all = [...k.services, ...k.projects];
  const picked = all.filter((t) => (body.topics ?? []).includes(t.key)).slice(0, 4);
  const knowledge = {
    company: k.company,
    offer: k.offer,
    topics: picked.map((t) => ({ ...t, text: t.text.slice(0, 3500) })),
    other_projects: k.projects.filter((p) => !picked.includes(p)).map((p) => ({ name: p.name, url: p.url, description: p.description })),
  };
  const count = Math.min(Math.max(Number(body.count) || 3, 1), 8);
  const kind = body.kind === 'post' ? 'органичен пост за Facebook/Instagram (може и образователен, не само продаващ)' : 'платена реклама във Facebook/Instagram за трафик към страницата';
  const ask = `Направи ${count} различни концепции за: ${kind}.
Всяка концепция трябва да е с РАЗЛИЧЕН ъгъл (напр. цена, болка/проблем, реален клиент, страх от спиране на работата, сравнение с готова програма), не варианти на един.
${body.angle ? 'Насока от Марти: ' + body.angle : ''}
Линкът е към страницата на темата. ref_image избери от images на темата, ако снимката помага (истински екран), иначе празно.

ЗНАНИЕ:
${JSON.stringify(knowledge)}`;
  const model = ['claude-opus-5-5', 'claude-sonnet-5-5', 'gemini-3.1-pro', 'gemini-3-flash'].includes(body.model ?? '') ? body.model! : 'claude-opus-5-5';
  let content = '';
  if (model.startsWith('claude')) {
    // Claude през Kie (Anthropic Messages формат). Правилата са в началото на съобщението.
    const res = (await kie(env, '/claude/v1/messages', {
      method: 'POST',
      body: JSON.stringify({ model, max_tokens: 8000, stream: false, messages: [{ role: 'user', content: WRITER_RULES + '\n\n---\n\n' + ask }] }),
    })) as { content?: { type?: string; text?: string }[] };
    content = (res.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  } else {
    const res = await kie(env, `/api/v1/${model}/v1/chat/completions`, {
      method: 'POST',
      body: JSON.stringify({
        stream: false,
        reasoning_effort: 'low',
        include_thoughts: false,
        messages: [
          { role: 'system', content: [{ type: 'text', text: WRITER_RULES }] },
          { role: 'user', content: [{ type: 'text', text: ask }] },
        ],
      }),
    });
    content = String((res as { choices?: { message?: { content?: unknown } }[] }).choices?.[0]?.message?.content ?? '');
  }
  const m = content.match(/\{[\s\S]*\}/);
  if (!m) throw new Error('Моделът не върна JSON');
  return JSON.parse(m[0]) as { concepts: unknown[] };
}

// ---- История (KV): последните 300 генерирания, без самите файлове.
type Item = { id: string; model: string; prompt: string; aspect: string; refs?: string[]; state: string; urls?: string[]; created: number; note?: string; error?: string };
async function history(env: StudioEnv): Promise<Item[]> {
  if (!env.STUDIO_KV) return [];
  return ((await env.STUDIO_KV.get('history', 'json')) as Item[] | null) ?? [];
}
async function saveHistory(env: StudioEnv, items: Item[]) {
  if (env.STUDIO_KV) await env.STUDIO_KV.put('history', JSON.stringify(items.slice(0, 300)));
}
async function upsert(env: StudioEnv, item: Partial<Item> & { id: string }) {
  const items = await history(env);
  const i = items.findIndex((x) => x.id === item.id);
  if (i >= 0) items[i] = { ...items[i], ...item };
  else items.unshift(item as Item);
  await saveHistory(env, items);
}

// Картинките на Kie идват от техните CDN-и; само тях проксираме.
const IMG_HOSTS = /(^|\.)(kie\.ai|redpandaai\.co|aiquickdraw\.com|tempfile\.aiquickdraw\.com|kieai\.erweima\.ai|storage\.googleapis\.com|cloudfront\.net)$/;

export async function onStudio(context: { request: Request; env: StudioEnv }): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\/studio\/?/, '');
  const post = request.method === 'POST';
  if (post && request.headers.get('origin') && new URL(request.headers.get('origin')!).host !== url.host) return json({ error: 'origin' }, 403);

  try {
    if (route === 'login' && post) {
      if (!env.STUDIO_PASSWORD) return json({ error: 'Студиото още не е настроено: липсва STUDIO_PASSWORD.' }, 503);
      const ip = request.headers.get('cf-connecting-ip') ?? '0';
      const rl = `studio-login:${ip}`;
      const tries = Number((await env.INQUIRY_RL?.get(rl)) ?? '0');
      if (tries >= 8) return json({ error: 'Твърде много опити. Опитайте след час.' }, 429);
      const { password } = (await request.json()) as { password?: string };
      if (!password || !safeEqual(password, env.STUDIO_PASSWORD)) {
        await env.INQUIRY_RL?.put(rl, String(tries + 1), { expirationTtl: 3600 });
        return json({ error: 'Грешна парола.' }, 401);
      }
      const exp = String(Date.now() + SESSION_DAYS * 864e5);
      const cookie = `${COOKIE}=${exp}.${await hmac(env.STUDIO_PASSWORD, exp)}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DAYS * 86400}`;
      return json({ ok: true }, 200, { 'set-cookie': cookie });
    }
    if (route === 'logout' && post) return json({ ok: true }, 200, { 'set-cookie': `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0` });

    if (!(await authed(request, env))) return json({ error: 'auth' }, 401);
    if (route === 'me') return json({ ok: true, kie: Boolean(env.KIE_API_KEY), kv: Boolean(env.STUDIO_KV) });
    if (!env.KIE_API_KEY && route !== 'history') return json({ error: 'Липсва KIE_API_KEY в Cloudflare.' }, 503);

    if (route === 'credit') {
      const r = await kie(env, '/api/v1/chat/credit');
      return json({ credit: r.data });
    }

    if (route === 'write' && post) return json(await write(env, request, await request.json()));

    if (route === 'generate' && post) {
      const r = (await request.json()) as GenReq & { note?: string };
      const build = MODELS[r.model];
      if (!build || !r.prompt) return json({ error: 'Непознат модел или празен промпт.' }, 400);
      // Снимките от сайта се подават с пълен адрес, за да ги изтегли Kie.
      const refs = (r.refs ?? []).filter(Boolean).map((u) => (u.startsWith('/') ? `${url.origin}${u}` : u));
      const task = build({ ...r, refs });
      const res = (await kie(env, '/api/v1/jobs/createTask', { method: 'POST', body: JSON.stringify(task) })) as { code?: number; msg?: string; data?: { taskId?: string } };
      const id = res.data?.taskId;
      if (!id) return json({ error: `Kie не прие задачата: ${res.msg ?? res.code}` }, 502);
      await upsert(env, { id, model: r.model, prompt: r.prompt, aspect: r.aspect, refs, state: 'waiting', created: Date.now(), note: r.note?.slice(0, 300) });
      return json({ id });
    }

    if (route === 'task') {
      const id = url.searchParams.get('id') ?? '';
      if (!/^[\w-]{6,80}$/.test(id)) return json({ error: 'id' }, 400);
      const res = (await kie(env, `/api/v1/jobs/recordInfo?taskId=${encodeURIComponent(id)}`)) as {
        data?: { state?: string; resultJson?: string; failMsg?: string; creditsConsumed?: number };
      };
      const d = res.data ?? {};
      let urls: string[] = [];
      try {
        urls = (JSON.parse(d.resultJson || '{}') as { resultUrls?: string[] }).resultUrls ?? [];
      } catch {
        /* празно */
      }
      if (d.state === 'success' || d.state === 'fail') await upsert(env, { id, state: d.state, urls, error: d.failMsg || undefined });
      return json({ state: d.state ?? 'unknown', urls, error: d.failMsg ?? '', credits: d.creditsConsumed });
    }

    if (route === 'upload' && post) {
      const { dataUrl, name } = (await request.json()) as { dataUrl?: string; name?: string };
      if (!dataUrl?.startsWith('data:image/')) return json({ error: 'Само изображения.' }, 400);
      if (dataUrl.length > 14_000_000) return json({ error: 'Файлът е твърде голям (до ~10 MB).' }, 413);
      const res = (await kie(env, '/api/v1/file-base64-upload', {
        method: 'POST',
        body: JSON.stringify({ base64Data: dataUrl, uploadPath: 'pankov-studio', fileName: `${Date.now()}-${(name ?? 'ref').replace(/[^\w.-]/g, '_').slice(-60)}` }),
      })) as { data?: { downloadUrl?: string } };
      if (!res.data?.downloadUrl) return json({ error: 'Качването не успя.' }, 502);
      return json({ url: res.data.downloadUrl });
    }

    if (route === 'img') {
      const u = new URL(url.searchParams.get('u') ?? '');
      if (u.protocol !== 'https:' || !IMG_HOSTS.test(u.hostname)) return json({ error: 'host' }, 400);
      const r = await fetch(u.toString());
      if (!r.ok) return json({ error: `img ${r.status}` }, 502);
      return new Response(r.body, { headers: { 'content-type': r.headers.get('content-type') ?? 'image/png', 'cache-control': 'private, max-age=86400' } });
    }

    if (route === 'history') {
      if (post) {
        const { id, remove } = (await request.json()) as { id?: string; remove?: boolean };
        if (id && remove) await saveHistory(env, (await history(env)).filter((x) => x.id !== id));
        return json({ ok: true });
      }
      return json({ items: await history(env) });
    }

    return json({ error: 'not found' }, 404);
  } catch (err) {
    console.error('[studio]', safeError(err));
    return json({ error: err instanceof Error ? err.message.slice(0, 300) : 'Грешка' }, 502);
  }
}

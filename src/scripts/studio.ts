// Студиото: бриф → текстове (Gemini) → визия (Nano Banana / GPT Image / Seedream) → текст върху
// визията в canvas с шрифтовете и цветовете на марката → PNG. Сървърът е /api/studio/*.

type Topic = { key: string; name: string; url: string; images: { src: string; alt: string }[] };
type Concept = { angle?: string; headline?: string; sub?: string; cta?: string; primary_text?: string; hashtags?: string; image_prompt?: string; ref_image?: string; link?: string };
type Item = { id: string; model: string; prompt: string; aspect: string; state: string; urls?: string[]; created: number; error?: string; note?: string };

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const api = async <T = Record<string, unknown>>(path: string, body?: unknown): Promise<T> => {
  const res = await fetch('/api/studio/' + path, body === undefined ? {} : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (res.status === 401 && path !== 'login') {
    showLogin();
    throw new Error('Влезте отново.');
  }
  if (!res.ok) throw new Error(data.error || `Грешка ${res.status}`);
  return data;
};
const msg = (id: string, text: string, err = false) => {
  const el = $(id);
  el.textContent = text;
  el.classList.toggle('err', err);
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

// ---- Вход
function showLogin() {
  $('login').hidden = false;
  $('app').hidden = true;
  $('logout').hidden = true;
  $('credit').hidden = true;
}
$('login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = (($('login') as HTMLFormElement).elements.namedItem('password') as HTMLInputElement).value;
  try {
    await api('login', { password });
    start();
  } catch (err) {
    msg('login-msg', (err as Error).message, true);
  }
});
$('logout').addEventListener('click', async () => {
  await api('logout', {}).catch(() => {});
  showLogin();
});

// ---- Знание от сайта
let topics: Topic[] = [];
async function loadKnowledge() {
  const k = (await (await fetch('/studio/knowledge.json')).json()) as { services: Topic[]; projects: Topic[] };
  topics = [...k.services, ...k.projects];
  const group = (title: string, list: Topic[]) =>
    `<b>${title}</b>` + list.map((t) => `<label><input type="checkbox" value="${esc(t.key)}"> ${esc(t.name)}</label>`).join('');
  $('topics').innerHTML = group('Услуги', k.services) + group('Проекти', k.projects);
}
const chosenTopics = () => [...$('topics').querySelectorAll<HTMLInputElement>('input:checked')].map((i) => i.value);

// ---- 1. Концепции
let concepts: Concept[] = [];
$('write').addEventListener('click', async () => {
  const t = chosenTopics();
  if (!t.length) return msg('write-msg', 'Изберете поне една тема.', true);
  const btn = $<HTMLButtonElement>('write');
  btn.disabled = true;
  msg('write-msg', 'Пиша концепциите… (20–60 секунди)');
  try {
    const r = await api<{ concepts: Concept[] }>('write', {
      topics: t,
      kind: $<HTMLSelectElement>('kind').value,
      count: Number($<HTMLSelectElement>('count').value),
      angle: $<HTMLTextAreaElement>('angle').value,
      model: $<HTMLSelectElement>('wmodel').value,
    });
    concepts = r.concepts ?? [];
    renderConcepts();
    msg('write-msg', '');
  } catch (err) {
    msg('write-msg', (err as Error).message, true);
  } finally {
    btn.disabled = false;
  }
});
function renderConcepts() {
  $('concepts').innerHTML = concepts
    .map(
      (c, i) => `<article class="card">
      <span class="angle">${esc(c.angle ?? '')}</span>
      <h3>${esc(c.headline ?? '')}</h3>
      <p>${esc(c.sub ?? '')}</p>
      <p class="hint">Бутон: ${esc(c.cta ?? '')}${c.link ? ' · ' + esc(c.link.replace('https://pankovsolutions.com', '')) : ''}</p>
      <details><summary class="hint">Основен текст и промпт</summary><p>${esc(c.primary_text ?? '')}</p><p class="hint">${esc(c.hashtags ?? '')}</p><p class="hint">${esc(c.image_prompt ?? '')}</p></details>
      <div class="actions"><button class="btn" data-use="${i}">Ползвай</button></div>
    </article>`,
    )
    .join('');
}
$('concepts').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-use]');
  if (!b) return;
  const c = concepts[Number(b.dataset.use)];
  $<HTMLTextAreaElement>('prompt').value = c.image_prompt ?? '';
  $<HTMLInputElement>('t-head').value = c.headline ?? '';
  $<HTMLInputElement>('t-sub').value = c.sub ?? '';
  $<HTMLInputElement>('t-cta').value = c.cta ?? '';
  $<HTMLInputElement>('t-mark').value = '';
  $<HTMLTextAreaElement>('primary').value = [c.primary_text, c.hashtags, c.link].filter(Boolean).join('\n\n');
  refs = c.ref_image ? [c.ref_image] : [];
  renderRefs();
  draw();
  $('h-gen').scrollIntoView({ behavior: 'smooth' });
});

// ---- 2. Референции
let refs: string[] = [];
const refSrc = (u: string) => (u.startsWith('/') ? u : '/api/studio/img?u=' + encodeURIComponent(u));
function renderRefs() {
  $('refs').innerHTML = refs.length
    ? refs.map((u, i) => `<span class="ref on"><img src="${esc(refSrc(u))}" alt=""><button class="x" data-rm="${i}" aria-label="Махни">×</button></span>`).join('')
    : '<span class="hint">Няма. Без референция моделът прави цялата сцена сам.</span>';
}
$('refs').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-rm]');
  if (b) {
    refs.splice(Number(b.dataset.rm), 1);
    renderRefs();
  }
});
$('pick').addEventListener('click', () => {
  const chosen = chosenTopics();
  const list = (chosen.length ? topics.filter((t) => chosen.includes(t.key)) : topics).flatMap((t) => t.images);
  const seen = new Set<string>();
  $('picker-list').innerHTML = list
    .filter((i) => !seen.has(i.src) && seen.add(i.src))
    .map((i) => `<button class="shot" data-src="${esc(i.src)}" title="${esc(i.alt)}"><span class="img" style="background-image:url('${esc(i.src)}')"></span><span class="meta">${esc(i.alt.slice(0, 90))}</span></button>`)
    .join('');
  $<HTMLDialogElement>('picker').showModal();
});
$('picker-list').addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-src]');
  if (!b) return;
  if (!refs.includes(b.dataset.src!)) refs.push(b.dataset.src!);
  renderRefs();
  $<HTMLDialogElement>('picker').close();
});
$('picker-close').addEventListener('click', () => $<HTMLDialogElement>('picker').close());
$<HTMLInputElement>('file').addEventListener('change', async (e) => {
  const f = (e.target as HTMLInputElement).files?.[0];
  if (!f) return;
  msg('gen-msg', 'Качвам снимката…');
  try {
    const dataUrl = await new Promise<string>((ok, no) => {
      const r = new FileReader();
      r.onload = () => ok(String(r.result));
      r.onerror = no;
      r.readAsDataURL(f);
    });
    const { url } = await api<{ url: string }>('upload', { dataUrl, name: f.name });
    refs.push(url);
    renderRefs();
    msg('gen-msg', '');
  } catch (err) {
    msg('gen-msg', (err as Error).message, true);
  }
});

// ---- 2. Генериране и резултати
let items: Item[] = [];
const polling = new Set<string>();
$('generate').addEventListener('click', async () => {
  const prompt = $<HTMLTextAreaElement>('prompt').value.trim();
  if (!prompt) return msg('gen-msg', 'Напишете промпт или изберете концепция.', true);
  const n = Number($<HTMLSelectElement>('n').value);
  const body = { model: $<HTMLSelectElement>('model').value, prompt, aspect: $<HTMLSelectElement>('aspect').value, resolution: $<HTMLSelectElement>('res').value, refs, note: $<HTMLInputElement>('t-head').value };
  const btn = $<HTMLButtonElement>('generate');
  btn.disabled = true;
  msg('gen-msg', 'Изпращам…');
  try {
    for (let i = 0; i < n; i++) {
      const { id } = await api<{ id: string }>('generate', body);
      items.unshift({ id, model: body.model, prompt, aspect: body.aspect, state: 'waiting', created: Date.now(), note: body.note });
      poll(id);
    }
    renderGallery();
    msg('gen-msg', 'Генерира се. Обикновено 20 секунди до 2 минути.');
  } catch (err) {
    msg('gen-msg', (err as Error).message, true);
  } finally {
    btn.disabled = false;
  }
});
async function poll(id: string) {
  if (polling.has(id)) return;
  polling.add(id);
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, i < 5 ? 4000 : 6000));
    try {
      const r = await api<{ state: string; urls: string[]; error: string }>('task?id=' + encodeURIComponent(id));
      const it = items.find((x) => x.id === id);
      if (it) Object.assign(it, { state: r.state, urls: r.urls, error: r.error });
      if (r.state === 'success' || r.state === 'fail') break;
    } catch {
      /* опитай пак */
    }
    renderGallery();
  }
  polling.delete(id);
  renderGallery();
  credit();
}
function renderGallery() {
  $('gallery').innerHTML =
    items
      .slice(0, 60)
      .map((it) => {
        const url = it.urls?.[0];
        const body = url
          ? `<button class="img" data-open="${esc(it.id)}" style="background-image:url('${esc(refSrc(url))}')" aria-label="Отвори в редактора"></button>`
          : it.state === 'fail'
            ? `<span class="img">Неуспешно${it.error ? ': ' + esc(it.error.slice(0, 80)) : ''}</span>`
            : `<span class="img"><span class="spin" aria-label="Генерира се"></span></span>`;
        return `<div class="shot">${body}<div class="meta"><span>${esc(it.model)} · ${esc(it.aspect)} · ${new Date(it.created).toLocaleString('bg-BG', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
          <span title="${esc(it.prompt)}">${esc((it.note || it.prompt).slice(0, 60))}</span>
          <span class="actions">${url ? `<button data-open="${esc(it.id)}">Редактирай</button><a href="${esc(url)}" target="_blank" rel="noopener"><button>Оригинал</button></a>` : ''}<button data-reuse="${esc(it.id)}">Промпт</button><button data-del="${esc(it.id)}" aria-label="Изтрий от историята">×</button></span></div></div>`;
      })
      .join('') || '<p class="hint">Още няма генерирания.</p>';
}
$('gallery').addEventListener('click', async (e) => {
  const t = e.target as HTMLElement;
  const open = t.closest<HTMLElement>('[data-open]')?.dataset.open;
  const reuse = t.closest<HTMLElement>('[data-reuse]')?.dataset.reuse;
  const del = t.closest<HTMLElement>('[data-del]')?.dataset.del;
  if (open) {
    const it = items.find((x) => x.id === open);
    if (it?.urls?.[0]) loadBg(refSrc(it.urls[0]));
    $('h-ed').scrollIntoView({ behavior: 'smooth' });
  } else if (reuse) {
    const it = items.find((x) => x.id === reuse);
    if (it) $<HTMLTextAreaElement>('prompt').value = it.prompt;
  } else if (del) {
    items = items.filter((x) => x.id !== del);
    renderGallery();
    await api('history', { id: del, remove: true }).catch(() => {});
  }
});
async function loadHistory() {
  const r = await api<{ items: Item[] }>('history');
  items = r.items;
  renderGallery();
  items.filter((x) => x.state !== 'success' && x.state !== 'fail' && Date.now() - x.created < 30 * 60e3).forEach((x) => poll(x.id));
}
$('reload').addEventListener('click', () => loadHistory().catch(() => {}));
async function credit() {
  try {
    const r = await api<{ credit: unknown }>('credit');
    $('credit').textContent = `Кредити в Kie: ${r.credit}`;
    $('credit').hidden = false;
  } catch {
    /* без баланс */
  }
}

// ---- 3. Редактор
const cv = $<HTMLCanvasElement>('cv');
const ctx = cv.getContext('2d')!;
let bg: HTMLImageElement | null = null;
const logo = new Image();
logo.src = '/img/logo-white.svg';
const logoDark = new Image();
logoDark.src = '/img/logo.png';
function loadBg(src: string) {
  const img = new Image();
  img.onload = () => {
    bg = img;
    draw();
  };
  img.src = src;
}
const val = (id: string) => ($(id) as HTMLInputElement).value.trim();
function wrap(text: string, maxW: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      lines.push(line);
      line = w;
    } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}
// Заглавие с лайм подчертаване на избрана дума/израз.
function headline(text: string, mark: string, x: number, y: number, maxW: number, size: number, color: string) {
  ctx.font = `600 ${size}px Onest`;
  ctx.textBaseline = 'top';
  const lines = wrap(text, maxW);
  const lh = size * 1.12;
  lines.forEach((l, i) => {
    const ly = y + i * lh;
    if (mark) {
      // Всяка дума от израза се подчертава там, където е в реда (изразът може да е на два реда).
      const marks = mark.toLowerCase().split(/\s+/).filter(Boolean);
      let cursor = 0;
      for (const word of l.split(' ')) {
        const clean = word.toLowerCase().replace(/[?!.,:;„“"]/g, '');
        const start = l.indexOf(word, cursor);
        cursor = start + word.length;
        if (!marks.includes(clean)) continue;
        const before = ctx.measureText(l.slice(0, start)).width;
        const w = ctx.measureText(word.replace(/[?!.,:;„“"]+$/, '')).width;
        ctx.fillStyle = '#C6F24E';
        ctx.fillRect(x + before - size * 0.06, ly + size * 0.62, w + size * 0.12, size * 0.38);
      }
    }
    ctx.fillStyle = color;
    ctx.fillText(l, x, ly);
  });
  return lines.length * lh;
}
function para(text: string, x: number, y: number, maxW: number, size: number, color: string, weight = 500) {
  ctx.font = `${weight} ${size}px Manrope`;
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  const lines = wrap(text, maxW);
  lines.forEach((l, i) => ctx.fillText(l, x, y + i * size * 1.35));
  return lines.length * size * 1.35;
}
function pill(text: string, x: number, y: number, size: number, bgc: string, fg: string) {
  ctx.font = `700 ${size}px Manrope`;
  const w = ctx.measureText(text).width + size * 1.6;
  const h = size * 2.3;
  ctx.fillStyle = bgc;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x + size * 0.8, y + h / 2 + 1);
  return { w, h };
}
function draw() {
  const [W, H] = $<HTMLSelectElement>('size').value.split('x').map(Number);
  cv.width = W;
  cv.height = H;
  ctx.fillStyle = '#E3ECFE';
  ctx.fillRect(0, 0, W, H);
  if (bg) {
    const s = Math.max(W / bg.width, H / bg.height);
    const dw = bg.width * s;
    const dh = bg.height * s;
    const p = Number(val('pos')) / 100;
    ctx.drawImage(bg, (W - dw) * p, (H - dh) * p, dw, dh);
  } else {
    ctx.fillStyle = '#4A5872';
    ctx.font = '500 32px Manrope';
    ctx.textBaseline = 'middle';
    ctx.fillText('Изберете визия от „Резултати“', W * 0.08, H / 2);
  }
  const layout = $<HTMLSelectElement>('layout').value;
  const pad = Math.round(W * 0.065);
  const head = val('t-head');
  const sub = val('t-sub');
  const cta = val('t-cta');
  const badge = val('t-badge');
  const mark = val('t-mark');
  const wide = W / H > 1.5;
  const hs = Math.round(W * (wide ? 0.05 : 0.068));
  if (layout === 'band') {
    const bandH = H * (wide ? 0.62 : 0.44);
    const g = ctx.createLinearGradient(0, H - bandH, 0, H);
    g.addColorStop(0, 'rgba(10,42,102,0)');
    g.addColorStop(0.32, 'rgba(10,42,102,0.86)');
    g.addColorStop(1, 'rgba(10,42,102,0.97)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H - bandH, W, bandH);
    // Отдолу нагоре: бутон, подзаглавие, заглавие.
    ctx.font = `600 ${hs}px Onest`;
    const hLines = wrap(head, W - pad * 2).length;
    ctx.font = `500 ${Math.round(hs * 0.42)}px Manrope`;
    const sLines = sub ? wrap(sub, W - pad * 2).length : 0;
    const ctaH = cta ? Math.round(hs * 0.36) * 2.3 + hs * 0.5 : 0;
    let y = H - pad - ctaH - sLines * hs * 0.42 * 1.35 - (sub ? hs * 0.35 : 0) - hLines * hs * 1.12;
    y += headline(head, mark, pad, y, W - pad * 2, hs, '#FFFFFF');
    if (sub) y += hs * 0.35 + para(sub, pad, y + hs * 0.35, W - pad * 2, Math.round(hs * 0.42), '#DCE4F0');
    if (cta) pill(cta + '  →', pad, H - pad - Math.round(hs * 0.36) * 2.3, Math.round(hs * 0.36), '#C6F24E', '#0A2A66');
    if (logo.complete) ctx.drawImage(logo, pad, pad, W * 0.22, (W * 0.22 * logo.height) / logo.width || W * 0.06);
  } else if (layout === 'card') {
    const cw = W - pad * 2;
    ctx.font = `600 ${hs}px Onest`;
    const hh = wrap(head, cw - pad * 1.2).length * hs * 1.12;
    ctx.font = `500 ${Math.round(hs * 0.42)}px Manrope`;
    const sh = sub ? wrap(sub, cw - pad * 1.2).length * hs * 0.42 * 1.35 + hs * 0.3 : 0;
    const ch = hh + sh + pad * 1.2 + (cta ? hs * 1.1 : 0);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.beginPath();
    ctx.roundRect(pad, pad, cw, ch, [16, Math.min(96, ch / 2), 16, 16]);
    ctx.fill();
    let y = pad + pad * 0.6;
    y += headline(head, mark, pad * 1.6, y, cw - pad * 1.2, hs, '#0B1B3A');
    if (sub) y += hs * 0.3 + para(sub, pad * 1.6, y + hs * 0.3, cw - pad * 1.2, Math.round(hs * 0.42), '#4A5872');
    if (cta) pill(cta + '  →', pad * 1.6, y + hs * 0.35, Math.round(hs * 0.32), '#0A2A66', '#FFFFFF');
    if (logoDark.complete) {
      const lw = W * 0.2;
      const lh = (lw * logoDark.height) / logoDark.width;
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.roundRect(W - pad - lw - 24, H - pad - lh - 20, lw + 24, lh + 20, 12);
      ctx.fill();
      ctx.drawImage(logoDark, W - pad - lw - 12, H - pad - lh - 10, lw, lh);
    }
  } else if (layout === 'clean' && logoDark.complete) {
    const lw = W * 0.2;
    const lh = (lw * logoDark.height) / logoDark.width;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    ctx.roundRect(pad - 12, pad - 10, lw + 24, lh + 20, 12);
    ctx.fill();
    ctx.drawImage(logoDark, pad, pad, lw, lh);
  }
  if (badge && layout !== 'none') {
    ctx.font = `700 ${Math.round(hs * 0.5)}px Onest`;
    const bw = ctx.measureText(badge).width + hs * 0.9;
    const bh = hs * 1.15;
    const bx = W - pad - bw;
    const by = layout === 'card' ? H - pad - bh - W * 0.1 : pad;
    ctx.fillStyle = '#C6F24E';
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bh, [12, 36, 12, 12]);
    ctx.fill();
    ctx.fillStyle = '#0A2A66';
    ctx.textBaseline = 'middle';
    ctx.fillText(badge, bx + hs * 0.45, by + bh / 2 + 2);
  }
}
['t-head', 't-sub', 't-cta', 't-badge', 't-mark', 'pos'].forEach((id) => $(id).addEventListener('input', draw));
['size', 'layout'].forEach((id) => $(id).addEventListener('change', draw));
logo.onload = logoDark.onload = draw;
$('download').addEventListener('click', () => {
  draw();
  cv.toBlob((b) => {
    if (!b) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(b);
    a.download = `pankov-${(val('t-head') || 'visia').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 40)}-${$<HTMLSelectElement>('size').value}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }, 'image/png');
});
$('copy').addEventListener('click', () => navigator.clipboard.writeText($<HTMLTextAreaElement>('primary').value));

// ---- Старт
async function start() {
  try {
    const me = await api<{ kie: boolean; kv: boolean }>('me');
    $('login').hidden = true;
    $('app').hidden = false;
    $('logout').hidden = false;
    if (!me.kie) msg('gen-msg', 'Липсва KIE_API_KEY в Cloudflare — генерирането няма да работи.', true);
    await document.fonts.load('600 40px Onest');
    await document.fonts.load('500 20px Manrope');
    await document.fonts.load('700 20px Manrope');
    renderRefs();
    draw();
    await loadKnowledge();
    loadHistory().catch(() => {});
    credit();
  } catch {
    showLogin();
  }
}
start();

// Целият JavaScript на сайта: спиране на движещите се лога, формата за запитване и
// проверката за европейско финансиране. Без JS формите пак работят (обикновен POST).

import { initHeroShow } from './hero-show';

declare global {
  interface Window {
    turnstile?: { reset: (el?: Element) => void };
  }
}

const lang = document.documentElement.lang === 'en' ? 'en' : 'bg';
const L = {
  bg: {
    sending: 'Изпращаме…',
    network: 'Нещо се обърка при изпращането. Опитайте отново или ни се обадете на 0877 944 224.',
    ok: 'Благодарим! Получихме запитването и ще Ви отговорим до 1 работен ден.',
    required: 'Попълнете това поле.',
    email: 'Въведете валиден имейл, например ivan@firma.bg.',
    phone: 'Въведете валиден телефон.',
    message: 'Напишете поне няколко думи.',
    turnstile: 'Потвърдете, че не сте робот.',
  },
  en: {
    sending: 'Sending…',
    network: 'Something went wrong while sending. Please try again or call us on +359 877 944 224.',
    ok: 'Thank you! We have received your enquiry and will reply within one business day.',
    required: 'Please fill in this field.',
    email: 'Please enter a valid email, e.g. john@company.com.',
    phone: 'Please enter a valid phone number.',
    message: 'Please write at least a few words.',
    turnstile: 'Please confirm you are not a robot.',
  },
}[lang];

type Reply = { ok: boolean; message?: string; errors?: Record<string, string>; ref?: string };

const show = document.querySelector<HTMLElement>('[data-show]');
if (show) initHeroShow(show);

// ---- Движещите се лога: бутон „Спри/Пусни движението“ ---------------------------------
for (const btn of document.querySelectorAll<HTMLButtonElement>('[data-marquee-toggle]')) {
  const scope = btn.closest('section') ?? document;
  btn.addEventListener('click', () => {
    const paused = btn.getAttribute('aria-pressed') !== 'true';
    btn.setAttribute('aria-pressed', String(paused));
    btn.textContent = (paused ? btn.dataset.labelPlay : btn.dataset.labelPause) ?? '';
    for (const track of scope.querySelectorAll<HTMLElement>('.ps-marquee-track')) {
      track.style.animationPlayState = paused ? 'paused' : 'running';
    }
  });
}

// ---- Помощни за грешки по поле --------------------------------------------------------
function fieldError(form: HTMLFormElement, name: string, text: string) {
  const input = form.querySelector<HTMLElement>(`[name="${name}"]`);
  if (!input) return false;
  input.setAttribute('aria-invalid', 'true');
  const holder = input.closest('label') ?? input.parentElement!;
  let p = holder.querySelector<HTMLElement>(`.ps-field-err[data-for="${name}"]`);
  if (!p) {
    p = document.createElement('span');
    p.className = 'ps-field-err';
    p.dataset.for = name;
    p.id = `err-${form.dataset.formId ?? 'f'}-${name}`;
    holder.appendChild(p);
  }
  p.textContent = text;
  input.setAttribute('aria-describedby', [input.getAttribute('aria-describedby'), p.id].filter(Boolean).join(' '));
  return true;
}

function clearErrors(form: HTMLFormElement) {
  for (const el of form.querySelectorAll('[aria-invalid]')) el.removeAttribute('aria-invalid');
  for (const p of form.querySelectorAll<HTMLElement>('.ps-field-err')) {
    const input = form.querySelector(`[name="${p.dataset.for}"]`);
    const ids = (input?.getAttribute('aria-describedby') ?? '').split(' ').filter((id) => id && id !== p.id);
    if (input) {
      if (ids.length) input.setAttribute('aria-describedby', ids.join(' '));
      else input.removeAttribute('aria-describedby');
    }
    p.remove();
  }
}

async function post(form: HTMLFormElement, data: FormData): Promise<Reply> {
  const res = await fetch(form.action, { method: 'POST', body: data, headers: { accept: 'application/json' } });
  try {
    return (await res.json()) as Reply;
  } catch {
    return { ok: false, message: L.network };
  }
}

// ---- Форма за запитване ---------------------------------------------------------------
let formCount = 0;
for (const form of document.querySelectorAll<HTMLFormElement>('form.ps-inquiry')) {
  form.noValidate = true;
  form.dataset.formId = String(++formCount);
  const ts = form.querySelector<HTMLInputElement>('input[name="ts"]');
  if (ts) ts.value = String(Date.now());
  const status = form.querySelector<HTMLElement>('.ps-form-status');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  const label = button?.textContent ?? '';

  // ?service=<slug> от страниците на услугите избира услугата в падащото меню.
  const select = form.querySelector('select[name="service"]') as HTMLSelectElement | null;
  const wanted = new URLSearchParams(location.search).get('service');
  if (select && wanted && [...select.options].some((o) => o.value === wanted)) select.value = wanted;

  const setStatus = (text: string, tone: 'ok' | 'error' | '') => {
    if (!status) return;
    status.textContent = text;
    if (tone) status.dataset.tone = tone;
    else delete status.dataset.tone;
  };

  const validate = () => {
    const v = (n: string) => (form.querySelector<HTMLInputElement>(`[name="${n}"]`)?.value ?? '').trim();
    const errs: Record<string, string> = {};
    if (v('name').length < 2) errs.name = L.required;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v('email'))) errs.email = L.email;
    if (form.querySelector('[name="phone"][required]') && v('phone').replace(/[^\d]/g, '').length < 6) errs.phone = L.phone;
    if (v('message').length < 10) errs.message = L.message;
    return errs;
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearErrors(form);
    setStatus('', '');
    const errs = validate();
    if (Object.keys(errs).length) {
      for (const [n, t] of Object.entries(errs)) fieldError(form, n, t);
      form.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    if (button) {
      button.disabled = true;
      button.textContent = L.sending;
    }
    let reply: Reply;
    try {
      reply = await post(form, new FormData(form));
    } catch {
      reply = { ok: false, message: L.network };
    }
    if (button) {
      button.disabled = false;
      button.textContent = label;
    }
    if (reply.ok) {
      location.href = lang === 'en' ? '/en/contact/sent' : '/contact/sent';
      return;
    }
    const orphan: string[] = [];
    for (const [n, t] of Object.entries(reply.errors ?? {})) if (!fieldError(form, n, t)) orphan.push(t);
    const first = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!first || orphan.length) setStatus(orphan[0] ?? reply.message ?? L.network, 'error');
    (first ?? status)?.focus();
    window.turnstile?.reset();
  });
}

// ---- Проверка за европейско финансиране (5 стъпки) -----------------------------------
const eu = document.querySelector<HTMLFormElement>('form[data-eu-check]');
if (eu) {
  const form = eu;
  form.noValidate = true;
  form.dataset.formId = 'eu';
  const msg = (k: string) => form.getAttribute(`data-msg-${k}`) ?? '';
  const steps = [...form.querySelectorAll<HTMLElement>('[data-step]')];
  const back = form.querySelector<HTMLButtonElement>('[data-back]')!;
  const next = form.querySelector<HTMLButtonElement>('[data-next]')!;
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]')!;
  const spacer = form.querySelector<HTMLElement>('[data-spacer]');
  const err = form.querySelector<HTMLElement>('[data-err]')!;
  const num = form.querySelector<HTMLElement>('[data-step-num]');
  const bar = form.querySelector<HTMLElement>('[data-bar]');
  const done = document.querySelector<HTMLElement>('[data-eu-done]');
  const ts = form.querySelector<HTMLInputElement>('input[name="ts"]');
  if (ts) ts.value = String(Date.now());
  const session = form.querySelector<HTMLInputElement>('input[name="session"]');
  if (session) session.value = (crypto.randomUUID?.() ?? String(Date.now())).slice(0, 12);
  let step = 1;

  const val = (n: string) => {
    const els = form.querySelectorAll<HTMLInputElement>(`[name="${n}"]`);
    if (!els.length) return '';
    const first = els[0];
    if (first.type === 'radio') return [...els].find((e) => e.checked)?.value ?? '';
    if (first.type === 'checkbox') return els.length > 1 ? [...els].filter((e) => e.checked).map((e) => e.value).join(',') : first.checked ? 'on' : '';
    return first.value.trim();
  };

  const syncOptions = () => {
    for (const opt of form.querySelectorAll<HTMLElement>('.pe-opt')) {
      const input = opt.querySelector('input');
      opt.classList.toggle('pe-on', Boolean(input?.checked));
    }
    for (const note of form.querySelectorAll<HTMLElement>('[data-show-if]')) {
      const [n, v] = (note.dataset.showIf ?? '').split('=');
      note.hidden = val(n) !== v;
    }
  };
  // Грешката не се скрива при промяна: ако изчезне при blur, бутонът „Напред“ се измества
  // нагоре между mousedown и mouseup и кликът се губи. Скрива се при следващата стъпка.
  form.addEventListener('change', syncOptions);

  const show = (s: number) => {
    step = s;
    steps.forEach((el) => (el.hidden = Number(el.dataset.step) !== s));
    back.hidden = s === 1;
    if (spacer) spacer.hidden = s !== 1;
    next.hidden = s === 5;
    submit.hidden = s !== 5;
    if (num) num.textContent = String(s);
    if (bar) bar.style.width = `${s * 20}%`;
    err.hidden = true;
  };

  const check = (s: number): { text: string; field?: string } | null => {
    if (s === 1 && !val('registered')) return { text: msg('1'), field: 'registered' };
    if (s === 2 && (!val('staff') || !val('revenue'))) return { text: msg('2'), field: !val('staff') ? 'staff' : 'revenue' };
    if (s === 3) {
      for (const f of ['company', 'eik', 'city', 'activity']) {
        if (f === 'eik' && val('registered') === 'no') continue;
        if (!val(f)) return { text: msg('3'), field: f };
      }
      if (val('registered') !== 'no' && !/^(\d{9}|\d{13})$/.test(val('eik').replace(/\s/g, ''))) return { text: msg('eik'), field: 'eik' };
    }
    if (s === 4) {
      for (const f of ['wants', 'description', 'budget', 'cofin', 'debts']) if (!val(f)) return { text: msg('4'), field: f };
    }
    if (s === 5) {
      if (val('name').length < 2) return { text: msg('name'), field: 'name' };
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val('email'))) return { text: msg('email'), field: 'email' };
      if (val('phone').replace(/[^\d]/g, '').length < 9) return { text: msg('phone'), field: 'phone' };
      if (!val('consentPartner') || !val('consentPrivacy')) return { text: msg('consent'), field: !val('consentPartner') ? 'consentPartner' : 'consentPrivacy' };
    }
    return null;
  };

  const fail = (e: { text: string; field?: string }) => {
    err.textContent = e.text;
    err.hidden = false;
    const el = e.field ? form.querySelector<HTMLElement>(`[name="${e.field}"]`) : null;
    (el ?? err).focus();
  };

  // Частично известие след всяка стъпка (без лични данни), за да се вижда къде спират хората.
  const ping = (s: number) => {
    const data = new FormData();
    data.set('event', 'step');
    data.set('step', String(s));
    data.set('locale', lang);
    data.set('session', session?.value ?? '');
    const fields: Record<number, string[]> = {
      1: ['registered'],
      2: ['staff', 'revenue'],
      3: ['company', 'eik', 'city', 'activity'],
      4: ['wants', 'description', 'budget', 'cofin', 'debts'],
    };
    for (let i = 1; i <= s; i++) for (const f of fields[i] ?? []) data.set(f, val(f));
    fetch(form.action, { method: 'POST', body: data, headers: { accept: 'application/json' }, keepalive: true }).catch(() => {});
  };

  next.addEventListener('click', () => {
    const e = check(step);
    if (e) return fail(e);
    ping(step);
    show(step + 1);
    steps[step - 1]?.querySelector<HTMLElement>('input, select, textarea')?.focus();
  });
  back.addEventListener('click', () => show(Math.max(1, step - 1)));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    for (let s = 1; s <= 5; s++) {
      const e = check(s);
      if (e) {
        show(s);
        return fail(e);
      }
    }
    submit.disabled = true;
    const label = submit.textContent;
    submit.textContent = msg('sending');
    const data = new FormData(form);
    data.set('wants', val('wants'));
    let reply: Reply;
    try {
      reply = await post(form, data);
    } catch {
      reply = { ok: false, message: msg('network') };
    }
    submit.disabled = false;
    submit.textContent = label;
    if (!reply.ok) {
      const firstField = Object.keys(reply.errors ?? {})[0];
      fail({ text: Object.values(reply.errors ?? {})[0] ?? reply.message ?? msg('network'), field: firstField });
      window.turnstile?.reset();
      return;
    }
    if (done) {
      const labelOf = (n: string) =>
        [...form.querySelectorAll<HTMLInputElement>(`[name="${n}"]:checked`)]
          .map((i) => i.closest('label')?.textContent?.trim().toLowerCase() ?? '')
          .join(', ');
      const out = (k: string, v: string) => {
        const el = done.querySelector<HTMLElement>(`[data-out="${k}"]`);
        if (el) el.textContent = v;
      };
      const budget = form.querySelector('select[name="budget"]') as HTMLSelectElement | null;
      out('ref', reply.ref ?? '');
      out('company', val('company'));
      out('wants', labelOf('wants'));
      out('budget', budget?.selectedOptions[0]?.textContent ?? '');
      form.hidden = true;
      done.hidden = false;
      done.focus();
    }
  });

  syncOptions();
  show(1);
}

export {};

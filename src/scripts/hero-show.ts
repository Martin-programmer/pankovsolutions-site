// Витрината в хирото: два примера (магазин и CRM) с реални кадри. Всяка стъпка приближава
// кадъра към важната част, курсорът „кликва“, появяват се рамка и обяснение.
// На телефон обяснението е под кадъра, а кадърът е изрязан около важната част.
// Спира при посочване с мишката, при фокус вътре и с бутона „Пауза“; при
// prefers-reduced-motion започва на пауза и без увеличение.

const DUR = 5600;

export function initHeroShow(root: HTMLElement) {
  const view = root.querySelector('[data-view]') as HTMLElement;
  const hs = root.querySelector('.ps-show__hs') as HTMLElement;
  const chip = root.querySelector('.ps-show__chip') as HTMLElement;
  const cur = root.querySelector('.ps-show__cursor') as SVGElement;
  const rip = root.querySelector('.ps-show__ripple') as HTMLElement;
  const url = root.querySelector('[data-url]') as HTMLElement;
  const pauseBtn = root.querySelector('[data-pause]') as HTMLButtonElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobile = matchMedia('(max-width: 720px)');
  const imgs: Record<string, HTMLImageElement> = {};
  root.querySelectorAll<HTMLImageElement>('[data-view] img').forEach((i) => (imgs[i.dataset.k!] = i));
  const trackBtns = [...root.querySelectorAll<HTMLButtonElement>('[data-track]')];
  const lists = [...root.querySelectorAll<HTMLElement>('[data-track-steps]')];
  const caps = [...root.querySelectorAll<HTMLElement>('[data-track-cap]')];
  const set = (sel: string, text: string) => {
    const el = root.querySelector(sel);
    if (el) el.textContent = text;
  };

  let tr = 0;
  let st = 0;
  let t0 = performance.now();
  let elapsed = 0;
  let paused = reduce;
  let hover = false;
  let timers: number[] = [];
  const steps = () => [...lists[tr].querySelectorAll<HTMLButtonElement>('button')];
  const area = (b: HTMLButtonElement) => (b.dataset.hs ?? '0,0,100,100').split(',').map(Number);

  function placeChip(cx: number, cy: number, w: number, h: number) {
    const vw = view.clientWidth, vh = view.clientHeight, cw = chip.offsetWidth, ch = chip.offsetHeight, g = 14;
    const bx = ((cx - w / 2) / 100) * vw, bw = (w / 100) * vw, by = ((cy - h / 2) / 100) * vh, bh = (h / 100) * vh;
    let top: number;
    let left = bx;
    if (by + bh + g + ch <= vh - 8) top = by + bh + g;
    else if (by - g - ch >= 8) top = by - g - ch;
    else {
      top = Math.max(8, Math.min(vh - ch - 8, by + bh / 2 - ch / 2));
      left = bx + bw + g + cw <= vw - 8 ? bx + bw + g : bx - cw - g;
    }
    chip.style.left = `${Math.max(8, Math.min(vw - cw - 8, left))}px`;
    chip.style.top = `${top}px`;
  }

  function go(t: number, s: number) {
    timers.forEach(clearTimeout);
    timers = [];
    if (t !== tr) {
      tr = t;
      trackBtns.forEach((b, i) => b.setAttribute('aria-pressed', String(i === tr)));
      lists.forEach((l, i) => (l.hidden = i !== tr));
      caps.forEach((c, i) => (c.hidden = i !== tr));
    }
    st = s;
    const all = steps();
    const b = all[s];
    all.forEach((x, i) => {
      if (i === s) x.setAttribute('aria-current', 'true');
      else x.removeAttribute('aria-current');
      (x.querySelector('.p') as HTMLElement).style.width = i < s ? '100%' : '0';
    });
    url.innerHTML = '';
    const em = document.createElement('em');
    em.textContent = b.dataset.host ?? '';
    url.append(em, b.dataset.path ?? '');
    const kind = b.querySelector('.k')?.textContent ?? '';
    const text = b.querySelector('.c')?.textContent ?? '';
    set('[data-chip-k]', kind);
    set('[data-chip-c]', text);
    set('[data-note-k]', kind);
    set('[data-note-c]', text);

    Object.values(imgs).forEach((i) => i.classList.remove('on'));
    hs.classList.remove('on');
    chip.classList.remove('on');
    const [x1, y1, x2, y2] = area(b);
    const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
    const small = mobile.matches;
    const z = reduce ? 1 : Number(b.dataset.z ?? 1) + (small ? 0.35 : 0);
    const im = imgs[b.dataset.img!];
    im.style.objectPosition = small ? `${cx}% ${cy}%` : '';
    im.style.transformOrigin = `${cx}% ${cy}%`;
    im.style.transform = 'scale(1)';
    void im.offsetWidth;
    im.classList.add('on');
    requestAnimationFrame(() => (im.style.transform = `scale(${z})`));
    if (!small) {
      const w = (x2 - x1) * z, h = (y2 - y1) * z, pad = 0.8;
      Object.assign(hs.style, { left: `${cx - w / 2 - pad}%`, top: `${cy - h / 2 - pad * 2.1}%`, width: `${w + pad * 2}%`, height: `${h + pad * 4.2}%` });
      cur.style.left = `${cx}%`;
      cur.style.top = `${cy}%`;
      timers.push(window.setTimeout(() => {
        rip.style.left = `${cx}%`;
        rip.style.top = `${cy}%`;
        rip.classList.remove('go');
        void rip.offsetWidth;
        rip.classList.add('go');
      }, 1150));
      timers.push(window.setTimeout(() => hs.classList.add('on'), 1250));
      timers.push(window.setTimeout(() => {
        placeChip(cx, cy, w, h);
        chip.classList.add('on');
      }, 1450));
    }
    elapsed = 0;
    t0 = performance.now();
  }

  function tick(now: number) {
    const b = steps()[st];
    if (paused || hover) t0 = now - elapsed;
    else elapsed = now - t0;
    if (b) (b.querySelector('.p') as HTMLElement).style.width = `${Math.min(100, (elapsed / DUR) * 100)}%`;
    if (elapsed >= DUR && !paused && !hover) {
      if (st < steps().length - 1) go(tr, st + 1);
      else go((tr + 1) % lists.length, 0);
    }
    requestAnimationFrame(tick);
  }

  trackBtns.forEach((b, i) => b.addEventListener('click', () => go(i, 0)));
  lists.forEach((l, t) => l.querySelectorAll('button').forEach((b, s) => b.addEventListener('click', () => go(t, s))));
  const browser = root.querySelector('.ps-show__browser')!;
  browser.addEventListener('mouseenter', () => (hover = true));
  browser.addEventListener('mouseleave', () => (hover = false));
  root.addEventListener('focusin', () => (hover = true));
  root.addEventListener('focusout', () => (hover = false));
  const label = () => (pauseBtn.textContent = (paused ? pauseBtn.dataset.labelPlay : pauseBtn.dataset.labelPause) ?? '');
  pauseBtn.addEventListener('click', () => {
    paused = !paused;
    pauseBtn.setAttribute('aria-pressed', String(paused));
    label();
  });
  label();
  pauseBtn.setAttribute('aria-pressed', String(paused));
  mobile.addEventListener('change', () => go(tr, st));
  addEventListener('resize', () => {
    if (mobile.matches) return;
    const b = steps()[st];
    const [x1, y1, x2, y2] = area(b);
    const z = reduce ? 1 : Number(b.dataset.z ?? 1);
    placeChip((x1 + x2) / 2, (y1 + y2) / 2, (x2 - x1) * z, (y2 - y1) * z);
  });
  // Анимацията тръгва, когато витрината е на екрана.
  const io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting)) {
      io.disconnect();
      go(0, 0);
      requestAnimationFrame(tick);
    }
  });
  io.observe(root);
}

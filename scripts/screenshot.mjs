import { chromium } from 'playwright';

const url = process.argv[2] ?? 'http://localhost:4321/styleguide';
const outDir = process.argv[3] ?? '.';
// /projects/stegi-store -> "projects-stegi-store"; / -> "index"
const slug = new URL(url).pathname.replace(/^\/|\/$/g, '').replace(/\//g, '-') || 'index';

const browser = await chromium.launch({ channel: 'msedge' });

for (const [name, width, height] of [
  ['1440', 1440, 900],
  ['390', 390, 844],
]) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  // Скрол през цялата страница, за да се задействат reveal-ите (IntersectionObserver),
  // после обратно горе; sticky хедърът става статичен, за да не се наслагва в кадъра.
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 700));
  });
  await page.addStyleTag({ content: '.site-header{position:static!important}' });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  const path = `${outDir}/${slug}-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`${name}px viewport -> ${path}  (page height ${h}px)`);
  await page.close();
}

// Отделен изрязан кадър при DPR 3 — за проверка на българските форми на кирилицата.
const zoom = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 3 });
await zoom.goto(url, { waitUntil: 'networkidle' });
await zoom.evaluate(() => document.fonts.ready);
for (const [name, sel] of [
  ['serif700', '.f-display-700[style*="--text-3xl"]'],
  ['serif300', '.f-display-300[style*="--text-3xl"]'],
  ['sans400', '.f-body-400[style*="--text-3xl"]'],
  ['mono400', '.f-mono-400[style*="--text-2xl"]'],
]) {
  // Само на /styleguide има такива елементи — на другите страници се прескача.
  if ((await zoom.locator(sel).count()) === 0) continue;
  const path = `${outDir}/letterforms-${name}.png`;
  await zoom.locator(sel).first().screenshot({ path });
  console.log(`letterforms ${name} -> ${path}`);
}
await browser.close();

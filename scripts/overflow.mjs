import { chromium } from 'playwright';

// npm run overflow <url> [width]
// Проверява дали страницата се скролва хоризонтално (CHECKLIST: никога) и изброява
// елементите, които излизат извън viewport-а. Excel код 1 при преливане.
const url = process.argv[2] ?? 'http://localhost:4321/';
const width = Number(process.argv[3] ?? 390);

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width, height: 844 } });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const result = await page.evaluate(() => {
  const vw = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    // Извън екрана, или съдържание, което прелива вътре в елемента (дълга дума/URL).
    const inner = el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible';
    if (r.width > 0 && (r.right > vw + 1 || inner)) {
      out.push({
        tag: el.tagName.toLowerCase(),
        cls: el.className?.toString().slice(0, 40),
        right: Math.round(r.right),
        inner: inner ? `${el.scrollWidth}>${el.clientWidth}` : '',
        text: (el.textContent || '').trim().slice(0, 40),
      });
    }
  }
  return { vw, scrollWidth: document.documentElement.scrollWidth, out, total: out.length };
});

console.log(`viewport ${result.vw} scrollWidth ${result.scrollWidth} overflowing elements: ${result.total}`);
for (const o of result.out.slice(0, 15)) console.log(`  ${o.tag}.${o.cls} right=${o.right} ${o.inner} | ${o.text}`);
await browser.close();
process.exit(result.scrollWidth > result.vw ? 1 : 0);

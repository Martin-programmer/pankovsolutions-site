import { chromium } from 'playwright';

// npm run crop <url> <selector> <outFile> [width]
// Скрийншот на един елемент при DPR 2 — за преглед на конкретна секция.
const [url, selector, outFile, width = '1440'] = process.argv.slice(2);
if (!url || !selector || !outFile) {
  console.error('usage: crop <url> <selector> <outFile> [width]');
  process.exit(2);
}

const browser = await chromium.launch({ channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 }, deviceScaleFactor: 2 });
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const el = page.locator(selector).first();
if ((await el.count()) === 0) {
  console.error(`not found: ${selector}`);
  await browser.close();
  process.exit(1);
}
// Sticky хедърът не се наслагва; reveal-ите вътре в елемента да са приключили.
await page.addStyleTag({ content: '.site-header{position:static!important}' });
await el.scrollIntoViewIfNeeded();
await page.evaluate(() => document.querySelectorAll('.reveal').forEach((r) => r.classList.add('is-in')));
await page.waitForTimeout(700);
await el.screenshot({ path: outFile });
console.log(`${selector} -> ${outFile}`);
await browser.close();

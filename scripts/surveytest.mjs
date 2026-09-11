import { chromium } from 'playwright';

// Минава през анкетата стъпка по стъпка на 1440 и 390 px; снима всяка стъпка; брои
// частичните заявки към /api/survey.
const base = process.argv[2] ?? 'http://localhost:8788';
const out = process.argv[3] ?? '.';
const b = await chromium.launch({ channel: 'msedge' });

for (const [name, width, height] of [['1440', 1440, 900], ['390', 390, 844]]) {
  const page = await b.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  // Локално: различен „IP“ на всеки пуск, за да не се удря rate limit-ът (40/час на IP) при
  // повторни тестове. На Cloudflare хедърът се задава от edge-а и не може да се подправи.
  await page.setExtraHTTPHeaders({ 'cf-connecting-ip': `10.9.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` });
  page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()); });
  const posts = [];
  page.on('request', (r) => { if (r.url().endsWith('/api/survey') && r.method() === 'POST') posts.push(r.postData()?.match(/name="event"\r?\n\r?\n(\w+)/)?.[1] + ':' + r.postData()?.match(/name="step"\r?\n\r?\n(\d)/)?.[1]); });
  await page.goto(`${base}/f/zeleni-tehnologii-msp`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const form = page.locator('form.survey');
  await form.scrollIntoViewIfNeeded();
  const shot = (n) => form.screenshot({ path: `${out}/survey-${name}-${n}.png` });

  await shot('1-start');
  // Грешка без избор
  await page.click('[data-next]');
  await shot('1-error');
  // „Не“ → неподходяща
  await page.check('input[name=registered][value=no]');
  await shot('1-no');
  // „Да“ → напред
  await page.check('input[name=registered][value=yes]');
  await page.click('[data-next]');
  await shot('2');
  await page.selectOption('[name=staff]', '10-50');
  await page.selectOption('[name=revenue]', '100k-150k');
  await page.click('[data-next]');
  await page.fill('[name=company]', 'Тест ЕООД');
  await page.fill('[name=eik]', '12345');
  await page.fill('[name=city]', 'Плевен');
  await page.click('[data-next]');
  await shot('3-error');
  await page.fill('[name=eik]', '123456789');
  await page.click('[data-next]');
  await page.fill('[name=activity]', 'Металообработване');
  await page.fill('textarea[name=description]', 'Искаме нова машина и система за брака.');
  await page.click('[data-next]');
  await shot('5');
  await page.click('[data-back]');
  await shot('4-back');
  await page.click('[data-next]');
  await page.fill('[name=name]', 'Тест Тестов');
  await page.fill('[name=email]', 'test@example.com');
  await page.fill('[name=phone]', '+359 877 000 000');
  await page.check('[name=consent]');
  await page.evaluate(() => { document.querySelector('form.survey input[name=ts]').value = String(Date.now() - 5000); });
  await page.click('form.survey button[type=submit]');
  await page.waitForSelector('form.survey .form-success', { timeout: 10000 });
  await shot('done');
  console.log(name, 'posts:', posts.join(' '));
  await page.close();
}
await b.close();

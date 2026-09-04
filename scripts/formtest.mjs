import { chromium } from 'playwright';

const base = process.argv[2] ?? 'http://localhost:8788';
const out = process.argv[3] ?? '.shots';
const b = await chromium.launch({ channel: 'msedge' });
const page = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
page.on('console', (m) => { if (m.type() === 'error') console.log('console.error:', m.text()); });
await page.goto(`${base}/contact`, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);

const form = page.locator('form.inquiry');
await form.screenshot({ path: `${out}/form-default-1440.png` });
console.log('ts set by script:', await page.locator('input[name=ts]').inputValue() !== '');
// Иначе сървърът отхвърля submit-а тихо като „под 3 s“ (което е и целта на ts).
const backdate = () => page.evaluate(() => { document.querySelector('input[name=ts]').value = String(Date.now() - 5000); });
await backdate();
const responses = [];
page.on('response', (r) => { if (r.url().endsWith('/api/inquiry')) responses.push(r.status()); });

// Грешки по поле: submit събитие без native validation (както би дошло от сървъра).
await page.fill('[name=name]', 'A');
await page.fill('[name=email]', 'not-an-email');
await page.fill('[name=message]', 'кратко');
// Реален клик: с JS формата е noValidate и сървърът връща грешките по поле.
await page.click('form.inquiry button[type=submit]');
await page.waitForSelector('.error:not([hidden])', { timeout: 10000 });
console.log('banner visible with field errors (should be false):', await page.locator('.form-status').isVisible());
const errors = await page.locator('.error:not([hidden])').evaluateAll((els) => els.map((e) => e.id.replace(/^inquiry-full-|-error$/g, '') + ': ' + e.textContent));
console.log('errors shown:', errors);
console.log('aria-invalid count:', await page.locator('[aria-invalid="true"]').count());
console.log('focused:', await page.evaluate(() => document.activeElement?.getAttribute('name')));
await form.screenshot({ path: `${out}/form-error-1440.png` });

// Успех (mock)
await page.fill('[name=name]', 'Тест Тестов');
await page.fill('[name=company]', 'Тест ЕООД');
await page.fill('[name=email]', 'test@example.com');
await page.fill('[name=phone]', '+359 877 000 000');
await page.selectOption('[name=type]', 'eu');
await page.fill('[name=message]', 'Пробно запитване от Playwright, достатъчно дълго.');
await page.check('[name=consent]');
await backdate();
await page.click('form.inquiry button[type=submit]');
await page.waitForSelector('.form-success', { timeout: 10000 });
console.log('api responses:', responses.join(', '));
console.log('success text:', await page.locator('.form-success').textContent());
console.log('focused after success:', await page.evaluate(() => document.activeElement?.className));
await page.locator('#inquiry').screenshot({ path: `${out}/form-success-1440.png` });

// Мобилен default
const m = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await m.goto(`${base}/contact`, { waitUntil: 'networkidle' });
await m.locator('form.inquiry').screenshot({ path: `${out}/form-default-390.png` });
console.log('390 input height:', await m.locator('[name=name]').evaluate((e) => Math.round(e.getBoundingClientRect().height)));
console.log('honeypot offscreen:', await m.locator('[name=website]').evaluate((e) => e.getBoundingClientRect().right < 0));
await b.close();

// Тест на формите срещу `npm run dev:functions` с INQUIRY_MOCK=1 в .dev.vars (нищо не се
// изпраща). Пускане: npm run build && npm run dev:functions, после npm run test:form [base] [/en].
// PW_CHANNEL=msedge, ако Playwright няма собствен Chromium.
import { chromium } from 'playwright';
const base = process.argv[2] || 'http://localhost:8788';
const lang = process.argv[3] || '';
const b = await chromium.launch(process.env.PW_CHANNEL ? { channel: process.env.PW_CHANNEL } : {});
const p = await b.newPage();
const errs = []; p.on('pageerror', e => errs.push(String(e))); p.on('console', m => m.type()==='error' && errs.push(m.text()));
// Contact form
await p.goto(`${base}${lang}/contact?service=crm`);
console.log('prefill', await p.$eval('select[name=service]', s => s.value));
await p.click('form.ps-inquiry button[type=submit]');
console.log('client errors', await p.$$eval('.ps-field-err', a => a.map(x => x.dataset.for + ':' + x.textContent)));
await p.waitForTimeout(3100);
await p.fill('input[name=name]', 'Иван Петров');
await p.fill('input[name=email]', 'ivan@example.com');
await p.fill('input[name=phone]', '0888 123 456');
await p.fill('textarea[name=message]', 'Искаме складът и магазинът да са свързани.');
await Promise.all([p.waitForURL(/contact\/sent/), p.click('form.ps-inquiry button[type=submit]')]);
console.log('contact ->', p.url());
// EU check
await p.goto(`${base}${lang}/eu-funding`);
const visible = async () => p.$$eval('[data-step]', a => a.filter(x => !x.hidden).map(x => x.dataset.step));
console.log('visible steps', await visible());
await p.click('[data-next]');
console.log('err1', await p.$eval('[data-err]', e => e.hidden ? '' : e.textContent));
await p.check('input[name=registered][value="lt1"]');
console.log('note lt1 shown', await p.$eval('[data-show-if="registered=lt1"]', e => !e.hidden));
await p.click('[data-next]');
await p.selectOption('select[name=staff]', 'lt10'); await p.selectOption('select[name=revenue]', 'lt100k');
await p.click('[data-next]');
await p.fill('input[name=company]', 'Пример ЕООД'); await p.fill('input[name=eik]', '123'); await p.fill('input[name=city]', 'Варна'); await p.fill('input[name=activity]', 'мебели');
await p.click('[data-next]');
console.log('eik err', await p.$eval('[data-err]', e => e.textContent));
await p.fill('input[name=eik]', '123456789'); await p.click('[data-next]'); 
await p.check('input[name=wants][value=soft]'); await p.check('input[name=wants][value=green]');
await p.fill('textarea[name=description]', 'Искаме една система за всичко.');
await p.selectOption('select[name=budget]', '50-150k'); await p.check('input[name=cofin][value=yes]'); await p.check('input[name=debts][value=no]');
await p.click('[data-next]');
console.log('step', await visible());
await p.fill('input[name=name]', 'Иван Петров'); await p.fill('input[name=email]', 'ivan@example.com'); await p.fill('input[name=phone]', '0888123456');
await p.check('input[name=consentPartner]'); await p.check('input[name=consentPrivacy]');
await p.click('[data-submit]');
await p.waitForSelector('[data-eu-done]:not([hidden])', { timeout: 8000 });
console.log('done', (await p.$eval('[data-eu-done]', e => e.innerText)).replace(/\n+/g,' | '));
console.log('errors', errs);
await b.close();

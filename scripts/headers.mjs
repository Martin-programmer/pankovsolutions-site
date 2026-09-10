import { readFileSync, writeFileSync } from 'node:fs';

// Пуска се след `astro build`: подставя UMAMI_URL в dist/_headers (шаблонът е public/_headers)
// и слага X-Robots-Tag: noindex на preview деплойте (WORKERS_CI_BRANCH / CF_PAGES_BRANCH ≠ main).
const path = 'dist/_headers';
let text = readFileSync(path, 'utf-8');

const umami = (process.env.UMAMI_URL ?? '').trim().replace(/\/+$/, '');
// Umami Cloud зарежда скрипта от cloud.umami.is, но праща данните към gateway.umami.is -
// connect-src трябва да допуска и двата, иначе CSP блокира събитията.
const umamiConnect = umami ? (umami.includes('umami.is') ? `${umami} https://gateway.umami.is` : umami) : '';
text = text.replace(/connect-src([^;]*)\s\{\{UMAMI_URL\}\}/, (m, rest) => `connect-src${rest}${umamiConnect ? ` ${umamiConnect}` : ''}`);
text = text.replace(/\s*\{\{UMAMI_URL\}\}/g, umami ? ` ${umami}` : '');

const branch = process.env.WORKERS_CI_BRANCH ?? process.env.CF_PAGES_BRANCH;

// Build-time променливите (Worker → Settings → Build → Variables). В CI без TURNSTILE_SITE_KEY
// формата се build-ва без виджет, а сървърът с TURNSTILE_SECRET отхвърля всяко запитване -
// затова там това е грешка, не предупреждение. Локално е само бележка.
const siteKey = (process.env.TURNSTILE_SITE_KEY ?? '').trim();
const inCi = Boolean(branch);
console.log(`[build] TURNSTILE_SITE_KEY: ${siteKey ? 'set' : 'MISSING'} · UMAMI_URL: ${umami || 'none'} · UMAMI_WEBSITE_ID: ${process.env.UMAMI_WEBSITE_ID ? 'set' : 'none'}`);
if (inCi && !siteKey) {
  console.error('[build] TURNSTILE_SITE_KEY липсва в Build → Variables (Worker → Settings → Build). Без него формата няма виджет и всяко запитване се отхвърля. Добави го и Retry deployment.');
  process.exit(1);
}
if (branch && branch !== 'main') {
  text = text.replace(/^\/\*\n/m, '/*\n  X-Robots-Tag: noindex\n');
}

writeFileSync(path, text);
console.log(`[headers] dist/_headers written (umami: ${umami || 'none'}${branch ? `, branch: ${branch}` : ''})`);

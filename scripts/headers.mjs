import { readFileSync, writeFileSync } from 'node:fs';

// Пуска се след `astro build`: подставя UMAMI_URL в dist/_headers (шаблонът е public/_headers)
// и слага X-Robots-Tag: noindex на preview деплойте (CF_PAGES_BRANCH ≠ main).
const path = 'dist/_headers';
let text = readFileSync(path, 'utf-8');

const umami = (process.env.UMAMI_URL ?? '').trim().replace(/\/+$/, '');
text = text.replace(/\s*\{\{UMAMI_URL\}\}/g, umami ? ` ${umami}` : '');

const branch = process.env.CF_PAGES_BRANCH;
if (branch && branch !== 'main') {
  text = text.replace(/^\/\*\n/m, '/*\n  X-Robots-Tag: noindex\n');
}

writeFileSync(path, text);
console.log(`[headers] dist/_headers written (umami: ${umami || 'none'}${branch ? `, branch: ${branch}` : ''})`);

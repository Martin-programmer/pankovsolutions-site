import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

// npm run audit:js — JS на всяка страница (gzip), бюджет ≤ 60 KB (CLAUDE.md §Правила 7).
// Брои външните <script src> от dist/ (Astro ги емитва като файлове) и inline скриптовете,
// без JSON-LD. Exit 1 при надвишен бюджет.
const BUDGET = 60 * 1024;
const dist = 'dist';

const htmlFiles = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p);
    else if (name.endsWith('.html')) htmlFiles.push(p);
  }
})(dist);

const gz = new Map();
const sizeOf = (file) => {
  if (!gz.has(file)) gz.set(file, gzipSync(readFileSync(file)).length);
  return gz.get(file);
};

let over = 0;
const rows = [];
for (const file of htmlFiles.sort()) {
  const html = readFileSync(file, 'utf-8');
  const route = '/' + relative(dist, file).replace(/\\/g, '/').replace(/index\.html$/, '').replace(/\/$/, '');
  let total = 0;
  const parts = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1];
    if (/type="application\/ld\+json"/.test(attrs)) continue;
    const src = attrs.match(/\bsrc="([^"]+)"/)?.[1];
    if (src && src.startsWith('/')) {
      const bytes = sizeOf(join(dist, src));
      total += bytes;
      parts.push(`${src.split('/').pop()} ${bytes}`);
    } else if (src) {
      parts.push(`external: ${src}`);
    } else if (m[2].trim()) {
      const bytes = gzipSync(m[2]).length;
      total += bytes;
      parts.push(`inline ${bytes}`);
    }
  }
  if (total > BUDGET) over++;
  rows.push({ route: route || '/', kb: (total / 1024).toFixed(1), parts: parts.join(', ') || '—' });
}

const w = Math.max(...rows.map((r) => r.route.length));
console.log(`${'route'.padEnd(w)}  gzip KB  scripts`);
for (const r of rows) console.log(`${r.route.padEnd(w)}  ${r.kb.padStart(7)}  ${r.parts}`);
console.log(`\nbudget ${BUDGET / 1024} KB gzip — ${over === 0 ? 'всички страници са в бюджета' : `${over} над бюджета`}`);
process.exit(over ? 1 : 0);

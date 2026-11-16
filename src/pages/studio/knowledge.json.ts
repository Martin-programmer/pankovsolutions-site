import type { APIRoute } from 'astro';
import { readFileSync } from 'node:fs';
import { PAGES } from '../../data/pages';
import { company } from '../../data/company';

// Знанието на студиото за реклами и постове: всичко важно от страниците на услугите и проектите
// (заглавие, подзаглавие, факти, цени, цитати, истински скрийншоти). Генерира се при build от
// src/design/bg/*.html, така че студиото винаги вижда същото, което е на сайта.
// Съдържанието е публично (същото е на сайта), затова файлът е статичен.

const clean = (s: string) =>
  s
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const all = (re: RegExp, s: string) => [...s.matchAll(re)];

function extract(html: string) {
  const h1 = clean(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)?.[1] ?? '');
  const afterH1 = html.split(/<\/h1>/)[1] ?? '';
  const lead = clean(afterH1.match(/<p[^>]*>([\s\S]*?)<\/p>/)?.[1] ?? '');
  const facts = all(/<dt[^>]*>([\s\S]*?)<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/g, html)
    .map((m) => ({ label: clean(m[1]), value: clean(m[2]) }))
    .filter((f) => f.label && f.value && f.label.length < 60)
    .slice(0, 16);
  const headings = all(/<h[23][^>]*>([\s\S]*?)<\/h[23]>/g, html)
    .map((m) => clean(m[1]))
    .filter(Boolean)
    .slice(0, 40);
  const quotes = all(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>(?:\s*<figcaption[^>]*>([\s\S]*?)<\/figcaption>)?/g, html).map((m) => ({
    text: clean(m[1]),
    by: clean(m[2] ?? ''),
  }));
  const faq = all(/<summary[^>]*>([\s\S]*?)<span[\s\S]*?<\/summary>\s*<p[^>]*>([\s\S]*?)<\/p>/g, html).map((m) => ({
    q: clean(m[1]),
    a: clean(m[2]),
  }));
  const images = all(/<img[^>]*src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, html)
    .map((m) => ({ src: m[1], alt: clean(m[2]) }))
    .filter((i) => i.src.startsWith('/img/') && !/logo|clients\//.test(i.src));
  const prices = (html.match(/<section aria-labelledby="ceni"[\s\S]*?<\/section>/)?.[0] ?? '')
    .split(/<\/h3>|<\/p>/)
    .map(clean)
    .filter(Boolean)
    .slice(1, 12);
  const text = clean(html.replace(/<(script|style)[\s\S]*?<\/\1>/g, ''));
  return { h1, lead, facts, headings, quotes, faq, images, prices, text: text.slice(0, 6000) };
}

export const GET: APIRoute = () => {
  const read = (key: string) => readFileSync(`src/design/bg/${key.replaceAll('/', '__')}.html`, 'utf-8');
  const pick = (kind: string) =>
    PAGES.filter((p) => p.kind === kind && !p.noindex).map((p) => ({
      key: p.key,
      url: `${company.site}/${p.key}`,
      name: p.name.bg,
      description: p.description.bg,
      ...extract(read(p.key)),
    }));
  const body = {
    generated: new Date().toISOString(),
    company: {
      brand: company.brand,
      site: company.site,
      phone: company.phoneLocal,
      email: company.contactEmail,
    },
    brand: {
      colors: { navy: '#0A2A66', blue: '#2563EB', lime: '#C6F24E', text: '#0B1B3A', muted: '#4A5872', background: '#F6F8FB' },
      fonts: { headings: 'Onest', text: 'Manrope' },
      logo: '/img/logo.png',
      logoWhite: '/img/logo-white.svg',
    },
    offer: {
      main: 'Безплатен писмен план с ориентировъчна цена до 3 работни дни, без ангажимент.',
      prices: 'Старт: от 900 €. Цялостна система: от 4 050 € (склад: от 3 150 €). По поръчка: индивидуална оферта. Цените са без ДДС. Месечната техническа поддръжка се уточнява допълнително.',
      promises: [
        'Внедряване на етапи, без да спирате работа',
        'Обучение на екипа',
        'Без месечна такса на потребител',
        'Кодът и данните са Ваши',
        '24 месеца гаранция',
        'Отговор до 1 работен ден',
      ],
    },
    services: pick('service'),
    projects: pick('project'),
  };
  return new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json; charset=utf-8' } });
};

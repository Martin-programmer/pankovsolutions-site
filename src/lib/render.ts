import { company } from '../data/company';
import { byKey, pathFor, type Locale, type PageMeta } from '../data/pages';

// HTML-ът на страниците идва от дизайна (src/design/<locale>/*.html). Тук само се подменят
// маркерите: __LOCALE__, <!--TURNSTILE-->, активният пункт в менюто, бутонът в хедъра и
// превключвателят на езика.
const files = import.meta.glob('../design/*/*.html', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
const cssFiles = import.meta.glob('../design/css/*.css', { query: '?raw', import: 'default', eager: true }) as Record<
  string,
  string
>;
import index from '../design/index.json';

const file = (locale: Locale, name: string) => {
  const html = files[`../design/${locale}/${name}.html`];
  if (html === undefined) throw new Error(`Missing design file: ${locale}/${name}.html`);
  return html;
};

export const fileName = (key: string) => key.replace(/\//g, '__');

export function pageCss(key: string): string {
  const css = (index.css as Record<string, string>)[key === 'contact/error' ? 'contact/sent' : key];
  return css ? (cssFiles[`../design/css/${css}.css`] ?? '') : '';
}

function turnstile(locale: Locale): string {
  const siteKey = (process.env.TURNSTILE_SITE_KEY ?? import.meta.env.TURNSTILE_SITE_KEY ?? '') as string;
  if (!siteKey) return '';
  return `<div class="cf-turnstile" data-sitekey="${siteKey}" data-language="${locale}" data-size="flexible"></div>`;
}

export function hasTurnstile(): boolean {
  return Boolean(process.env.TURNSTILE_SITE_KEY ?? import.meta.env.TURNSTILE_SITE_KEY);
}

export function pageHtml(key: string, locale: Locale): string {
  return file(locale, fileName(key))
    .replaceAll('__LOCALE__', locale)
    .replaceAll('<!--TURNSTILE-->', turnstile(locale));
}

const ACTIVE_STYLE =
  'padding: 10px 14px; color: #0A2A66; text-decoration: none; font-weight: 600; font-size: 16px; box-shadow: inset 0 -2px 0 #0A2A66;';
const NORMAL_STYLE = 'padding: 10px 14px; color: #0B1B3A; text-decoration: none; font-weight: 500; font-size: 16px;';

function activeSection(key: string): string | null {
  if (key.startsWith('services')) return 'services';
  if (key.startsWith('projects')) return 'projects';
  if (key === 'about' || key === 'contact' || key === 'eu-funding') return key;
  return null;
}

function ctaFor(key: string, locale: Locale): string {
  const contact = pathFor('contact', locale);
  if (key === 'home') return '#kontakti';
  if (key === 'contact') return '#forma';
  if (key.startsWith('services/')) return `${contact}?service=${key.slice('services/'.length)}#forma`;
  return `${contact}#forma`;
}

const PROJECTS_PUBLISHED = '2026-11-11';

export function headerHtml(key: string, locale: Locale): string {
  let html = file(locale, '_header');
  const section = activeSection(key);
  if (section) {
    const href = pathFor(section, locale);
    html = html.replace(
      `<a href="${href}" style="${NORMAL_STYLE}">`,
      `<a href="${href}" aria-current="page" style="${ACTIVE_STYLE}">`,
    );
  }
  const other: Locale = locale === 'bg' ? 'en' : 'bg';
  const altKey = byKey(key) ? key : 'home';
  return html
    .replaceAll('__CTA__', ctaFor(key, locale))
    .replaceAll('__ALT_URL__', pathFor(altKey, other))
    .replaceAll('__ALT_LANG__', other)
    .replaceAll('__ALT_SHORT__', other === 'en' ? 'EN' : 'БГ')
    .replaceAll('__ALT_NAME__', other === 'en' ? 'English' : 'Български');
}

export function footerHtml(locale: Locale): string {
  return file(locale, '_footer');
}

// ---- JSON-LD ---------------------------------------------------------------------------
const site = company.site;
const abs = (p: string) => (p.startsWith('http') ? p : site + (p === '/' ? '' : p));

export function organization(locale: Locale) {
  return {
    '@type': 'ProfessionalService',
    '@id': `${site}/#organization`,
    name: company.brand,
    legalName: locale === 'bg' ? company.name : company.nameEn,
    url: site,
    logo: `${site}/img/logo.png`,
    image: `${site}/og/index.png`,
    email: company.contactEmail,
    telephone: company.phone,
    vatID: company.vat,
    taxID: company.eik,
    founder: { '@type': 'Person', name: locale === 'bg' ? company.founder : company.founderEn },
    address: {
      '@type': 'PostalAddress',
      streetAddress: locale === 'bg' ? company.street : company.streetEn,
      addressLocality: locale === 'bg' ? company.city : company.cityEn,
      postalCode: company.postalCode,
      addressCountry: 'BG',
    },
    areaServed: [{ '@type': 'Country', name: locale === 'bg' ? 'България' : 'Bulgaria' }, 'EU'],
    knowsLanguage: ['bg', 'en'],
    priceRange: '$$',
  };
}

function breadcrumbs(meta: PageMeta, locale: Locale) {
  const items: { name: string; url: string }[] = [{ name: byKey('home')!.name[locale], url: abs(pathFor('home', locale)) }];
  const parts = meta.key.split('/');
  if (parts.length > 1) {
    const parent = byKey(parts[0]);
    if (parent) items.push({ name: parent.name[locale], url: abs(pathFor(parent.key, locale)) });
  }
  items.push({ name: meta.name[locale], url: abs(pathFor(meta.key, locale)) });
  return {
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: it.url })),
  };
}

const strip = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

// FAQ от разгъващите се въпроси (<details><summary>въпрос…</summary><p>отговор</p></details>).
export function faqFrom(html: string) {
  const out: { q: string; a: string }[] = [];
  for (const m of html.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/g)) {
    const q = strip(m[1].replace(/<span class="ps-plus"[\s\S]*?<\/span>/, ''));
    const a = strip(m[2]);
    if (q && a) out.push({ q, a });
  }
  return out;
}

export function jsonLd(meta: PageMeta, locale: Locale, html: string) {
  const url = abs(pathFor(meta.key, locale));
  const graph: Record<string, unknown>[] = [organization(locale)];
  if (meta.kind === 'home') {
    graph.push({
      '@type': 'WebSite',
      '@id': `${site}/#website`,
      url: site,
      name: company.brand,
      inLanguage: ['bg', 'en'],
      publisher: { '@id': `${site}/#organization` },
    });
  } else if (meta.kind !== 'system') {
    graph.push(breadcrumbs(meta, locale));
  }
  graph.push({
    '@type': meta.kind === 'project' ? 'Article' : 'WebPage',
    '@id': `${url}#webpage`,
    url,
    name: meta.title[locale],
    description: meta.description[locale],
    inLanguage: locale,
    isPartOf: { '@id': `${site}/#website` },
    ...(meta.kind === 'project'
      ? {
          headline: meta.title[locale].replace(/ – Pankov Solutions$/, ''),
          author: { '@id': `${site}/#organization` },
          publisher: { '@id': `${site}/#organization` },
          image: `${site}/og/${locale === 'en' ? 'en/' : ''}${meta.key}.png`,
          // Датата, на която описанията на проектите излязоха на новия сайт.
          datePublished: PROJECTS_PUBLISHED,
        }
      : {}),
  });
  if (meta.kind === 'service') {
    graph.push({
      '@type': 'Service',
      name: meta.name[locale],
      serviceType: meta.name[locale],
      description: meta.description[locale],
      url,
      provider: { '@id': `${site}/#organization` },
      areaServed: { '@type': 'Country', name: locale === 'bg' ? 'България' : 'Bulgaria' },
    });
  }
  const faq = faqFrom(html);
  if (faq.length >= 2) {
    graph.push({
      '@type': 'FAQPage',
      mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
    });
  }
  return { '@context': 'https://schema.org', '@graph': graph };
}

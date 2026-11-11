import type { APIRoute } from 'astro';
import { PAGES, byKey, type Locale } from '../../data/pages';
import { renderOg } from '../../lib/og';

// /og/<ключ>.png (bg) и /og/en/<ключ>.png; началната страница е /og/index.png.
export function getStaticPaths() {
  return PAGES.filter((p) => !p.noindex).flatMap((meta) =>
    (['bg', 'en'] as Locale[]).map((locale) => {
      const k = meta.key === 'home' ? 'index' : meta.key;
      return { params: { slug: locale === 'en' ? `en/${k}` : k }, props: { key: meta.key, locale } };
    }),
  );
}

export const GET: APIRoute = async ({ props }) => {
  const { key, locale } = props as { key: string; locale: Locale };
  const meta = byKey(key)!;
  const title = meta.kind === 'home'
    ? (locale === 'bg' ? 'Софтуер за бизнеса. Решения по мярка.' : 'Software for business. Built to fit.')
    : meta.title[locale].replace(/ – Pankov Solutions$/, '');
  const parent = key.includes('/') ? byKey(key.split('/')[0])?.name[locale] : undefined;
  const kicker = parent ?? (meta.kind === 'home' ? 'Pankov Solutions' : meta.name[locale]);
  const png = await renderOg(title, kicker === title ? 'Pankov Solutions' : kicker);
  return new Response(png as unknown as BodyInit, { headers: { 'content-type': 'image/png' } });
};

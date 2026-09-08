// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Стек по CLAUDE.md: Astro 5 static, Tailwind v4, вграден i18n routing.
// bg е default без префикс; en под /en/. Slug-овете са латински и еднакви за двата езика.
export default defineConfig({
  site: 'https://pankovsolutions.com',
  output: 'static',
  trailingSlash: 'never',
  i18n: {
    defaultLocale: 'bg',
    locales: ['bg', 'en'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      i18n: { defaultLocale: 'bg', locales: { bg: 'bg-BG', en: 'en-US' } },
      // Вътрешните/noindex страници не влизат в sitemap-а.
      filter: (page) =>
        !/\/(styleguide|contact\/sent|contact\/error|404)(\/|$)/.test(page) && !page.includes('/og/'),
    }),
  ],
  // Целият CSS inline в HTML-а: една заявка по-малко преди първия рендер на бавна мрежа
  // (Lighthouse mobile FCP/LCP); style-src в CSP и без това е с 'unsafe-inline'.
  build: { inlineStylesheets: 'always' },
  vite: {
    plugins: [tailwindcss()],
    // Скриптовете винаги като външни файлове — CSP script-src без 'unsafe-inline' (public/_headers).
    build: { assetsInlineLimit: 0 },
  },
});

// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Astro 5 static. Страниците се генерират от src/pages/[...path].astro за двата езика:
// bg без префикс, en под /en/. Slug-овете са английски и еднакви за двата езика.
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
      filter: (page) => !/\/(contact\/sent|contact\/error|404)(\/|$)/.test(page) && !page.includes('/og/'),
    }),
  ],
  // Целият CSS inline в HTML-а: една заявка по-малко преди първия рендер на бавна мрежа
  // (Lighthouse mobile FCP/LCP); style-src в CSP и без това е с 'unsafe-inline'.
  // format 'file': /services → services.html, без пренасочване към /services/ в Cloudflare.
  build: { inlineStylesheets: 'always', format: 'file' },
  vite: {
    // Скриптовете винаги като външни файлове — CSP script-src без 'unsafe-inline' (public/_headers).
    build: { assetsInlineLimit: 0 },
  },
});

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
      // /styleguide е вътрешна и noindex — не влиза в sitemap-а.
      filter: (page) => !page.includes('/styleguide'),
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});

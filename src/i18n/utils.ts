import { getRelativeLocaleUrl } from 'astro:i18n';
import { defaultLocale, ui, type Locale, type UiKey } from './ui';

export type { Locale } from './ui';

export function useTranslations(locale: Locale) {
  return (key: UiKey): string => ui[locale][key] ?? ui[defaultLocale][key];
}

// Път към страница в даден език: bg е без префикс, en е под /en/ (astro.config.mjs).
export function localeUrl(locale: Locale, path: string): string {
  return getRelativeLocaleUrl(locale, path);
}

// Същата страница на другия език — за превключвателя BG/EN и за hreflang.
export function alternateUrl(current: Locale, pathname: string): { locale: Locale; href: string } {
  const other: Locale = current === 'bg' ? 'en' : 'bg';
  const bare = pathname.replace(/^\/en(?=\/|$)/, '') || '/';
  return { locale: other, href: getRelativeLocaleUrl(other, bare) };
}

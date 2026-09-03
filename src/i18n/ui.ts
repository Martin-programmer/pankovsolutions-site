// Всички низове за UI (навигация, бутони, етикети). Съдържанието на страниците НЕ е тук —
// то идва от content/<locale>/. Правила за EN: COPY.md §EN версия и забраненият EN списък.
export const locales = ['bg', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'bg';

// Видимият етикет на превключвателя и пълното име за accessible name.
export const languages: Record<Locale, { label: string; name: string }> = {
  bg: { label: 'BG', name: 'Български' },
  en: { label: 'EN', name: 'English' },
};

const bg = {
  'skip': 'Към съдържанието',
  'menu': 'Меню',
  'nav.label': 'Основна навигация',
  'nav.projects': 'Проекти',
  'nav.services': 'Услуги',
  'nav.beneficiaries': 'За бенефициенти',
  'nav.products': 'Продукти',
  'nav.about': 'За мен',
  'nav.contact': 'Контакт',
  'cta.inquiry': 'Изпратете запитване',
  'footer.company': 'Фирмени данни',
  'footer.nav': 'Навигация',
  'footer.languages': 'Езици',
  'footer.eik': 'ЕИК',
  'footer.vat': 'ДДС №',
  'footer.privacy': 'Политика за поверителност',
  'footer.accessibility': 'Достъпност',
} as const;

export type UiKey = keyof typeof bg;

const en: Record<UiKey, string> = {
  'skip': 'Skip to content',
  'menu': 'Menu',
  'nav.label': 'Main navigation',
  'nav.projects': 'Projects',
  'nav.services': 'Services',
  'nav.beneficiaries': 'For beneficiaries',
  'nav.products': 'Products',
  'nav.about': 'About me',
  'nav.contact': 'Contact',
  'cta.inquiry': 'Send an inquiry',
  'footer.company': 'Company',
  'footer.nav': 'Navigation',
  'footer.languages': 'Languages',
  'footer.eik': 'UIC',
  'footer.vat': 'VAT no.',
  'footer.privacy': 'Privacy policy',
  'footer.accessibility': 'Accessibility',
};

export const ui: Record<Locale, Record<UiKey, string>> = { bg, en };

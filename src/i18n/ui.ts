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
  // Форма (COPY.md §Микрокопи, DESIGN.md §Форма)
  'form.name': 'Име и фамилия',
  'form.email': 'Имейл',
  'form.company': 'Фирма (по избор)',
  'form.message': 'Опишете накратко',
  'form.submit': 'Изпратете запитването',
  'form.promise': 'Отговарям до 1 работен ден. Или:',
  'form.gdpr': 'Изпращайки формата, се съгласявате данните Ви да бъдат използвани само за отговор на запитването.',
  'form.honeypot': 'Оставете празно',
  // Етикети на placeholder-и (само до качване на реалните материали)
  'placeholder.screenshot': 'скрийншот',
  'placeholder.photo': 'снимка',
  'placeholder.sample': 'примерен – ще бъде заменен',
  'trust.clients': 'Клиенти',
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
  'form.name': 'Full name',
  'form.email': 'Email',
  'form.company': 'Company (optional)',
  'form.message': 'Describe it briefly',
  'form.submit': 'Send the inquiry',
  'form.promise': 'I reply within 1 business day. Or:',
  'form.gdpr': 'By sending the form you agree that your data is used only to reply to your inquiry.',
  'form.honeypot': 'Leave empty',
  'placeholder.screenshot': 'screenshot',
  'placeholder.photo': 'photo',
  'placeholder.sample': 'sample – to be replaced',
  'trust.clients': 'Clients',
};

export const ui: Record<Locale, Record<UiKey, string>> = { bg, en };

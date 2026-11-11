// Текстовете, които сървърът връща към формите и слага в имейлите. bg и en.
export type Locale = 'bg' | 'en';

export const isLocale = (v: unknown): v is Locale => v === 'bg' || v === 'en';

export const SERVICES: Record<string, { bg: string; en: string }> = {
  erp: { bg: 'ERP система', en: 'ERP system' },
  crm: { bg: 'CRM система', en: 'CRM system' },
  'warehouse-management': { bg: 'Складова система (WMS)', en: 'Warehouse management (WMS)' },
  'business-intelligence': { bg: 'Бизнес анализи и отчети', en: 'Business intelligence and reporting' },
  'learning-platform': { bg: 'Платформа за обучение', en: 'Learning platform' },
  'document-cloud': { bg: 'Облак за документи', en: 'Document cloud' },
  'online-stores': { bg: 'Онлайн магазини', en: 'Online stores' },
  'corporate-websites': { bg: 'Корпоративни сайтове', en: 'Corporate websites' },
  'web-applications': { bg: 'Уеб приложения и MVP', en: 'Web applications and MVPs' },
  'desktop-and-mobile-apps': { bg: 'Десктоп и мобилни приложения', en: 'Desktop and mobile apps' },
  'legacy-modernization': { bg: 'Модернизация на стари системи', en: 'Legacy system modernization' },
  integrations: { bg: 'Интеграции', en: 'Integrations' },
  'process-automation': { bg: 'Автоматизация на процеси', en: 'Process automation' },
  'business-analysis': { bg: 'Бизнес анализ', en: 'Business analysis' },
  'ux-ui-design': { bg: 'UX/UI дизайн', en: 'UX/UI design' },
  'audit-and-testing': { bg: 'Одит и тестване', en: 'Audit and testing' },
  'servers-and-hosting': { bg: 'Сървъри и хостинг', en: 'Servers and hosting' },
  'network-security': { bg: 'Защита на мрежата', en: 'Network security' },
  backups: { bg: 'Резервни копия', en: 'Backups' },
  'support-and-monitoring': { bg: 'Поддръжка и наблюдение', en: 'Support and monitoring' },
  'eu-funding': { bg: 'Европейско финансиране', en: 'EU funding' },
  other: { bg: 'Не съм сигурен / друго', en: 'Not sure / other' },
};

const M = {
  bg: {
    'error.generic': 'Нещо се обърка при изпращането. Опитайте отново или ни се обадете на 0877 944 224.',
    'error.rate': 'Изпратихте няколко запитвания за кратко време. Опитайте отново след час или ни се обадете на 0877 944 224.',
    'error.turnstile': 'Потвърдете, че не сте робот, и изпратете отново.',
    'error.check': 'Проверете маркираните полета.',
    'field.name': 'Въведете име (поне 2 букви).',
    'field.company': 'Името на фирмата е твърде дълго.',
    'field.email': 'Въведете валиден имейл, например ivan@firma.bg.',
    'field.phone': 'Въведете валиден телефон, например 0888 123 456.',
    'field.message': 'Напишете поне няколко думи (минимум 10 знака).',
    'field.service': 'Изберете услуга от списъка.',
    'field.registered': 'Изберете откога съществува фирмата.',
    'field.staff': 'Изберете брой служители.',
    'field.revenue': 'Изберете размер на приходите.',
    'field.eik': 'ЕИК трябва да е 9 или 13 цифри.',
    'field.city': 'Въведете населено място.',
    'field.activity': 'Опишете с какво се занимава фирмата.',
    'field.wants': 'Изберете поне едно нещо, което искате да финансирате.',
    'field.description': 'Опишете идеята с поне няколко думи.',
    'field.budget': 'Изберете ориентировъчен бюджет.',
    'field.cofin': 'Отговорете дали можете да осигурите собствено участие.',
    'field.debts': 'Отговорете дали фирмата има просрочени задължения.',
    'field.consentPartner': 'Потвърдете, че сте запознати с предоставянето на данните на партньора ни.',
    'field.consentPrivacy': 'Потвърдете, че сте се запознали с Политиката за поверителност.',
  },
  en: {
    'error.generic': 'Something went wrong while sending. Please try again or call us on +359 877 944 224.',
    'error.rate': 'You have sent several enquiries in a short time. Please try again in an hour or call us on +359 877 944 224.',
    'error.turnstile': 'Please confirm you are not a robot and send again.',
    'error.check': 'Please check the highlighted fields.',
    'field.name': 'Please enter your name (at least 2 letters).',
    'field.company': 'The company name is too long.',
    'field.email': 'Please enter a valid email, e.g. john@company.com.',
    'field.phone': 'Please enter a valid phone number, e.g. +359 888 123 456.',
    'field.message': 'Please write at least a few words (10 characters minimum).',
    'field.service': 'Please choose a service from the list.',
    'field.registered': 'Please choose how long the company has existed.',
    'field.staff': 'Please choose the number of employees.',
    'field.revenue': 'Please choose the revenue range.',
    'field.eik': 'The company ID (EIK) must be 9 or 13 digits.',
    'field.city': 'Please enter a town or city.',
    'field.activity': 'Please describe what the company does.',
    'field.wants': 'Please choose at least one thing you want to fund.',
    'field.description': 'Please describe the idea in a few words.',
    'field.budget': 'Please choose an approximate budget.',
    'field.cofin': 'Please answer whether you can co-finance the project.',
    'field.debts': 'Please answer whether the company has overdue liabilities.',
    'field.consentPartner': 'Please confirm that you understand the data is shared with our partner.',
    'field.consentPrivacy': 'Please confirm you have read the Privacy Policy.',
  },
} as const;

export type MsgKey = keyof (typeof M)['bg'];

export const msg = (locale: Locale, key: MsgKey): string => M[locale][key];

export const fieldMsg = (locale: Locale, field: string): string =>
  (M[locale] as Record<string, string>)[`field.${field}`] ?? M[locale]['error.check'];

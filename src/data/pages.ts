// Регистър на страниците: ключ → заглавие и описание на двата езика + тип за JSON-LD.
// Тялото на всяка страница е в src/design/<locale>/<ключ с / → __>.html (генерирано от дизайна).
// Пътят е /<ключ> за bg и /en/<ключ> за en; началната е / и /en.
export type Locale = 'bg' | 'en';
export type Kind = 'home' | 'service' | 'services' | 'project' | 'projects' | 'page' | 'legal' | 'system';

export interface PageMeta {
  key: string;
  kind: Kind;
  title: Record<Locale, string>;
  description: Record<Locale, string>;
  // Кратко име за breadcrumbs и Service JSON-LD.
  name: Record<Locale, string>;
  noindex?: boolean;
}

const B = ' – Pankov Solutions';

const svc = (
  key: string,
  name: [string, string],
  title: [string, string],
  description: [string, string],
): PageMeta => ({
  key: `services/${key}`,
  kind: 'service',
  name: { bg: name[0], en: name[1] },
  title: { bg: title[0] + B, en: title[1] + B },
  description: { bg: description[0], en: description[1] },
});

const prj = (
  key: string,
  name: [string, string],
  title: [string, string],
  description: [string, string],
): PageMeta => ({
  key: `projects/${key}`,
  kind: 'project',
  name: { bg: name[0], en: name[1] },
  title: { bg: title[0] + B, en: title[1] + B },
  description: { bg: description[0], en: description[1] },
});

export const PAGES: PageMeta[] = [
  {
    key: 'home',
    kind: 'home',
    name: { bg: 'Начало', en: 'Home' },
    title: {
      bg: 'Pankov Solutions – бизнес системи, онлайн магазини и софтуер по поръчка',
      en: 'Pankov Solutions – business systems, online stores and custom software',
    },
    description: {
      bg: 'ERP и CRM системи на Odoo, онлайн магазини, уеб приложения и IT инфраструктура за малки и средни фирми. Безплатна първа консултация.',
      en: 'Odoo ERP and CRM systems, online stores, web applications and IT infrastructure for small and medium-sized businesses. Free first consultation.',
    },
  },
  {
    key: 'services',
    kind: 'services',
    name: { bg: 'Услуги', en: 'Services' },
    title: { bg: 'Услуги: бизнес системи, магазини, софтуер и инфраструктура' + B, en: 'Services: business systems, stores, software and infrastructure' + B },
    description: {
      bg: 'Всичко, от което фирмата Ви има нужда, за да работи дигитално: ERP, CRM, складова система, онлайн магазини, уеб приложения, интеграции, сървъри и сигурност.',
      en: 'Everything your company needs to work digitally: ERP, CRM, warehouse management, online stores, web apps, integrations, servers and security.',
    },
  },
  svc('erp', ['ERP система', 'ERP system'], ['ERP система на Odoo', 'Odoo ERP system'], [
    'Продажби, покупки, склад, производство и фактури в една система. Внедряваме и доработваме Odoo ERP според начина, по който работи фирмата Ви.',
    'Sales, purchasing, inventory, manufacturing and invoicing in one system. We implement and tailor Odoo ERP to the way your company works.',
  ]),
  svc('crm', ['CRM система', 'CRM system'], ['CRM система на Odoo', 'Odoo CRM system'], [
    'Всички запитвания, клиенти, сделки и задачи на едно място, с етапи и напомняния. CRM на Odoo, настроена според начина, по който продавате.',
    'Every enquiry, customer, deal and task in one place, with stages and reminders. Odoo CRM set up around the way you sell.',
  ]),
  svc('warehouse-management', ['Складова система (WMS)', 'Warehouse management (WMS)'], ['Складова система (WMS) на Odoo', 'Odoo warehouse management system (WMS)'], [
    'Приемане, местоположения, инвентаризация и експедиция с баркод скенер. Складова система на Odoo, свързана с продажбите и покупките.',
    'Receiving, locations, stock counts and shipping with barcode scanners. An Odoo warehouse system connected to sales and purchasing.',
  ]),
  svc('business-intelligence', ['Бизнес анализи и отчети', 'Business intelligence and reporting'], ['Бизнес анализи и отчети с Metabase', 'Business intelligence and reporting with Metabase'], [
    'Табла с ключовите числа на фирмата, които се обновяват сами. Свързваме Metabase с ERP, CRM и онлайн магазина – без отчети в Excel.',
    'Dashboards with your key numbers that update themselves. We connect Metabase to your ERP, CRM and online store – no more Excel reports.',
  ]),
  svc('learning-platform', ['Платформа за обучение', 'Learning platform'], ['Платформа за обучение на Moodle', 'Moodle learning platform'], [
    'Онлайн академия за екипа или клиентите Ви: курсове, тестове, сертификати и проследяване на напредъка. Изградена на Moodle, с Вашия бранд.',
    'An online academy for your team or customers: courses, quizzes, certificates and progress tracking. Built on Moodle with your branding.',
  ]),
  svc('document-cloud', ['Облак за документи', 'Document cloud'], ['Облак за документи с Nextcloud', 'Document cloud with Nextcloud'], [
    'Споделяне, синхронизация и права на достъп като в Google Drive, но на Ваш сървър. Собствен облак за файловете на фирмата с Nextcloud.',
    'File sharing, sync and access rights like Google Drive, but on your own server. A private cloud for company files with Nextcloud.',
  ]),
  svc('online-stores', ['Онлайн магазини', 'Online stores'], ['Онлайн магазини с WooCommerce', 'WooCommerce online stores'], [
    'WooCommerce магазини с онлайн плащане, куриери, промоции и удобен админ панел. Нови магазини и пренос от други платформи.',
    'WooCommerce stores with online payments, couriers, promotions and an easy admin panel. New stores and migrations from other platforms.',
  ]),
  svc('corporate-websites', ['Корпоративни сайтове', 'Corporate websites'], ['Корпоративни сайтове', 'Corporate websites'], [
    'Бърз, подреден и лесен за поддръжка фирмен сайт на един или няколко езика – на WordPress или React, според нуждите Ви.',
    'A fast, well-structured and easy-to-maintain company website in one or several languages – on WordPress or React, depending on your needs.',
  ]),
  svc('web-applications', ['Уеб приложения и MVP', 'Web applications and MVPs'], ['Уеб приложения и MVP', 'Web applications and MVPs'], [
    'Клиентски портали, вътрешни системи и първи версии на нови продукти, направени точно за Вашия процес. Работят в браузъра и на телефона.',
    'Customer portals, internal systems and first versions of new products, built around your process. They run in the browser and on phones.',
  ]),
  svc('desktop-and-mobile-apps', ['Десктоп и мобилни приложения', 'Desktop and mobile apps'], ['Десктоп и мобилни приложения', 'Desktop and mobile applications'], [
    'Приложения за Windows и Android – каси, приложения за обекти и вътрешни инструменти, свързани с фискални устройства, принтери и скенери.',
    'Windows and Android applications – point of sale, on-site apps and internal tools connected to fiscal devices, printers and scanners.',
  ]),
  svc('legacy-modernization', ['Модернизация на стари системи', 'Legacy system modernization'], ['Модернизация на стари системи', 'Legacy system modernization'], [
    'Пренасяме стара програма на съвременна основа на стъпки, без да спираме работата и без да губим данните и историята.',
    'We move an old application onto a modern foundation step by step, without stopping work and without losing data or history.',
  ]),
  svc('integrations', ['Интеграции', 'Integrations'], ['Интеграции между системи', 'System integrations'], [
    'Свързваме онлайн магазина, ERP системата, куриерите, плащанията и счетоводството, така че данните минават без ръчно преписване.',
    'We connect your online store, ERP, couriers, payments and accounting so data flows without manual re-typing.',
  ]),
  svc('process-automation', ['Автоматизация на процеси', 'Process automation'], ['Автоматизация на процеси', 'Process automation'], [
    'Отчети, известия, напомняния, автоматични имейли и разпределяне на задачи, които работят на заден план и не зависят от нечия памет.',
    'Reports, notifications, reminders, automated emails and task assignment that run in the background and don’t depend on anyone’s memory.',
  ]),
  svc('business-analysis', ['Бизнес анализ', 'Business analysis'], ['Бизнес анализ на процесите', 'Business process analysis'], [
    'Разглеждаме как работите днес, къде се губи време и какво си струва да се автоматизира. Резултатът е план с приоритети и бюджет.',
    'We look at how you work today, where time is lost and what is worth automating. The result is a plan with priorities and a budget.',
  ]),
  svc('ux-ui-design', ['UX/UI дизайн', 'UX/UI design'], ['UX/UI дизайн', 'UX/UI design'], [
    'Интерфейси на приложения, портали и сайтове, които се разбират от първия път. С прототип, който пробвате, преди да се напише код.',
    'Interfaces for apps, portals and websites that make sense the first time. With a prototype you can try before any code is written.',
  ]),
  svc('audit-and-testing', ['Одит и тестване', 'Audit and testing'], ['Одит и тестване на софтуер', 'Software audit and testing'], [
    'Независима проверка на сигурността, бързината и качеството на софтуера, който използвате или поръчвате, и тестване на промените.',
    'An independent check of the security, speed and quality of the software you use or commission, plus testing of every change.',
  ]),
  svc('servers-and-hosting', ['Сървъри и хостинг', 'Servers and hosting'], ['Сървъри и хостинг', 'Servers and hosting'], [
    'Подготвяме, защитаваме и поддържаме сървърите за ERP, сайта, магазина и вътрешните системи – в облака или в офиса.',
    'We set up, secure and maintain the servers for your ERP, website, store and internal systems – in the cloud or on-premises.',
  ]),
  svc('network-security', ['Защита на мрежата', 'Network security'], ['Защита на мрежата', 'Network security'], [
    'Защитна стена, разделяне на мрежата и наблюдение за подозрителна активност с OPNsense и Wazuh, на оборудване MikroTik и Ubiquiti.',
    'Firewall, network segmentation and monitoring for suspicious activity with OPNsense and Wazuh, on MikroTik and Ubiquiti hardware.',
  ]),
  svc('backups', ['Резервни копия', 'Backups'], ['Резервни копия', 'Backups'], [
    'Автоматични резервни копия на компютрите, сървърите и системите на друго място, с проверено възстановяване.',
    'Automatic off-site backups of your computers, servers and systems, with restores that are actually tested.',
  ]),
  svc('support-and-monitoring', ['Поддръжка и наблюдение', 'Support and monitoring'], ['Поддръжка и наблюдение', 'Support and monitoring'], [
    'Следим системите, обновяваме ги и реагираме при проблем. Всяка заявка минава през портал за поддръжка с видим статус.',
    'We monitor your systems, keep them updated and respond when something breaks. Every request goes through a support portal with a visible status.',
  ]),
  {
    key: 'projects',
    kind: 'projects',
    name: { bg: 'Проекти', en: 'Projects' },
    title: { bg: 'Проекти' + B, en: 'Projects' + B },
    description: {
      bg: 'Бизнес системи, онлайн магазини и софтуер по поръчка за фирми от различни сектори: какъв беше проблемът, какво направихме и какво се промени.',
      en: 'Business systems, online stores and custom software for companies across industries: what the problem was, what we built and what changed.',
    },
  },
  prj('dushcabini', ['DushCabini', 'DushCabini'], ['Онлайн магазин с конфигуратор за Досев Импекс', 'Online store with a configurator for Dosev Impex'], [
    'Двуезичен онлайн магазин и собствен конфигуратор на паравани по поръчка с ориентировъчна цена и админ панел за цените и опциите.',
    'A bilingual online store and a custom shower-screen configurator with instant price estimates and an admin panel for prices and options.',
  ]),
  prj('ravera', ['Равера', 'Ravera'], ['CRM, архивиране и защита на мрежата за Равера', 'CRM, backups and network security for Ravera'], [
    'Три свързани системи наведнъж: CRM за продажбите, защита на офисната мрежа с единен вход и автоматично архивиране на важните данни.',
    'Three connected systems at once: a sales CRM, office network protection with single sign-on and automatic backups of all important data.',
  ]),
  prj('secret-bar', ['Secret Bar', 'Secret Bar'], ['Приложение за гостите на Secret Bar', 'Guest app for Secret Bar'], [
    'Приложение за гостите с бонус програма, колело на късмета и автоматични имейли, плюс админ панел, от който барът управлява всичко.',
    'A guest app with a loyalty programme, a wheel of fortune and automated emails, plus an admin panel the bar runs everything from.',
  ]),
  prj('domoupravitel', ['Домоуправител БГ', 'Domoupravitel BG'], ['CRM и обучения за Домоуправител БГ', 'CRM and training platform for Domoupravitel BG'], [
    'CRM, настроена за управление на етажна собственост, и онлайн академия, в която новите служители учат работата и закона в свое темпо.',
    'A CRM tailored to building management and an online academy where new staff learn the job and the law at their own pace.',
  ]),
  {
    key: 'about',
    kind: 'page',
    name: { bg: 'За нас', en: 'About us' },
    title: { bg: 'За нас' + B, en: 'About us' + B },
    description: {
      bg: 'Pankov Solutions прави бизнес системи, онлайн магазини и софтуер по поръчка за малки и средни фирми. Кои сме и как работим.',
      en: 'Pankov Solutions builds business systems, online stores and custom software for small and medium-sized companies. Who we are and how we work.',
    },
  },
  {
    key: 'contact',
    kind: 'page',
    name: { bg: 'Контакти', en: 'Contact' },
    title: { bg: 'Контакти' + B, en: 'Contact' + B },
    description: {
      bg: 'Обадете се на 0877 944 224, пишете ни или попълнете формата. Отговаряме до 1 работен ден, а първата консултация е безплатна.',
      en: 'Call +359 877 944 224, email us or fill in the form. We reply within one business day and the first consultation is free.',
    },
  },
  {
    key: 'eu-funding',
    kind: 'page',
    name: { bg: 'Финансиране от ЕС', en: 'EU funding' },
    title: { bg: 'Проверка за европейско финансиране' + B, en: 'EU funding eligibility check' + B },
    description: {
      bg: 'Проверете безплатно дали фирмата Ви може да кандидатства по европейска програма и се впишете в листа с чакащи за подходяща процедура.',
      en: 'Check for free whether your company can apply for EU funding and join the waiting list for a suitable programme.',
    },
  },
  {
    key: 'privacy',
    kind: 'legal',
    name: { bg: 'Политика за поверителност', en: 'Privacy policy' },
    title: { bg: 'Политика за поверителност' + B, en: 'Privacy policy' + B },
    description: {
      bg: 'Какви лични данни обработва Pankov Solutions, за какво, на какво основание, колко дълго и какви са Вашите права.',
      en: 'What personal data Pankov Solutions processes, why, on what legal basis, for how long, and what your rights are.',
    },
  },
  {
    key: 'cookies',
    kind: 'legal',
    name: { bg: 'Политика за бисквитки', en: 'Cookie policy' },
    title: { bg: 'Политика за бисквитки' + B, en: 'Cookie policy' + B },
    description: {
      bg: 'Какви бисквитки използва сайтът, за какво служат, колко дълго се пазят и как да промените избора си.',
      en: 'Which cookies this website uses, what they are for, how long they last and how to change your choice.',
    },
  },
  {
    key: 'terms',
    kind: 'legal',
    name: { bg: 'Общи условия', en: 'Terms of use' },
    title: { bg: 'Общи условия' + B, en: 'Terms of use' + B },
    description: {
      bg: 'Общи условия за използване на сайта pankovsolutions.com и за запитванията, изпратени през него.',
      en: 'Terms for using pankovsolutions.com and for enquiries sent through it.',
    },
  },
  {
    key: 'contact/sent',
    kind: 'system',
    noindex: true,
    name: { bg: 'Благодарим', en: 'Thank you' },
    title: { bg: 'Благодарим' + B, en: 'Thank you' + B },
    description: { bg: 'Получихме запитването Ви.', en: 'We have received your enquiry.' },
  },
  {
    key: 'contact/error',
    kind: 'system',
    noindex: true,
    name: { bg: 'Грешка при изпращане', en: 'Sending failed' },
    title: { bg: 'Запитването не беше изпратено' + B, en: 'Your enquiry was not sent' + B },
    description: { bg: 'Нещо се обърка при изпращането.', en: 'Something went wrong while sending.' },
  },
];

export const NOT_FOUND: Pick<PageMeta, 'title' | 'description'> = {
  title: { bg: 'Страницата не е намерена' + B, en: 'Page not found' + B },
  description: { bg: 'Тази страница не съществува.', en: 'This page does not exist.' },
};

export const byKey = (key: string) => PAGES.find((p) => p.key === key);

export function pathFor(key: string, locale: Locale): string {
  const bare = key === 'home' ? '' : `/${key}`;
  if (locale === 'bg') return bare || '/';
  return `/en${bare}`;
}

# CLAUDE.md — Pankov Solutions (pankovsolutions.com)

## Какво е това
Сайтът на Pankov Solutions (ЕМ ЕН ЕМ ПАРТНЪРС ООД): бизнес системи, онлайн магазини, софтуер по
поръчка и инфраструктура за малки и средни фирми. Целта на всяка страница е една: посетителят
да прати запитване, да се обади или да се впише в листа с чакащи за ЕС финансиране.

Дизайнът е направен в Claude Design (canvas артефакт „Pankov Solutions – начална страница“) и е
пренесен 1:1 в `src/design/`. Старият сайт (Source шрифтове, токени, лендинги `/f/*`, FudiAR,
`/for-beneficiaries`) е премахнат изцяло; адресите му са пренасочени в `public/_redirects`.

## Стек
- Astro 5, `output: 'static'`, `build.format: 'file'`. Без Tailwind и без content collections.
- Езици: `bg` без префикс, `en` под `/en`. Slug-овете са английски и еднакви за двата езика.
  hreflang bg/en/x-default и canonical на всяка страница (`src/layouts/Base.astro`).
- Хостинг: Cloudflare Worker със статични файлове (`wrangler.toml`, `worker/index.ts`).
- Форми: `functions/api/inquiry.ts` (запитване), `functions/api/survey.ts` (проверка за ЕС
  финансиране), `functions/api/consent.ts` (запис на съгласие за бисквитки). Общото е в
  `functions/lib.ts`, текстовете в `functions/messages.ts`, HTML имейлите в `functions/email.ts`.
- Pipeline на формите: произход → размер → timing (< 3 s) → honeypot → rate limit (KV) →
  Turnstile → Zod → Resend (известие до hello@ + автоотговор) → Telegram. Telegram е извън ЕС:
  там отива само известие без лични данни (вид услуга / номер), детайлите са само в пощата.
- Шрифтове: Onest (заглавия) и Manrope (текст), self-hosted variable WOFF2 в `public/fonts/`.
  `font-feature-settings: "locl" 0` навсякъде — така е в дизайна.
- Бисквитки и проследяване: `public/consent.js` (банер, Google Consent Mode v2, Meta). Google
  Analytics, Google Ads и Meta Pixel се зареждат само след съгласие. ID-тата са Build Variables.
- Umami (без бисквитки) остава по избор.
- Секрети само в Cloudflare env и `.dev.vars`. Никога в repo-то.

## Структура на страниците
`/` · `/services` · `/services/<slug>` (20 услуги) · `/projects` · `/projects/{dushcabini,ravera,
secret-bar,domoupravitel}` · `/about` · `/contact` · `/eu-funding` · `/privacy` · `/cookies` ·
`/terms` · `/contact/sent` · `/contact/error` · `/404`. Всички и под `/en`.

## Как се променя съдържание
- Текстът и разметката са в `src/design/<locale>/<ключ>.html` (ключ с `/` → `__`). Промяна в
  българския текст изисква същата промяна в `src/design/en/`.
- Заглавие и meta description: `src/data/pages.ts`.
- Хедър и футър: `src/design/<locale>/_header.html`, `_footer.html`. Маркерите `__CTA__`,
  `__ALT_URL__`, `__ALT_LANG__`, `__ALT_SHORT__`, `__ALT_NAME__`, `__LOCALE__`
  и `<!--TURNSTILE-->` се подменят в `src/lib/render.ts` — не ги трий.
- Цветове на марката: navy #0A2A66, синьо #2563EB, lime #C6F24E (по едно парче на композиция),
  текст #0B1B3A, приглушен #4A5872, фон #F6F8FB. Модулни ъгли „16px 16px 72px 16px“ и
  „16px 120px 16px 16px“.

## Правила
1. Не измисляй клиенти, числа, цитати и дати. Каквото не е в дизайна или от Марти — питай.
2. В текстовете „За нас“ не се споменава Плевен (адресът в правните страници е наред).
3. Не се посочва конкретна европейска програма. ЕС финансирането отнема 1–2 години, за идеи за
   бъдещето е и не всеки проект може да бъде финансиран.
4. Без номерация „01, 02…“ като украса и без повтарящи се снимки.
5. В скрийншоти личните данни на клиентите са замъглени, а числата скрити.
6. Достъпност WCAG 2.2 AA: видим focus, landmarks, `<label>` на всяко поле, грешки по поле.
7. JS ≤ 60 KB gzip на страница; скриптовете са външни файлове (CSP без 'unsafe-inline').
8. След промяна: `npm run build`, скрийншоти на 1440 и 390 px, `npm run test:form` в mock режим.
9. Commit съобщенията са на английски, в повелително наклонение.

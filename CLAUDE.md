# CLAUDE.md — Pankov Solutions (pankovsolutions.com)

## Какво строим
Двуезичен (BG основен, EN) портфолио сайт на Pankov Solutions — Мартин Панков, Плевен.
Аудитория: собственици на МСП (често бенефициенти по европейски програми), консултанти
по европроекти, които търсят надежден изпълнител, ресторантьори, чужди клиенти.
Целта на всяка страница е една: посетителят да прати запитване или да се обади.

Преди каквато и да е работа прочети: `docs/00-мастър-бриф-и-план.md`, `DESIGN.md`,
`COPY.md`, `CHECKLIST.md`. Рисърчът е в `docs/02..05`. Не ги преразказвай — прилагай ги.

## Стек (фиксиран)
- Astro 5, `output: 'static'`, Tailwind v4, Content Collections (Markdown/MDX в `content/`).
- i18n: вграденият Astro i18n routing. `bg` е default без префикс (`/проекти` → използвай
  латински slug-ове: `/projects`, `/services` — еднакви за двата езика), `en` под `/en/`.
  hreflang + `x-default` на всяка страница, самореферентни.
- Хостинг: Cloudflare Workers със статични файлове (`wrangler.toml`, `worker/index.ts`). Формата: `functions/api/inquiry.ts`, извикван от Worker-а на POST /api/inquiry.
- Форма pipeline: honeypot → timing (< 3 s = spam) → rate limit (KV, 5/час/IP) →
  Cloudflare Turnstile `siteverify` → Zod → Resend (from `hello@pankovsolutions.com`,
  reply-to подателя) → email до `hello@` + Telegram бот → автоотговор до подателя.
- Аналитика: Umami (cookieless), без cookie банер. Без Meta Pixel. Без Google Fonts CDN —
  шрифтовете са self-hosted WOFF2 в `public/fonts/` с `unicode-range` за кирилица/латиница.
- Секрети само в Cloudflare env: `RESEND_API_KEY`, `TURNSTILE_SECRET`, `TELEGRAM_BOT_TOKEN`,
  `TELEGRAM_CHAT_ID`. Никога в repo-то.

## Структура на страниците
`/` Начало · `/projects` (листинг) · `/projects/[slug]` (кейс стъди) · `/services` ·
`/for-beneficiaries` (за бенефициенти и консултанти) · `/products` (FudiAR) ·
`/about` · `/contact` · `/privacy` · `/404`. Всички и под `/en/`.

## Правила, които не се нарушават
1. **Съдържанието идва само от `content/`.** Ако нещо липсва — остави
   `<!-- TODO: Марти да даде: ... -->` в markdown-а и празно място в UI. Никога не измисляй
   клиенти, числа, цитати, дати. Placeholder логата/отзивите в `content/` са изрично
   маркирани `placeholder: true` във frontmatter — рендерирай ги с видим етикет „примерен“
   в dev, и не ги показвай в production build (`import.meta.env.PROD`).
2. **Токени само от `src/styles/tokens.css`.** Нула hex стойности, нула произволни
   `px` в компоненти. Tailwind тема се захранва от токените (`@theme`).
3. `<html lang="bg">` / `lang="en"`; `font-feature-settings: "locl" 1`. Провери визуално,
   че „т, д, л, б, в, ж“ са с български форми (малкото „т“ прилича на „m“).
4. Една страница на сесия. След всяка стъпка: скрийншот на 1440 и 390 px (Playwright MCP),
   сверяване с `CHECKLIST.md`, чак тогава следваща стъпка.
5. Забранените неща в `DESIGN.md` §Забранено са абсолютни. Ако усетиш, че ще ги напишеш —
   спри и предложи алтернатива от §Вместо това.
6. Достъпност: WCAG 2.2 AA. Контраст ≥ 4.5:1 (проверявай със стойностите от токените),
   видим `:focus-visible`, `prefers-reduced-motion`, семантични landmarks, всяка форма с
   `<label>`, грешки с `aria-describedby`.
7. Performance бюджет на страница: JS ≤ 60 KB (gzip), LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms,
   Lighthouse ≥ 95 на всичко. Изображения през `<Picture>` (AVIF/WebP), `fetchpriority="high"`
   само на hero изображението, `loading="lazy"` на останалите.
8. Без external скриптове освен Turnstile и Umami. Без jQuery, без animation библиотеки,
   без icon-font. Ако трябва икона — inline SVG от Phosphor (regular weight), максимум 6
   уникални икони в целия сайт.
9. Commit след всяка завършена страница, съобщение на английски, imperative.

## Git / файлове
```
content/bg/*.md, content/bg/projects/*.md   — български текст (източник на истината)
content/en/**                                — превод, прави се СЛЕД одобрен BG текст
src/styles/tokens.css                        — дизайн токени
src/components/                              — Astro компоненти, без React освен ако формата
                                               реално го изисква (не го изисква)
public/img/clients/                          — лога (SVG), public/img/projects/<slug>/
public/img/marti.jpg                         — портрет (placeholder до качване)
docs/                                        — рисърч и бриф (00-05)
```

## Definition of done за страница
Реално съдържание от `content/` без TODO в production · токени спазени (grep за `#[0-9a-f]{3,6}`
в `src/` връща 0) · 1440/390 px прегледани · `CHECKLIST.md` минат ред по ред · субагент
`design-critic` без находки · Lighthouse ≥ 95 на 4-те категории · `bg` и `en` версии
рендерирани, hreflang валиден.

## Субагенти
- `design-critic`: „Прегледай скрийншота и кода срещу DESIGN.md и CHECKLIST.md. Изброй само
  нарушения като `file:line — какво — как да се поправи`. Не хвали. Не предлагай нови
  функции.“
- `copy-editor`: „Провери текста срещу COPY.md (забранени думи BG/EN, тон, кавички „…“,
  тире -, числа). Върни само нарушенията с предложена замяна.“

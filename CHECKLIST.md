# CHECKLIST.md — преглед на всяка страница (и преди launch)

Използва се от `design-critic` и от Марти. Отговорът на всеки ред е „да“ или `file:line`.

## A. AI-look (визуално) — виж docs/03 §4
- [ ] Няма indigo/violet, градиенти, gradient text, mesh фон, glow.
- [ ] Няма центриран hero с два бутона; hero е асиметричен с реален визуал.
- [ ] Няма 3 карти с икони; услугите са номериран списък.
- [ ] Всяка секция има различна структура от предишната.
- [ ] Радиуси само 0/4 px; сянка само на модал; без backdrop-blur.
- [ ] Само 2 шрифтови семейства + mono; не Inter/Geist/Manrope/Playfair.
- [ ] Заглавия 700 или 300, никога 500/600.
- [ ] Български форми на кирилицата видими („т“ като „m“).
- [ ] Няма stock снимки, undraw илюстрации, аватари, емоджита, декоративни икони.
- [ ] Motion: само underline/hover/един page-load reveal; reduced-motion работи.
- [ ] Има поне един „ръчен“ елемент (таблица, документ, подпис) на страницата.
- [ ] Лого стената не е сива и не е marquee.

## B. Копи — виж COPY.md
- [ ] Нито една забранена дума/фраза (BG и EN).
- [ ] Всеки абзац има име, число, срок или технология.
- [ ] Няма триплети и „не просто X, а Y“.
- [ ] Кавички „…“, тире -, числа с интервал, €.
- [ ] Няма измислени числа/клиенти/отзиви; placeholder-ите са маркирани.
- [ ] Хедлайнът казва какво + за кого; CTA е специфичен.
- [ ] Обещанието „до 1 работен ден“ стои до формата.

## C. Доверие — виж docs/02 §3
- [ ] Footer: ЕМ ЕН ЕМ ПАРТНЪРС ООД, ЕИК 208242979, седалище, телефон, hello@ имейл, ДДС № (ако има).
- [ ] Реална снимка (или маркиран placeholder до качване).
- [ ] Всеки кейс има резултат в заглавието и поне 1 реален скрийншот.
- [ ] Отзивите са с име, длъжност, фирма.
- [ ] Партньорът (Еко Глоуб / Биляна Тончева) е с лого и роля.
- [ ] Линк към LinkedIn и Google Business Profile.

## D. Техника — виж docs/04
- [ ] Lighthouse ≥ 95 ×4 (mobile). LCP ≤ 2.5 s, CLS ≤ 0.1, INP ≤ 200 ms.
- [ ] JS ≤ 60 KB gzip; без external скриптове освен Turnstile/Umami.
- [ ] Изображения AVIF/WebP, размерени, `width/height` зададени, lazy извън hero.
- [ ] Шрифтове self-hosted WOFF2, subset latin+cyrillic, `font-display: swap`.
- [ ] `<title>` уникален ≤ 60 зн., description ≤ 155, canonical, OG image, hreflang bg/en/x-default.
- [ ] JSON-LD: Organization+ProfessionalService (начало), Person (about), Article+BreadcrumbList (кейс).
- [ ] sitemap.xml, robots.txt (AI crawlers позволени), llms.txt, 404.
- [ ] Семантика: един `<h1>`, landmarks, skip link, фокус видим, таб ред логичен.
- [ ] Формата: label за всяко поле, грешки с aria-describedby, работи без JS (fallback POST),
      honeypot, Turnstile, rate limit, Resend от верифициран домейн, автоотговор, Telegram.
- [ ] SPF/DKIM/DMARC за pankovsolutions.com минават (mail-tester ≥ 9/10).
- [ ] Security headers: HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- [ ] Preview deploys с `noindex`.

## E. Право (информация, не правен съвет) — виж docs/04 §6
- [ ] Данни по чл. 4 ЗЕТ + чл. 13 ТЗ във footer-а.
- [ ] Политика за поверителност по чл. 13 GDPR (администратор, цели, основание, срок, права, КЗЛД).
- [ ] Няма non-essential cookies → няма банер. Ако някога се добави Pixel — CMP преди него.
- [ ] Писмено съгласие за всяко реално лого/отзив (папка `legal/consents/`).
- [ ] Европейски програми са наименувани коректно (BG16RFPR001-1.012 „Дигитализация на предприятията“).
- [ ] Декларация за достъпност (кратка) линкната от footer-а.

## F. Launch
- [ ] Всички TODO в `content/` затворени или скрити от production.
- [ ] Placeholder лога/отзиви заменени с реални или скрити.
- [ ] Search Console + Bing: sitemap подаден. Umami работи, event `inquiry_sent`.
- [ ] Uptime monitor. Backup на repo (GitHub). Домейн, DNS, HTTPS, www → apex redirect.
- [ ] Google Business Profile създаден, линкнат.

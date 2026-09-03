# Технически практики, SEO, форма за запитване и правни изисквания за фирмен портфолио сайт (Pankov Solutions, 2026)

> Обхват: малък маркетинг/портфолио сайт (5–15 страници, case studies, „За нас“, контакт/форма за запитване), двуезичен BG/EN, разработван от solo developer с Claude Code. Документът е изследване на добри практики към септември 2026 г.
>
> **Важно: секциите за право (№6 и части от №5/№7) са обща правна информация, не правен съвет.** За окончателни текстове на политика за поверителност, общи условия и cookie-практики е препоръчително съгласуване с адвокат/DPO.

---

## 0. Кратка препоръка (TL;DR)

| Решение | Препоръка | Защо |
|---|---|---|
| **Framework** | **Astro 5 (static output) + Tailwind + Content Collections (MDX)** | Най-малко JS по подразбиране, вграден i18n routing, отлични Core Web Vitals, идеален за AI агенти (плоска файлова структура, малко „магия“). Next.js остава резервен вариант, ако сайтът ще прерасне в app. |
| **Съдържание** | Markdown/MDX в Git (content collections) + по избор Keystatic за UI редактор | Нулева инфраструктура, версиониране, Claude Code редактира съдържанието директно. |
| **Хостинг** | **Cloudflare Pages/Workers** (безплатен, неограничен bandwidth, EU edge) или Vercel Hobby; Hetzner VPS само ако вече има Coolify за други проекти | За статичен сайт VPS носи повече поддръжка, отколкото стойност. |
| **Форма** | Astro API endpoint / Cloudflare Worker → Zod валидация → Turnstile (server-side siteverify) + honeypot + rate limit → **Resend** от верифициран домейн → уведомление по email + Telegram | Прост, без база данни, доставимост при SPF/DKIM/DMARC. |
| **Аналитика** | **Plausible/Umami (cookieless)** без cookie банер; Meta Pixel **само** зад CMP със съгласие | ePrivacy чл. 5(3) – без cookies няма нужда от съгласие; Pixel е рекламен тракер → задължително съгласие. |
| **Право** | Данни по чл. 4 ЗЕТ + чл. 13 ТЗ във футъра; Политика за поверителност по чл. 13 GDPR; Cookie policy само ако има non-essential cookies; съгласие от клиенти за лога/отзиви | Задължително по български закон. |
| **Достъпност** | WCAG 2.2 AA като стандарт; EAA (ЗИДПУ) не се прилага за обикновен B2B сайт, но декларация за достъпност е добър сигнал | Ниска цена, висок ефект. |

---

## 1. Избор на стек (Stack)

### 1.1. Сравнение на опциите

| Критерий | **Astro** | **Next.js (App Router)** | **Plain HTML + Tailwind** | **WordPress** |
|---|---|---|---|---|
| Performance по подразбиране | Отлично – „islands“, 0 KB JS без интерактивност | Добро, но React runtime (~80–100 KB) винаги се доставя | Отлично | Средно; зависи от теми/плъгини |
| SEO | SSG, чист HTML | SSG/SSR, Metadata API | Ръчно | Добро с плъгини |
| i18n (BG/EN) | Вграден routing (`i18n.locales`, `prefixDefaultLocale`, fallback) | Чрез middleware + `next-intl`; повече код | Ръчно дублиране | Плъгини (WPML/Polylang) |
| Content management | Content Collections (MD/MDX, Zod схема) | MDX ръчно или CMS | Няма | Вграден редактор |
| Поддръжка от solo dev | Много ниска | Средна (чести breaking changes в App Router) | Ниска, но скучно за 15 страници | Постоянни ъпдейти и сигурност |
| Удобство за AI агенти (Claude Code) | Много високо – `.astro` файлове, ясна структура, малко абстракции | Високо, но RSC/Server Actions/caching са source на грешки | Много високо | Ниско (PHP + DB state) |
| Формa/backend | Astro endpoints / SSR адаптер | Server Actions / Route Handlers | Външна услуга (Web3Forms/Formspree) | Contact Form 7 и т.н. |

Vercel (създателят на Next.js) в собственото си сравнение признава, че според HTTP Archive „Astro сайтовете доставят по-малко клиентски JavaScript“ и „преминават Core Web Vitals с по-висок агрегиран процент“, и препоръчва Astro за „предимно статични страници – блогове, документация, маркетинг сайтове и портфолиа“, а Next.js – когато сайтът ще прерасне в пълноценно приложение ([Vercel: Astro vs Next.js](https://vercel.com/i/astro-vs-next-js)). Същият извод правят и независими сравнения за 2026 ([Easton: Astro vs Next.js for static sites](https://eastondev.com/blog/en/posts/dev/20251202-astro-vs-nextjs-static-site/), [webaloha](https://webaloha.co/astro-vs-nextjs-for-business-websites/)).

**Кога Next.js е по-правилният избор:** ако портфолио сайтът ще стане част от по-голямо приложение (клиентски портал, дашборд, автентикация), или ако искате да покажете Next.js експертиза на клиенти чрез самия сайт. За чист портфолио сайт това е over-engineering.

**Кога WordPress:** само ако някой друг (нетехнически) ще пише постове всяка седмица. За solo dev, който така или иначе работи в Git с Claude Code, WordPress добавя PHP/DB поддръжка без полза.

### 1.2. Content management

- **Content Collections (Astro) + MDX** – всяко case study е `.mdx` файл със Zod-валидиран frontmatter (`title`, `client`, `industry`, `stack`, `results`, `publishedAt`, `lang`, `translationKey`). Това е достатъчно за 10–30 case studies и Claude Code работи отлично с този формат.
- **Keystatic** – Git-базиран CMS с админ UI, първокласна интеграция с Astro и Next.js, безплатен self-host, но **без вградена локализация** и без scheduling ([Keystatic review 2026](https://www.luckymedia.dev/insights/keystatic)). Добавете го по-късно само ако искате визуален редактор.
- **Decap CMS** – подобен Git-базиран вариант; **Sanity/Payload** – пълноценни headless CMS, оправдани при много редактори или динамично съдържание; за 15 страници не са необходими ([DEV: Complete Astro CMS guide](https://dev.to/opacedigitalagency/the-complete-headless-cms-guide-for-astro-comparing-13-jamstack-js-cms-platforms-566f)).

### 1.3. Хостинг

| Опция | Цена | Плюсове | Минуси |
|---|---|---|---|
| **Cloudflare Pages / Workers Static Assets** | Безплатно; „Unlimited bandwidth“, 100k Worker заявки/ден, 500 deploys/месец ([DevToolReviews 2026](https://www.devtoolreviews.com/reviews/vercel-vs-netlify-vs-cloudflare-pages-pricing-comparison-2026)) | Turnstile, Web Analytics, DNS и email routing на едно място; EU edge (София има PoP) | Workers runtime не е Node (за Resend SDK е ОК – fetch-базиран) |
| **Vercel Hobby** | Безплатно, 100 GB bandwidth, но Hobby планът е за некомерсиална употреба (проверете актуалните условия) | Най-добра Next.js интеграция, preview deploys | Overage $0.15/GB; за фирмен сайт формално е нужен Pro ($20/м.) |
| **Netlify Free** | 100 GB, 300 build мин., 125k function заявки | Forms вграден (с лимити) | Overage $0.55/GB |
| **Hetzner VPS + Coolify/Docker/Caddy** | CX22 ~€4.5/м. + бекъпи (20 %) | Пълен контрол, можете да хоствате Plausible/Umami там | Реалният разход е **време**: автор описва 2–3 дни setup и 40–60 часа поддръжка за 3 месеца, Docker байпасва ufw/nftables, 11 критични CVE в Coolify (ян. 2026) ([ceaksan: Hetzner + Coolify reality](https://ceaksan.com/en/hetzner-coolify-self-hosting-reality)) |

**Препоръка:** статичният сайт на **Cloudflare** (build от GitHub, preview deploy на всеки PR). Hetzner VPS-ът, който вече имате, е идеален за **self-hosted Umami/Plausible** и за n8n/Telegram бот – т.е. за „допълнителни“ услуги, не за самия сайт. Ако все пак искате всичко на VPS: Astro static → nginx/Caddy контейнер зад Cloudflare proxy (безплатен WAF + кеш).

**DNS/Email:** DNS в Cloudflare (безплатно, бързо разпространение, DNSSEC). Пощата за домейна – Google Workspace или Zoho/Mailbox.org; транзакционната поща (формата) – Resend с отделен субдомейн (`mail.pankov.solutions` или `notify.`), за да не се смесва репутацията с бизнес кореспонденцията.

---

## 2. Performance

### 2.1. Core Web Vitals – цели за 2026

Google измерва на **75-и персентил**, отделно за mobile и desktop ([web.dev: Web Vitals](https://web.dev/articles/vitals)):

| Метрика | Добро | Нуждае се от подобрение | Лошо |
|---|---|---|---|
| **LCP** (Largest Contentful Paint) | ≤ 2.5 s | 2.5–4.0 s | > 4.0 s |
| **INP** (Interaction to Next Paint) | ≤ 200 ms | 200–500 ms | > 500 ms |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | 0.1–0.25 | > 0.25 |

Вътрешна цел за сайта: LCP < 1.5 s на mobile 4G, CLS ≈ 0, Lighthouse 95–100 на всички четири категории.

### 2.2. Най-ефективните мерки (по web.dev)

Според [web.dev: The most effective ways to improve Core Web Vitals](https://web.dev/articles/top-cwv):

- **LCP:** hero изображението да е откриваемо директно в HTML (`<img src>` или `<link rel="preload">`), с `fetchpriority="high"` и **без** `loading="lazy"`; TTFB чрез CDN; bfcache (без `Cache-Control: no-store`, без `unload` listeners).
- **CLS:** явни `width`/`height` или `aspect-ratio` на всички изображения/ембеди; `min-height` за динамични блокове; анимирайте само `transform`/`opacity`.
- **INP:** минимален JS, без дълги задачи; за статичен Astro сайт това е почти автоматично.

### 2.3. Изображения

- Използвайте `<Image>`/`<Picture>` на Astro – генерира `srcset`/`sizes` при `image.layout: 'constrained'`, `loading="lazy"` и `decoding="async"` по подразбиране, `formats={['avif','webp']}` ([Astro Images](https://docs.astro.build/en/guides/images/)). В Next.js – `next/image` с `priority` за LCP изображението и `formats: ['image/avif','image/webp']`.
- AVIF за снимки (20–50 % по-малък от WebP), WebP fallback; SVG за лога/икони.
- Screenshot-ите от case studies: макс. 1600px ширина, `sizes="(max-width: 768px) 100vw, 800px"`.
- Никога не lazy-load-вайте LCP изображението ([Unlighthouse: don't lazy-load LCP](https://unlighthouse.dev/learn-lighthouse/lcp/lcp-lazy-loaded)).

### 2.4. Шрифтове (вкл. кирилица)

По [web.dev: Best practices for fonts](https://web.dev/articles/font-best-practices):

- **Само WOFF2**; self-host в `/public/fonts` (без връзка към Google Fonts – избягвате и GDPR въпроса с IP към Google, за който германски съдилища са глобявали).
- **Subsetting по `unicode-range`**: отделни файлове за `latin` (U+0000-00FF…) и `cyrillic` (U+0400-045F, 0490-0491, 04B0-04B1, 2116). Използвайте `glyphhanger`/`pyftsubset` или Fontsource (`@fontsource-variable/inter` вече доставя cyrillic subset).
- Variable font (Inter, Manrope, Onest, Golos – добра кирилица) = 1–2 файла вместо 6.
- `font-display: swap` за заглавия, `optional` за body; `size-adjust`/`ascent-override` на fallback (`Arial`, `Segoe UI`) за нулев CLS; `<link rel="preload" as="font" type="font/woff2" crossorigin>` само за 1–2 критични файла.
- Проверете кирилицата за всеки шрифт – Inter, Manrope, Golos Text, Onest, PT Sans/Serif, Roboto Flex имат качествена кирилица; много „модерни“ display шрифтове нямат.

### 2.5. JS бюджет и third-party

- Цел: **< 50 KB** компресиран JS на страница (Astro без islands ≈ 0–10 KB). Единствените islands: форма (по избор – може и без JS), мобилно меню (може с `<details>`/CSS), Turnstile widget.
- Аналитика: Plausible ≈ 1 KB, Umami ≈ 2 KB. Meta Pixel ≈ 100+ KB и трябва да се зарежда **само след съгласие** (виж §7).
- Без Google Fonts, без jQuery, без чат widget-и (Tawk/Crisp тежат 300–500 KB); ако искате чат – линк към Telegram/Viber.
- Видео: `<video preload="none" poster>` или facade за YouTube (`lite-youtube-embed`).
- Cloudflare: включете Brotli, Early Hints, HTTP/3; `Cache-Control: public, max-age=31536000, immutable` за хеширани asset-и.

---

## 3. SEO за локален B2B сайт

### 3.1. Технически SEO чеклист

- [ ] Уникални `<title>` (50–60 знака, ключова дума + град/услуга) и `meta description` (140–160) за всяка страница и език.
- [ ] `<link rel="canonical">` self-referencing, с trailing slash последователно (Astro `trailingSlash: 'always'`).
- [ ] `sitemap-index.xml` (`@astrojs/sitemap` с `i18n` опция) + `robots.txt` със `Sitemap:` ред; в Next.js – `app/sitemap.ts` и `app/robots.ts` ([Next.js Metadata & OG](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)).
- [ ] **hreflang** по [Google: Localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions): всяка страница сочи към **себе си** и всички алтернативи (`bg`, `en`), връзките са **двупосочни**, плюс `x-default` (към BG или към езиков избор); кодове ISO 639-1 (`bg`, `en`, не `en-UK`). Може в `<head>` или в sitemap чрез `xhtml:link`. Astro **не** генерира hreflang автоматично – имплементира се в Layout компонента ([Astro i18n](https://docs.astro.build/en/guides/internationalization/)).
- [ ] URL структура: `/` (BG, default, без префикс) и `/en/...`; `<html lang="bg">`/`lang="en"`.
- [ ] Open Graph + Twitter Card: `og:title`, `og:description`, `og:image` **1200×630** (< 1 MB, PNG/JPG, текст в централните 1200×600 за безопасност), `og:locale` `bg_BG`/`en_US`, `og:locale:alternate` ([og-image.org](https://og-image.org/learn/og-image-size)). Генерирайте динамични OG изображения на case studies (`astro-og-canvas`/Satori, в Next.js – `ImageResponse`).
- [ ] 404 страница с правилен HTTP 404 (не soft-404), 301 редиректи от стари URL-и, `www` → apex.
- [ ] Хедъри `Link: <...>; rel="preload"` / Early Hints за критични ресурси; без `noindex` в production (класическа грешка при preview deploy → проверете!).
- [ ] Изображения с описателни `alt` и файлови имена (`izrabotka-online-magazin-pleven.avif`) ([Google Image SEO](https://developers.google.com/search/docs/appearance/google-images)).

### 3.2. Структурирани данни (JSON-LD)

| Страница | Тип | Ключови свойства |
|---|---|---|
| Всички (в Layout) | `Organization` (или `ProfessionalService` ⊂ `LocalBusiness`) | `name`, `legalName`, `url`, `logo`, `address` (PostalAddress: Плевен, BG), `telephone`, `email`, `areaServed` (Плевен, България, EU), `sameAs` (LinkedIn, GitHub, Facebook, GBP), `founder` → Person, `vatID`/`taxID` (ЕИК), `knowsLanguage` |
| „За мен/нас“ | `ProfilePage` с `mainEntity: Person` | `name`, `jobTitle`, `description`, `image`, `sameAs`, `knowsAbout` (Next.js, Vue, WordPress, Python, Odoo) ([Google ProfilePage](https://developers.google.com/search/docs/appearance/structured-data/profile-page)) |
| Case study | `Article` (или `CreativeWork`) + `BreadcrumbList` | `headline`, `author` → Person, `publisher` → Organization, `datePublished`, `dateModified`, `image`, `about`/`mentions` (клиентска Organization – само със съгласие) |
| Услуги | `Service` + `OfferCatalog` | `serviceType`, `provider`, `areaServed` |
| FAQ секция | `FAQPage` | Google показва FAQ rich results само за „authoritative government and health“ сайтове от 2023 г., но markup-ът помага на AI/LLM парсване – добавете го без очаквания за rich snippet |

Google изисква за `LocalBusiness` минимум `name` и `address`, препоръчва `telephone`, `url`, `geo`, `openingHoursSpecification`, `priceRange` и **най-специфичния подтип** ([Google LocalBusiness](https://developers.google.com/search/docs/appearance/structured-data/local-business)). Ако не приемате клиенти на физически адрес, `ProfessionalService` със `address` на седалището е приемливо. Валидирайте с Rich Results Test и schema.org validator.

### 3.3. Google Business Profile (GBP)

- Създайте профил като **service-area business**: ако не приемате клиенти на адреса, **скрийте адреса** и задайте до 20 зони (Плевен, Ловеч, Велико Търново, София…) по [Google: Service areas](https://support.google.com/business/answer/9157481?hl=en). Хибриден вариант (офис + зони) – ако имате офис.
- Категория „Уеб дизайнер“/„Софтуерна компания“, услуги, снимки, UTM-таг на линка към сайта, отговаряйте на отзиви. Свържете GBP `url` в `sameAs`.

### 3.4. Локални ключови думи и структура на съдържанието

- Отделни услуги-страници за всяка транзакционна заявка: „изработка на онлайн магазин Плевен“, „изработка на уебсайт Плевен“, „Odoo внедряване“ / „Odoo партньор България“, „Next.js разработчик“, „WordPress поддръжка“, „Python автоматизация“. По една H1, ясен CTA, FAQ, 2–3 свързани case studies.
- EN версията таргетира различни заявки („Next.js developer Bulgaria“, „nearshore Vue.js developer EU“, „Odoo implementation partner Bulgaria“) – не превеждайте буквално, а адаптирайте.
- Case studies като SEO активи: заглавие с формула „[Резултат] за [индустрия] чрез [технология]“, секции Проблем → Решение → Резултат (с числа) → Стек → Отзив. Всеки case study = потенциален landing за long-tail заявки („ERP за производствена фирма“).
- Вътрешни връзки: услуга ↔ case study ↔ за нас; breadcrumbs.

### 3.5. E-E-A-T за човек/малка фирма

Google оценява Experience, Expertise, Authoritativeness, Trust чрез сигнали като автор с реална биография, снимка, контакти, външни профили и последователна информация за организацията в целия уеб ([SEO-Kreativ: E-E-A-T guide 2026](https://www.seo-kreativ.de/en/blog/e-e-a-t-guide-for-more-trust-and-top-rankings/)). Практически:

- Страница „За мен“ с реално име, снимка, опит по години, технологии, сертификати, линкове към GitHub/LinkedIn (и `Person` schema).
- Идентични NAP (name, address, phone) данни в сайта, GBP, LinkedIn, Търговски регистър, каталози (Firmite.bg, Bulgarian Yellow Pages).
- Реални case studies с цифри и цитати от клиенти; open-source репозитории; статии в Dev.to/LinkedIn с линк към сайта.
- HTTPS, видими правни страници, ЕИК и адрес във футъра – доверие и за Google, и за клиенти.

### 3.6. AI търсене / LLM видимост

- **llms.txt**: Google официално обяви (юни 2026), че „Google Search не ги използва“ и файлът „няма да навреди (нито да помогне)“ за ranking и AI Overviews ([TechWyse: Google on llms.txt](https://www.techwyse.com/news/ai-search/google-llms-txt-no-ranking-benefit-june-2026)). Anthropic и OpenAI обаче го ползват за агенти, а Perplexity е наблюдаван да го чете ([Passionfruit: llms.txt 2026](https://www.getpassionfruit.com/blog/should-i-create-an-llms.txt-file-google-s-2026-guidance-explained)). Извод: добавете `llms.txt` (10 минути работа, Astro има `astro-llms-txt` интеграция), но не очаквайте SEO ефект.
- Реалните двигатели за цитиране от ChatGPT/Perplexity: директни, фактологични отговори в текста („Pankov Solutions е софтуерна компания в Плевен, основана през …, специализирана в …“), консистентни данни за entity-то в целия интернет, присъствие в трети платформи (GitHub, LinkedIn, Clutch, Reddit), ясна структура с H2 въпроси, актуални дати.
- `robots.txt`: решете съзнателно дали допускате `GPTBot`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`. За портфолио, което иска да бъде цитирано – **допуснете ги**.
- Cloudflare има „AI Crawl Control“ – по подразбиране може да блокира AI ботове при нови зони; проверете настройката.

---

## 4. Достъпност (WCAG 2.2 AA)

### 4.1. Прилага ли се European Accessibility Act?

EAA (Директива 2019/882) е транспониран в България чрез **Закона за изискванията за достъпност на продукти и услуги (ЗИДПУ)**, в сила от **28 юни 2025 г.** Той обхваща конкретни услуги: електронни съобщения, аудиовизуални медии, пътнически транспорт, банкови услуги за потребители, електронни книги и **услуги за електронна търговия** към потребители. Обикновен фирмен B2B сайт с портфолио и контактна форма **не попада** в обхвата; микропредприятията (< 10 души, < €2 млн.) са и облекчени от документиране на оценката ([Popov & Partners: нови изисквания за достъпност](https://popovarnaudov.bg/wp-content/uploads/2025/07/Novina-dostapnost-2_cl.pdf), [ЗИДПУ на ciela.net](https://www.ciela.net/svobodna-zona-normativi/view/2137249754/zakon-za-iziskvaniyata-za-dostapnost-na-produkti-i-uslugi)). *(Правна информация, не съвет.)* Внимание: ако изграждате **онлайн магазини за клиенти**, техните сайтове **вече попадат** под закона – това е и търговски аргумент за услуга „достъпност“.

Въпреки че не е задължително, WCAG 2.2 AA е ниска инвестиция с висок ефект (SEO, конверсия, доверие, „Best practices“ в Lighthouse).

### 4.2. Основни изисквания за такъв сайт

- **Семантичен HTML:** `<header>/<nav>/<main>/<footer>`, една `<h1>`, логическа йерархия H2–H3, `<button>` за действия, `<a>` за навигация, списъци за списъци.
- **Контраст:** текст ≥ 4.5:1, голям текст и UI елементи/икони ≥ 3:1 (SC 1.4.3, 1.4.11). Проверявайте Tailwind палитрата с APCA/WCAG contrast checker; сивите „muted“ текстове (#9ca3af на бяло = 2.5:1) са най-честият провал.
- **Focus:** видим `:focus-visible` (2px outline с 3:1 контраст); **2.4.11 Focus Not Obscured (AA – ново в 2.2)** – sticky header/cookie банер да не покрива фокусирания елемент ([TetraLogical: What's new in WCAG 2.2](https://tetralogical.com/blog/2023/10/05/whats-new-wcag-2.2/)).
- **Target size 2.5.8 (AA, ново):** минимум 24×24 CSS px за кликаеми елементи (или достатъчно разстояние) – икони на соц. мрежи, езиков превключвател.
- **Consistent Help 3.2.6 (A, ново):** контактът/помощта на едно и също място на всички страници (футър/хедър).
- **Redundant Entry 3.3.7 (A):** не изисквайте повторно въвеждане на данни във формата.
- **Клавиатура:** всичко достъпно с Tab/Enter/Esc; skip link „Към съдържанието“; мобилното меню с правилен `aria-expanded`, затваряне с Esc, focus trap.
- **Reduced motion:** `@media (prefers-reduced-motion: reduce)` изключва паралакси/автоплей; без автоматични карусели.
- **Форми:** видим `<label for>` за всяко поле (без placeholder-only), `autocomplete="name|email|tel|organization"`, грешки в текст до полето с `aria-describedby` и `aria-invalid="true"`, обобщение на грешките с `role="alert"`, фокус върху първото грешно поле; **без CAPTCHA с пъзели** (3.3.8) – Turnstile е невидим и е ОК.
- **Езици:** `lang` на `<html>` и `lang="en"` на вмъкнати английски фрази в BG текст (SC 3.1.2).
- **Изображения:** смислен `alt`, `alt=""` за декоративни; текстова алтернатива на графики с резултати.
- **Инструменти:** axe DevTools, Lighthouse, Pa11y CI в GitHub Actions, ръчен тест с VoiceOver/NVDA и само с клавиатура.
- **Декларация за достъпност** (кратка страница: стандарт, известни ограничения, контакт за обратна връзка) – не е задължителна за този сайт, но е добър сигнал за доверие ([W3C WCAG 2.2](https://www.w3.org/TR/WCAG22/)).

---

## 5. Форма за запитване

### 5.1. Архитектура

```
[Browser] --POST JSON/FormData--> [Astro endpoint /api/contact (Cloudflare Worker) или Next.js Server Action]
   1. Honeypot поле (скрито) празно?  иначе → 200 OK „успех“ (тихо изхвърляне)
   2. Време от рендер до submit > 3 s? (timestamp в скрито поле / HMAC)
   3. Rate limit по IP (Cloudflare Rate Limiting rule или KV: 5 заявки/10 мин.)
   4. Turnstile: POST https://challenges.cloudflare.com/turnstile/v0/siteverify {secret, response, remoteip}
   5. Zod schema.safeParse(data) → грешки по полета
   6. Resend.emails.send() → към вас (Reply-To: клиента) + автоотговор до клиента
   7. Telegram Bot API sendMessage (fire-and-forget, waitUntil)
   8. (по избор) запис в Cloudflare D1 / Google Sheet / Notion за архив
   9. Отговор { ok: true } → success състояние на UI
```

- **Turnstile** изисква задължителна server-side валидация; токенът е валиден **5 минути** и е **еднократен** (`timeout-or-duplicate` при повторна проверка) ([Cloudflare Turnstile: Validate the token](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)). Ползвайте `invisible`/`managed` режим за минимална фрикция.
- **Honeypot + време за попълване + rate limit** спират 90 % от простите ботове без UX цена ([WebTechs: Stop contact form spam 2026](https://www.webtechs.net/stop-contact-form-spam/)).
- **Resend:** SDK `resend.emails.send({from, to, subject, html/react, replyTo})`; в production `from` трябва да е от **верифициран домейн** ([Resend: Send with Next.js](https://resend.com/docs/send-with-nextjs)). Безплатен план: 3000 имейла/месец – достатъчно. Алтернативи: Postmark (най-добра доставимост, платен), SMTP на Workspace (не се препоръчва за автоматизирани пратки), Web3Forms/Formspree (нулев backend, но данните минават през трета страна – трябва да се опише в политиката и да има DPA).
- Формата трябва да **работи и без JavaScript** (progressive enhancement: `<form method="post" action="/api/contact">` + server-rendered success страница), а с JS – inline валидация и без презареждане.

### 5.2. Какви полета

Минимум – по-малко полета = повече запитвания:

| Поле | Задължително | Бележка |
|---|---|---|
| Име | да | `autocomplete="name"` |
| Email | да | `type="email"`, `inputmode="email"` |
| Телефон | не | `type="tel"`; BG клиентите често предпочитат обаждане |
| Фирма | не | `autocomplete="organization"` |
| Тип проект | не | select: Уебсайт / Онлайн магазин / Odoo/ERP / Web app / Поддръжка / Друго |
| Бюджет | не | диапазони (< 2 000 лв. / 2–5 000 / 5–15 000 / > 15 000 / EUR екв.) – филтрира и подпомага квалификация |
| Съобщение | да | `minlength=20`, `maxlength=3000` |
| Съгласие GDPR | да (checkbox, unchecked) | виж текст по-долу |
| Honeypot (`website`) | скрито | `tabindex=-1`, `aria-hidden`, off-screen |

**Файлове (ТЗ/бриф):** избягвайте на първа стъпка – рискове (malware, размер, storage). По-добре: „Изпратете линк към Google Drive/Figma“ или приемайте файлове чак в отговорния имейл. Ако все пак – Cloudflare R2, лимит 10 MB, whitelist на PDF/PNG/JPG/DOCX, вирус-скан не е тривиален.

### 5.3. Zod схема (пример)

```ts
import { z } from "zod";
export const InquirySchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
  company: z.string().trim().max(150).optional(),
  projectType: z.enum(["website","eshop","odoo","webapp","support","other"]).optional(),
  budget: z.enum(["lt2k","2k-5k","5k-15k","gt15k","unknown"]).optional(),
  message: z.string().trim().min(20).max(3000),
  consent: z.literal("on", { errorMap: () => ({ message: "Необходимо е съгласие" }) }),
  website: z.string().max(0), // honeypot
  turnstileToken: z.string().min(10),
  locale: z.enum(["bg","en"]),
});
```

### 5.4. GDPR текст към checkbox-а (примерна формулировка)

> ☐ Съгласен/на съм предоставените от мен данни (име, имейл, телефон, съдържание на съобщението) да бъдат обработвани от **[Фирма] ЕООД, ЕИК …** единствено с цел отговор на моето запитване, съгласно [Политиката за поверителност](/privacy). Данните се съхраняват до 12 месеца след приключване на кореспонденцията.

Забележка (правна информация): за отговор на запитване много DPO-та считат, че основанието е „преддоговорни отношения“ (чл. 6(1)(б) GDPR) или легитимен интерес, т.е. checkbox не е строго задължителен – но е широко прилагана практика в БГ и не вреди, ако е **непредварително отметнат** и текстът е ясен. Не ползвайте същия checkbox за маркетинг съобщения – маркетинговото съгласие трябва да е **отделно** (чл. 5–6 ЗЕТ, opt-in за нежелани търговски съобщения).

### 5.5. UX на грешки/успех

- Inline валидация при `blur`, не при всеки keystroke; ясен език („Въведете валиден имейл, напр. ivan@firma.bg“).
- Бутон с loading състояние и `aria-busy`; disable при submit, за да няма дублирания.
- Успех: замяна на формата с потвърждение („Благодаря! Ще отговоря до 1 работен ден. Копие е изпратено на …“) + `role="status"`; изпратете event към аналитиката (`plausible('Inquiry', {props:{type}})`).
- Грешка от сървъра: запазете въведеното, покажете алтернативен контакт (email/телефон/Telegram).
- Автоотговор до клиента: кратък, с ваше име, телефон, очакван срок; **без** маркетинг.

### 5.6. Съхранение и уведомления

- Имейлът във вашата поща е „source of truth“; Telegram уведомление за скорост на реакция (Bot API `sendMessage` към ваш chat_id).
- Ако пазите копия (D1/Sheets/Notion) – опишете го в политиката, задайте срок на изтриване (напр. 12–24 месеца), не пазете IP адрес по-дълго от необходимото за анти-спам (напр. 30 дни).

---

## 6. Правни изисквания в България и ЕС

> **Това е обща правна информация, не правен съвет.**

### 6.1. Задължителна идентификация на фирмата на сайта

**Чл. 4, ал. 1 от Закона за електронната търговия (ЗЕТ)** задължава доставчика на услуги на информационното общество (всеки бизнес сайт) да осигурява „безпрепятствен, пряк и постоянен достъп“ на получателите и на компетентните органи до ([ЗЕТ – текст](https://www.mi.government.bg/file/2015/09/zakon_za_elektronnata_targoviq-2024.pdf), [резюме на DigitalMarketing.bg](https://digitalmarketing.bg/ecommerce-law/)):

1. името или наименованието си (фирмата);
2. постоянния си адрес или седалището и адреса на управление;
3. адреса, на който упражнява дейността, ако е различен;
4. данни за кореспонденция, включително **телефон и електронна поща**;
5. данни за вписване в търговски или друг публичен регистър (**ЕИК**);
6. надзорен орган – когато дейността подлежи на разрешителен/лицензионен режим;
7. за регулирани професии – съответните данни;
8. **номер по ЗДДС**, когато е регистриран;
9. друга информация, предвидена в закон.

Чл. 4, ал. 2: ако се посочват цени – ясно дали включват данъци и такси.

**Чл. 13, ал. 1 от Търговския закон** допълнително изисква в търговската кореспонденция **и на интернет страницата** на търговеца да се посочват: фирма, седалище и адрес на управление, ЕИК и банкова сметка; при ООД/АД, ако се посочва капитал – и внесената част ([чл. 13 ТЗ – текст и практика](https://www.290caselaw.com/glossary/tz-13/)).

**Практическо решение:** блок във футъра на всички страници:

> Панков Солюшънс ЕООД · ЕИК 20XXXXXXX · ДДС № BG20XXXXXXX (ако е регистриран) · Седалище: гр. Плевен, ул. … · +359 … · office@… · Банкова сметка: IBAN … (може и в страница „Контакти/Импресум“)

Плюс страница **„Информация за доставчика“/„Импресум“** с пълния списък. Санкцията по ЗЕТ за неизпълнение е глоба/имуществена санкция (проверете актуалния размер в чл. 22 ЗЕТ).

### 6.2. Политика за поверителност (чл. 13 GDPR)

Задължителна, щом събирате данни през форма/аналитика/логове. Съдържание по [чл. 13 GDPR](https://gdpr-info.eu/art-13-gdpr/):

- администратор и контакт (фирма, ЕИК, адрес, email); ДЛЗД – ако има (за solo dev обикновено не е задължително);
- цели и **правно основание** за всяка обработка (форма – преддоговорни отношения/съгласие; аналитика – легитимен интерес; логове/анти-спам – легитимен интерес/сигурност; маркетинг – съгласие);
- легитимни интереси, когато се позовавате на тях;
- получатели/обработващи (Resend, Cloudflare, Plausible/Umami, Google Workspace, Telegram, Meta – ако има Pixel) и **трансфери извън ЕС** с механизъм (SCC/DPF);
- срок на съхранение или критерии;
- права: достъп, коригиране, изтриване, ограничаване, преносимост, възражение, оттегляне на съгласие;
- **право на жалба до КЗЛД** (Комисия за защита на личните данни, София 1592, бул. „Проф. Цветан Лазаров“ 2, kzld@cpdp.bg);
- дали предоставянето е задължително и последици; автоматизирано вземане на решения (обикновено „не“).

Двуезична (BG/EN) версия; дата на последна промяна; линк във футъра и до формата.

### 6.3. Cookies – трябва ли банер?

**Правна рамка:** ePrivacy директивата чл. 5(3) (транспонирана в Закона за електронните съобщения) изисква съгласие за съхраняване/достъп до информация на крайното устройство, освен когато е **строго необходимо** за услуга, поискана от потребителя. GDPR регулира последващата обработка на лични данни. Няма нужда от съгласие за необходими cookies (сесия, езикова преференция, CSRF, Turnstile).

**Cookieless аналитика (Plausible, Umami, Fathom, Cloudflare Web Analytics):** не използват cookies/localStorage идентификатори, работят с дневен хеш на IP+UA, който не се пази; Plausible публикува правен анализ, според който няма достъп до крайното устройство по смисъла на чл. 5(3), а обработката се основава на легитимен интерес (чл. 6(1)(f)) за измерване на аудитория – с уговорка, че това **не** покрива реклама/ретаргетинг ([Plausible: Legal assessment GDPR/ePrivacy](https://plausible.io/blog/legal-assessment-gdpr-eprivacy)). Френският CNIL допуска аналитика без съгласие при условия: информиране, възможност за възражение, само измерване на аудитория, без кръстосване с други данни, само за един сайт, съкратен IP, живот на тракера ≤ 13 месеца ([CNIL: Sheet n°16 analytics](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications)). Британският ICO е по-строг, Люксембург – като CNIL ([Luxgap: analytics exemptions 2026](https://luxgap.com/articles/cookies-analytics-exemption-cnil-cnpd-consentement-ico-2026)).

**За България:** при това проучване не открихме публикувани от **КЗЛД** специфични насоки за cookies/аналитика (секцията „Специфични насоки за различни сектори“ на cpdp.bg не съдържа такива) – прилагат се общите правила на GDPR/ePrivacy и насоките на EDPB. Разумна и разпространена позиция: **без банер при cookieless аналитика**, но с ясна секция „Аналитика“ в политиката за поверителност (какво, защо, легитимен интерес, как да възразите – напр. линк за opt-out/DNT). *(Правна информация, не съвет.)*

**Банер е задължителен**, ако зареждате: Meta Pixel, Google Analytics 4, Google Ads/remarketing, YouTube embed без privacy-mode, LinkedIn Insight Tag, HubSpot chat и др. Тогава: CMP (напр. Cookiebot, Iubenda, Klaro – open source, или self-hosted `vanilla-cookieconsent`), **блокиране преди съгласие**, равностойни бутони „Приемам/Отказвам“, без предварително отметнати категории, запис на съгласието, Cookie policy с таблица на cookies, лесно оттегляне (линк във футъра).

### 6.4. Общи условия, импресум, авторски права

- **Общи условия** за сайта не са законово задължителни за информационен B2B сайт (задължителни са при онлайн продажби на потребители). Кратка страница „Условия за ползване“ (авторски права, ограничена отговорност за съдържанието, приложимо право – България) е достатъчна и полезна. Договорите с клиенти са отделни документи.
- **Копирайт:** `© 2026 Панков Солюшънс ЕООД. Всички права запазени.` – не е задължителен по закон (авторското право възниква автоматично по ЗАПСП), но е добра практика. Уточнете лиценз на open-source код и на снимки (Unsplash/собствени).
- **Лога/имена на клиенти и case studies:** логото е защитена търговска марка/авторско произведение и **употребата му изисква съгласие** на клиента; факти за проекта могат да са под NDA. Практика: клауза в договора/офертата („Изпълнителят има право да посочва Възложителя и проекта в портфолиото си, включително логото, освен ако Възложителят възрази писмено“), а за стари клиенти – кратък имейл с потвърждение. Без съгласие: анонимизиран case study („производствена фирма от Северна България“) без лого и без идентифициращи екранни снимки. Пазете доказателство за съгласието.
- **Отзиви (testimonials):** Директива 2019/2161 (Omnibus) и ЗЗП забраняват фалшиви/подвеждащи отзиви и изискват прозрачност дали и как отзивите са проверени ([KeyGroup: Online reviews & EU consumer law](https://key-g.com/blog/legal-status-ratings-reviews-eu-consumer-law)). Правилата са потребителски, но за B2B важат общите забрани за заблуждаваща реклама (ЗЗК). Практика: реални цитати с име, длъжност, фирма, дата, писмено съгласие (имейл), без редакция на смисъла; не измисляйте отзиви; при рейтинг „5/5“ посочете източник (Google/Clutch).
- **Снимки на хора** (вкл. вие) – собствени или с лиценз; за клиенти – съгласие.

### 6.5. Ако споменавате проекти, финансирани от ЕС

Ако Pankov Solutions е **бенефициент** по програма 2021–2027 (напр. ваучери за ИКТ по ПКИП/ПНИИДИТ): по чл. 50 от Регламент (ЕС) 2021/1060 бенефициентът е длъжен на **официалния си уебсайт и в социалните мрежи** да публикува кратко описание на проекта (цели, резултати), пропорционално на подкрепата, като откроява финансовата подкрепа от ЕС; емблемата на ЕС с текст **„Съфинансирано от Европейския съюз“** (или „Финансирано от…“) на видимо място; плакат А3/електронен дисплей, а табели – над 100 000/500 000 EUR ([ЕК: Пакет за подпомагане на видимостта на ЕС 2021–2027, BG](https://ec.europa.eu/regional_policy/sources/policy/communication/support_kit_visibility_2127/bg.pdf), [Наръчник на бенефициента, eufunds.bg](https://eufunds.bg/sites/default/files/uploads/eip/docs/2024-06/1.%20NCS%20Appendix%201_Beneficiary's%20Handbook%20final.pdf)). Емблемата не се променя и не се комбинира с други лога по начин, който я омаловажава ([Правила за емблемата на ЕС, BG](https://commission.europa.eu/document/download/3192a0ef-6bda-4e1a-81ca-65ade2ffad73_bg?filename=eu-emblem-rules_bg.pdf)). Ако само сте **изпълнител** на ЕС-финансиран проект на клиент, изискванията са за клиента – но в case study не заблуждавайте относно ролята си.

### 6.6. Декларация за достъпност

Незадължителна (виж §4.1), препоръчителна: стандарт (WCAG 2.2 AA), дата на оценка, известни несъответствия, контакт за обратна връзка.

---

## 7. Аналитика и измерване

| Инструмент | Cookies | Банер | Цена | Бележки |
|---|---|---|---|---|
| **Plausible** (EU cloud, self-host CE) | не | не* | €9/м. (10k) или безплатно self-host | 1 KB скрипт, goals/custom events, EU хостинг ([Plausible: cookieless](https://plausible.io/cookieless-web-analytics)) |
| **Umami** (self-host / cloud) | не | не* | безплатно self-host на Hetzner (Postgres) | 2 KB, events, отчети; добър избор, щом имате VPS |
| **Fathom** | не | не* | $15/м. | Подобно на Plausible |
| **Cloudflare Web Analytics** | не | не* | безплатно | Най-прост, но без custom events/goals |
| **PostHog** (EU cloud) | по избор cookieless | без банер само в cookieless режим | безплатно до 1 M events | Session replay/heatmaps – **изискват съгласие** ако се включат |
| Google Analytics 4 | да | **да** | безплатно | + Consent Mode v2; данни към Google; повече риск, повече загуба от отказ на съгласие |

\* при условие, че не се използва за реклама/профилиране и е описано в политиката (виж §6.3). Независим анализ на API-surface на тези скриптове потвърждава „zero cookies“ за Plausible/Fathom/Umami/Cloudflare, докато някои „privacy“ инструменти ползват localStorage за persistent ID ([Nuxt Scripts: Privacy-first analytics compared](https://scripts.nuxt.com/learn/privacy-first-analytics-compared)).

**Препоръка:** Umami self-hosted на Hetzner (вече го имате, нула месечни разходи, данните са у вас) или Plausible cloud, ако не искате поддръжка.

**Конверсии:** custom event `Inquiry` при успешен submit (от сървърния отговор, не при клик), с prop `type`/`locale`; `Click: Phone`, `Click: Email`, `Click: Telegram`; UTM параметри в GBP/LinkedIn/Meta линкове. За форма без JS – event на success страницата.

**Google Search Console:** верификация чрез DNS TXT в Cloudflare (покрива всички субдомейни/протоколи), submit на sitemap, отделни отчети по страна/език; Bing Webmaster Tools (импортира от GSC; важен за ChatGPT/Copilot, които ползват Bing индекса).

**Meta Pixel (Meta Ads):** `_fbp`/`_fbc` са рекламни cookies – **изискват предварително съгласие** в ЕС, а CNIL е санкционирал сайтове за зареждане на Pixel без съгласие; Conversions API не заобикаля изискването – данните трябва да идват от потребители, дали съгласие ([FlowConsent: Meta Pixel GDPR guide](https://www.flowconsent.com/en/blog/meta-pixel-gdpr-compliance-guide)). Опции: (а) **без Pixel на сайта** – ползвайте Meta lead forms в самата платформа и UTM + Umami за атрибуция; (б) Pixel + CMP с блокиране преди съгласие + Meta Consent Mode/CAPI за тези, които са приели. За B2B сайт с ниска посещаемост вариант (а) обикновено е достатъчен и спестява банера.

**Uptime мониторинг:** UptimeRobot/BetterStack (безплатни планове, 1–5 мин. интервал), проверка и на `/api/contact` health endpoint; Cloudflare Health Checks при Pro. Синтетичен CWV мониторинг: PageSpeed Insights API + GitHub Action седмично или DebugBear/Unlighthouse.

---

## 8. Сигурност и операции

### 8.1. HTTPS и хедъри

Cloudflare/Vercel дават TLS автоматично; на VPS – Caddy (auto-ACME). Хедъри по [OWASP HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html) (в Cloudflare чрез `_headers` файл или Transform Rules; в Next.js – `headers()` в `next.config`):

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Content-Security-Policy: default-src 'self'; script-src 'self' https://challenges.cloudflare.com https://analytics.pankov.solutions; frame-src https://challenges.cloudflare.com; img-src 'self' data:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://analytics.pankov.solutions; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(), camera=(), microphone=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
X-Frame-Options: DENY
```

Стартирайте CSP в `Content-Security-Policy-Report-Only`, проверете в конзолата, после включете. За inline JSON-LD `<script type="application/ld+json">` CSP не се прилага (не е изпълним), но inline скриптове на Astro islands може да изискват nonce/hash – Astro поддържа `experimental.csp`. Тествайте на securityheaders.com и Mozilla Observatory.

### 8.2. Зависимости, бекъпи, CI/CD

- **Renovate/Dependabot** с групирани седмични PR; `npm audit` в CI; lockfile committed; pin на major версии на Astro/Tailwind.
- Кодът е в GitHub = бекъп на съдържанието; Umami DB на Hetzner – nightly `pg_dump` към Hetzner Storage Box/Backblaze B2 (3-2-1); Hetzner Backups (20 %) за VPS-а.
- **CI (GitHub Actions):** lint + typecheck + `astro check` + build + Pa11y/Lighthouse CI (`lhci autorun` с бюджети: performance ≥ 95, JS ≤ 60 KB) + link checker (`lychee`). Deploy: Cloudflare Pages GitHub интеграция – **preview URL за всеки PR**, production от `main`. Preview deploy-ите да са с `X-Robots-Tag: noindex` (Cloudflare Pages `*.pages.dev` – добавете хедър по environment).
- Secrets (RESEND_API_KEY, TURNSTILE_SECRET, TELEGRAM_BOT_TOKEN) само в environment variables на платформата; `.env` в `.gitignore`; Claude Code – `.claudeignore`/permissions, за да не чете `.env`.
- Логове на формата без PII в plain text (маскирайте email), ретенция ≤ 30 дни.

### 8.3. Домейн и email доставимост (SPF/DKIM/DMARC)

Google, Yahoo и Microsoft изискват от **всички** изпращачи SPF **и** DKIM, валиден PTR, TLS, а от bulk (5000+/ден) – и DMARC с alignment, one-click unsubscribe и спам под 0.3 %; неспазването води до отхвърляне, не до спам папка ([Google: Email sender guidelines](https://support.google.com/a/answer/81126?hl=en), [PowerDMARC: 2026 sender rules](https://powerdmarc.com/bulk-email-sender-requirements/)). За вашия домейн:

1. **SPF:** `v=spf1 include:_spf.google.com include:amazonses.com ~all` (Resend ползва SES – вземете точния include от Resend dashboard; макс. 10 DNS lookups).
2. **DKIM:** CNAME/TXT записите от Resend (`resend._domainkey`) и от Google Workspace (`google._domainkey`).
3. **DMARC:** `_dmarc TXT "v=DMARC1; p=quarantine; rua=mailto:dmarc@…; adkim=r; aspf=r"` – започнете с `p=none` за 2 седмици, наблюдавайте отчетите (dmarcian/Postmark DMARC Digests безплатни), после `quarantine`/`reject`.
4. **Alignment:** `From:` домейнът (`notify@mail.pankov.solutions` или основния) трябва да съвпада с DKIM `d=`; никога не изпращайте `From:` имейла на клиента – ползвайте `Reply-To`.
5. **MTA-STS + TLS-RPT**, BIMI (по избор), `Return-Path` субдомейн от Resend.
6. Тест: mail-tester.com ≥ 9/10, Google Postmaster Tools.
7. Домейн: авто-подновяване, registrar lock, DNSSEC в Cloudflare, `CAA` запис (`0 issue "letsencrypt.org"`, `0 issue "pki.goog"` според платформата).

---

## 9. Launch чеклист

**Съдържание и SEO**
- [ ] Всички страници BG + EN, без lorem ipsum, без счупени линкове (`lychee`)
- [ ] Уникални title/description; H1 по една; hreflang двупосочен + x-default; canonical
- [ ] `sitemap-index.xml`, `robots.txt` (без `Disallow: /` от staging!), llms.txt
- [ ] JSON-LD: Organization/ProfessionalService, Person/ProfilePage, Article + BreadcrumbList на case studies; валидирани в Rich Results Test
- [ ] OG/Twitter изображения 1200×630 за всички страници; проверка в opengraph.xyz / LinkedIn Post Inspector / Facebook Sharing Debugger
- [ ] Favicon набор: `favicon.ico`, `icon.svg`, `apple-touch-icon.png` (180×180), `site.webmanifest` с 192/512 px, `theme-color`
- [ ] 404 страница (HTTP 404, навигация, търсене/линкове), 500 страница; 301 редиректи от стари URL; `www`→apex; `http`→`https`
- [ ] Google Search Console (DNS verify) + Bing Webmaster: sitemap submitted, „Request indexing“ на главните страници; GBP профил свързан към сайта

**Performance**
- [ ] Lighthouse mobile ≥ 95 на Home, услуга, case study, контакт (в incognito, без разширения); PageSpeed Insights без „failing“ CWV
- [ ] LCP изображение: `fetchpriority="high"`, без lazy; AVIF/WebP; всички `<img>` с размери
- [ ] Шрифтове WOFF2 self-hosted, кирилски subset, `font-display`, без FOIT; проверка на кирилица на всички шрифтове/weights
- [ ] Общ JS < 60 KB; без неизползвани third-party скриптове; Brotli/HTTP3 включени; cache headers за assets

**Форма**
- [ ] Тест: валидно запитване (BG и EN) → имейл получен (не в спам, mail-tester ≥ 9), автоотговор, Telegram; Reply-To работи
- [ ] Тест на грешки: празни полета, невалиден email, honeypot попълнен (тих отказ), изтекъл Turnstile token, rate limit
- [ ] Работи без JavaScript; клавиатурна навигация; screen reader обявява грешки
- [ ] Конверсионен event пристига в аналитиката

**Достъпност**
- [ ] axe/Pa11y без critical; контраст на всички текстове/бутони; фокус видим; skip link; `prefers-reduced-motion`; target size ≥ 24 px; `lang` атрибути

**Кросбраузър/мобилни**
- [ ] Chrome, Safari (macOS + iOS), Firefox, Edge; Android Chrome; 320 px ширина без хоризонтален скрол; dark mode (ако има); печат на case study (по избор)

**Право и доверие**
- [ ] Футър: фирма, ЕИК, ДДС №, седалище/адрес, телефон, имейл (чл. 4 ЗЕТ, чл. 13 ТЗ); IBAN на страница „Контакти“/„Импресум“
- [ ] Политика за поверителност (BG/EN) с всички точки по чл. 13 GDPR, вкл. Resend/Cloudflare/Umami/Telegram и трансфери; линк до формата и във футъра
- [ ] Cookie policy/банер **само ако** има non-essential cookies; иначе секция „Аналитика“ в политиката + opt-out
- [ ] Условия за ползване, © бележка, декларация за достъпност (по избор)
- [ ] Писмено съгласие за всяко клиентско лого/име/отзив; анонимизирани case studies, където няма
- [ ] ЕС емблема + „Съфинансирано от Европейския съюз“ + описание, ако сте бенефициент

**Сигурност/ops**
- [ ] HTTPS everywhere, HSTS, CSP enforce, securityheaders.com „A“; SPF/DKIM/DMARC валидни (MXToolbox)
- [ ] Preview deploy-и с noindex; production env vars; secrets извън repo
- [ ] Uptime monitor + известие; Renovate включен; бекъп на Umami DB тестван (restore!)
- [ ] Регистриран домейн с auto-renew, DNSSEC, CAA; WHOIS контакт актуален

---

## Източници

1. [Vercel – Next.js vs. Astro in 2026: A full comparison guide](https://vercel.com/i/astro-vs-next-js)
2. [Easton – Astro vs Next.js for Static Sites (дек. 2025)](https://eastondev.com/blog/en/posts/dev/20251202-astro-vs-nextjs-static-site/)
3. [webaloha – Astro vs Next.js for business websites 2026](https://webaloha.co/astro-vs-nextjs-for-business-websites/)
4. [Astro Docs – Internationalization (i18n) Routing](https://docs.astro.build/en/guides/internationalization/)
5. [Astro Docs – Images](https://docs.astro.build/en/guides/images/)
6. [Next.js Docs – Metadata and OG images (v16, авг. 2026)](https://nextjs.org/docs/app/getting-started/metadata-and-og-images)
7. [Lucky Media – Keystatic CMS Review 2026](https://www.luckymedia.dev/insights/keystatic)
8. [DEV – The Complete Astro CMS Guide](https://dev.to/opacedigitalagency/the-complete-headless-cms-guide-for-astro-comparing-13-jamstack-js-cms-platforms-566f)
9. [DevToolReviews – Vercel vs Netlify vs Cloudflare Pages pricing 2026](https://www.devtoolreviews.com/reviews/vercel-vs-netlify-vs-cloudflare-pages-pricing-comparison-2026)
10. [ceaksan – I Self-Hosted 4 Projects on Hetzner + Coolify](https://ceaksan.com/en/hetzner-coolify-self-hosting-reality)
11. [web.dev – Web Vitals](https://web.dev/articles/vitals)
12. [web.dev – The most effective ways to improve Core Web Vitals](https://web.dev/articles/top-cwv)
13. [web.dev – Best practices for fonts](https://web.dev/articles/font-best-practices)
14. [Unlighthouse – Don't lazy-load your LCP image](https://unlighthouse.dev/learn-lighthouse/lcp/lcp-lazy-loaded)
15. [Google Search Central – Localized versions of your pages (hreflang)](https://developers.google.com/search/docs/specialty/international/localized-versions)
16. [Google Search Central – LocalBusiness structured data](https://developers.google.com/search/docs/appearance/structured-data/local-business)
17. [Google Search Central – ProfilePage structured data](https://developers.google.com/search/docs/appearance/structured-data/profile-page)
18. [Google Search Central – Image SEO best practices](https://developers.google.com/search/docs/appearance/google-images)
19. [Google Business Profile Help – Service areas](https://support.google.com/business/answer/9157481?hl=en)
20. [og-image.org – OG Image Size 2026](https://og-image.org/learn/og-image-size)
21. [SEO-Kreativ – E-E-A-T Guide 2026](https://www.seo-kreativ.de/en/blog/e-e-a-t-guide-for-more-trust-and-top-rankings/)
22. [TechWyse – Google says llms.txt will not help rankings (юни 2026)](https://www.techwyse.com/news/ai-search/google-llms-txt-no-ranking-benefit-june-2026)
23. [Passionfruit – Should I create an llms.txt file? 2026](https://www.getpassionfruit.com/blog/should-i-create-an-llms.txt-file-google-s-2026-guidance-explained)
24. [W3C – WCAG 2.2](https://www.w3.org/TR/WCAG22/)
25. [TetraLogical – What's new in WCAG 2.2](https://tetralogical.com/blog/2023/10/05/whats-new-wcag-2.2/)
26. [Попов, Арнаудов и партньори – Новите изисквания за достъпност на продукти и услуги (2025)](https://popovarnaudov.bg/wp-content/uploads/2025/07/Novina-dostapnost-2_cl.pdf)
27. [Ciela – Закон за изискванията за достъпност на продукти и услуги](https://www.ciela.net/svobodna-zona-normativi/view/2137249754/zakon-za-iziskvaniyata-za-dostapnost-na-produkti-i-uslugi)
28. [Cloudflare Turnstile – Server-side validation](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)
29. [Resend – Send emails with Next.js](https://resend.com/docs/send-with-nextjs)
30. [WebTechs – How to stop contact form spam (2026)](https://www.webtechs.net/stop-contact-form-spam/)
31. [Министерство на икономиката – Закон за електронната търговия (PDF)](https://www.mi.government.bg/file/2015/09/zakon_za_elektronnata_targoviq-2024.pdf)
32. [DigitalMarketing.bg – Закон за електронната търговия (резюме)](https://digitalmarketing.bg/ecommerce-law/)
33. [290caselaw – чл. 13 Търговски закон](https://www.290caselaw.com/glossary/tz-13/)
34. [gdpr-info.eu – Art. 13 GDPR](https://gdpr-info.eu/art-13-gdpr/)
35. [КЗЛД – Специфични насоки за различни сектори](https://cpdp.bg/специфични-насоки-за-различни-сектори/)
36. [CNIL – Sheet n°16: Use analytics on your websites](https://www.cnil.fr/en/sheet-ndeg16-use-analytics-your-websites-and-applications)
37. [Luxgap – Analytics cookies exemptions CNIL/CNPD/ICO 2026](https://luxgap.com/articles/cookies-analytics-exemption-cnil-cnpd-consentement-ico-2026)
38. [Plausible – Legal assessment GDPR/ePrivacy](https://plausible.io/blog/legal-assessment-gdpr-eprivacy)
39. [Plausible – Cookieless web analytics](https://plausible.io/cookieless-web-analytics)
40. [Nuxt Scripts – Privacy-first analytics compared (2026)](https://scripts.nuxt.com/learn/privacy-first-analytics-compared)
41. [FlowConsent – Meta Pixel and GDPR compliance guide](https://www.flowconsent.com/en/blog/meta-pixel-gdpr-compliance-guide)
42. [KeyGroup – Online reviews & EU consumer law](https://key-g.com/blog/legal-status-ratings-reviews-eu-consumer-law)
43. [ЕК – Пакет за подпомагане на видимостта на ЕС 2021–2027 (BG)](https://ec.europa.eu/regional_policy/sources/policy/communication/support_kit_visibility_2127/bg.pdf)
44. [ЕК – Използване на емблемата на ЕС 2021–2027 (BG)](https://commission.europa.eu/document/download/3192a0ef-6bda-4e1a-81ca-65ade2ffad73_bg?filename=eu-emblem-rules_bg.pdf)
45. [eufunds.bg – Наръчник на бенефициента (Приложение 1 към НКС 2021–2027)](https://eufunds.bg/sites/default/files/uploads/eip/docs/2024-06/1.%20NCS%20Appendix%201_Beneficiary's%20Handbook%20final.pdf)
46. [OWASP – HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
47. [Google – Email sender guidelines](https://support.google.com/a/answer/81126?hl=en)
48. [PowerDMARC – Bulk email sender rules 2026](https://powerdmarc.com/bulk-email-sender-requirements/)

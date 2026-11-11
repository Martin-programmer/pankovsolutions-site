# pankovsolutions.com

Сайтът на Pankov Solutions. Astro 5 (static), хостинг Cloudflare Worker със статични файлове.
Правилата за работа са в `CLAUDE.md`. Българският е основен (без префикс), английският е под `/en`.

```
npm run dev            # Astro dev сървър (без формите — те са в Worker-а)
npm run build          # production build в dist/
npm run dev:functions  # wrangler dev: dist/ + worker/ (формите) на http://localhost:8788
npm run check          # astro check
npm run test:form      # формите (запитване + проверка за ЕС финансиране) срещу dev:functions
npm run shot -- <url> <папка>   # скрийншоти 1440/390
npm run overflow -- <url> [ширина]
npm run serve:dist     # dist/ на 127.0.0.1:4177 — за одитите
npm run audit:lh       # Lighthouse CI, mobile, праг 95 (lighthouserc.cjs)
npm run audit:a11y     # pa11y-ci, WCAG 2.2 AA
npm run audit:js       # JS на страница, бюджет 60 KB gzip
```

## Как е устроен сайтът

- `src/design/bg/*.html`, `src/design/en/*.html` — HTML-ът на всяка страница, пренесен от
  дизайна (Claude Design). Името на файла е ключът на страницата с `/` → `__`
  (`services__erp.html` = `/services/erp`). `_header.html` и `_footer.html` са общи.
- `src/design/css/*.css` — стиловете на отделните страници; `src/design/index.json` казва коя
  страница кой файл ползва. Общите стилове са в `src/styles/design.css` + `site.css`.
- `src/data/pages.ts` — регистърът: заглавие, описание (SEO) и име на всяка страница на двата
  езика. Нова страница = ред тук + HTML файл за bg и en.
- `src/pages/[...path].astro` генерира всички адреси; `src/lib/render.ts` подменя маркерите
  (активно меню, бутон в хедъра, превключвател на езика, Turnstile) и строи JSON-LD
  (Organization, WebSite, BreadcrumbList, Service, Article, FAQPage — въпросите се вадят от
  `<details>` на страницата).
- `src/scripts/site.ts` — целият JS: спиране на логата, формата за запитване (грешки по поле,
  `?service=<slug>` избира услугата), 5-стъпковата проверка за ЕС финансиране.
- `public/consent.js` — банерът за бисквитки (GDPR, Google Consent Mode v2, Meta). Показва се
  само ако при build има поне едно от `GA4_ID`, `GOOGLE_ADS_ID`, `META_PIXEL_ID`.
- OG картинките се генерират при build (`src/pages/og/[...slug].png.ts`, `src/lib/og.ts`).
- `public/_redirects` — 301 от адресите на стария сайт.

## Имейли

Брандирани HTML имейли (с текстова версия) са в `functions/email.ts`: известие за запитване,
автоотговор, известие и потвърждение за листа с чакащи (ЕС). Текстовете за грешки са в
`functions/messages.ts`.

## Форма - настройка

Формата за запитване (начална страница и `/contact`) праща POST към `/api/inquiry` —
обработва се в `functions/api/inquiry.ts`, извикван от Worker-а `worker/index.ts` (сайтът е
Cloudflare Worker със статични файлове от `dist/`; `wrangler.toml`). Ред на обработка: honeypot → timing
(под 3 s) → rate limit (KV, 5 на час на IP) → Turnstile → Zod → Resend (известие до
`hello@` + автоотговор) → Telegram → отговор. Работи и без JavaScript (303 към
`/contact/sent` или `/contact/error`).

Секретите живеят **само** в Cloudflare (Worker → Settings → Variables and Secrets) и локално в
`.dev.vars` (в `.gitignore`). Никога в repo-то.

### 0. Cloudflare Worker от GitHub (Workers Builds)

Cloudflare вече не предлага Pages за нови акаунти - сайтът е **Worker със статични файлове**
(`wrangler.toml`: `main = worker/index.ts`, `assets.directory = ./dist`).

1. Dashboard → Compute (Workers & Pages) → **Create application** → **Import a repository**
   (Connect to Git) → GitHub → `Martin-programmer/pankovsolutions-site`.
2. Build settings: Build command `npm run build`, Deploy command `npx wrangler deploy`
   (по подразбиране), Root directory `/`. Save and Deploy.
3. Custom domain: Worker → Settings → Domains & Routes → **Add** → `pankovsolutions.com`
   (и `www`). Домейнът трябва да е в Cloudflare DNS.
4. **Build-time** променливи (четат се при `npm run build`): Worker → Settings → **Build** →
   Variables and secrets: `TURNSTILE_SITE_KEY`, `UMAMI_URL`, `UMAMI_WEBSITE_ID`.
   **Runtime** секрети (четат се от формата): Worker → Settings → **Variables and Secrets**:
   `TURNSTILE_SECRET`, `RESEND_API_KEY`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` (тип Secret);
   по избор `NOTIFY_TO` (Text) - имейл, на който идват запитванията, ако не е `hello@`.
5. Preview: всеки push към клон различен от `main` се build-ва с `X-Robots-Tag: noindex`
   (`scripts/headers.mjs`, `WORKERS_CI_BRANCH`).

### 1. Локално, без ключове (mock)

```
npm run build
copy .dev.vars.example .dev.vars      # съдържа INQUIRY_MOCK=1
npm run dev:functions                 # wrangler dev → http://localhost:8788/contact
```

С `INQUIRY_MOCK=1` функцията валидира всичко, но не праща нищо - payload-ът се появява в
конзолата на wrangler. Turnstile се прескача, а виджетът не се рендерира, защото при build
няма `TURNSTILE_SITE_KEY`.

Ръчен тест с curl (JSON отговор заради `Accept`):

```
curl -s -X POST http://localhost:8788/api/inquiry -H "accept: application/json" ^
  -d "name=Тест Тестов" -d "email=test@example.com" -d "phone=0888123456" -d "service=erp" ^
  -d "message=Пробно запитване от curl, десет знака."
```

### 2. Cloudflare Turnstile

1. Dashboard → Turnstile → **Add widget**: домейн `pankovsolutions.com` (добави и
   `*.workers.dev` за preview), widget mode **Managed**.
2. Копирай **Site key** и **Secret key**.
3. `TURNSTILE_SITE_KEY` → Worker → Settings → Build → Variables (влиза в HTML-а при build);
   `TURNSTILE_SECRET` → Worker → Settings → Variables and Secrets (Secret).
4. Локално: `TURNSTILE_SITE_KEY` в `.env` (за `npm run build`), `TURNSTILE_SECRET` в `.dev.vars`.

Виджетът (`<div class="cf-turnstile">` + `challenges.cloudflare.com/turnstile/v0/api.js`) е
единственият external скрипт освен Umami и се зарежда само на страници с форма.

### 3. Resend + верификация на домейна (SPF/DKIM/DMARC)

1. resend.com → **Domains → Add domain**: `pankovsolutions.com`, регион EU (Ireland).
2. Resend показва DNS записи. Добави ги в Cloudflare DNS (Proxy **off** за всички):
   - **DKIM**: `TXT` `resend._domainkey` → стойността от Resend;
   - **SPF** за под-домейна на Resend: `TXT` `send` → `v=spf1 include:amazonses.com ~all`
     и `MX` `send` → `feedback-smtp.eu-west-1.amazonses.com` (приоритет 10);
   - ако домейнът има и друга поща (Google Workspace / Email Routing), основният SPF на
     `@` остава един запис и включва и двете: `v=spf1 include:_spf.google.com include:amazonses.com ~all`;
   - **DMARC**: `TXT` `_dmarc` → `v=DMARC1; p=quarantine; rua=mailto:hello@pankovsolutions.com; adkim=s; aspf=s`
     (започни с `p=none` за 1-2 седмици, после `quarantine`).
3. Изчакай **Verified** в Resend, после **API Keys → Create**: permission *Sending access*,
   domain `pankovsolutions.com`. Ключът → `RESEND_API_KEY` (Secret) в Worker-а и в `.dev.vars`.
4. Пощенската кутия `hello@pankovsolutions.com` трябва да съществува (получава запитванията):
   най-лесно Cloudflare → Email → **Email Routing** → препращане към личен имейл.
5. Тест на репутацията: прати през формата до адрес от mail-tester.com - цел над 9/10.

Известията идват от `Pankov Solutions <hello@pankovsolutions.com>` с `reply-to` подателя;
автоотговорът е HTML шаблон от `functions/email.ts`.

### 4. Telegram бот

1. В Telegram → **@BotFather** → `/newbot` → име и username (напр. `pankov_inquiries_bot`).
   BotFather връща **token** → `TELEGRAM_BOT_TOKEN` (Secret).
2. Отвори чат с бота и му прати каквото и да е (иначе не може да ти пише).
3. Вземи **chat id**: `https://api.telegram.org/bot<TOKEN>/getUpdates` → `message.chat.id`
   → `TELEGRAM_CHAT_ID`.
4. Проверка: `https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>&text=test`.

Telegram получава цялото запитване (решение на Марти). Ако падне, функцията пак връща успех.

### 5. KV namespace за rate limit

1. Dashboard → Storage & Databases → **KV** → Create namespace: `inquiry-rate-limit`.
2. Копирай **ID**-то и го сложи в `wrangler.toml` → `[[kv_namespaces]]` → `id` (вместо
   `REPLACE_WITH_KV_NAMESPACE_ID`), комит и push - деплоят го закача автоматично.
3. Локално `npm run dev:functions` ползва локален in-memory namespace.

Лимит: 5 запитвания на час на IP (`functions/api/inquiry.ts`, `RATE_LIMIT`).

### 6. Umami (аналитика без бисквитки)

1. Или **Umami Cloud** (cloud.umami.is, безплатен план) - или self-hosted (docker на Hetzner;
   при self-hosted в ЕС политиката за поверителност не се променя, при Cloud - добави Umami
   Software, Inc. като обработващ в политиката за поверителност).
2. **Add website** → `pankovsolutions.com` → копирай **Website ID** и адреса на скрипта
   (Cloud: `https://cloud.umami.is`; self-hosted: твоят домейн).
3. Worker → Settings → **Build** → Variables (четат се при build): `UMAMI_URL` = адресът без
   `/script.js`, `UMAMI_WEBSITE_ID` = ID-то. Без тях скриптът не се вгражда, а CSP-то не го допуска.
4. Проверка след деплой: в Umami → Realtime се вижда посещението; в DevTools → Network
   има заявка към `.../api/send` със статус 200.

### 7. Променливи - обобщение

| Име | Къде | Какво |
|---|---|---|
| `TURNSTILE_SITE_KEY` | Worker → Build → Variables / `.env` | публичен ключ на виджета |
| `TURNSTILE_SECRET` | Worker → Variables and Secrets / `.dev.vars` | siteverify |
| `RESEND_API_KEY` | Worker → Variables and Secrets / `.dev.vars` | изпращане на имейли |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Worker → Variables and Secrets / `.dev.vars` | известие |
| `NOTIFY_TO` | Worker → Variables and Secrets | къде идват запитванията (по подразбиране hello@) |
| `INQUIRY_RL` | `wrangler.toml` → kv_namespaces (id от Dashboard → KV) | rate limit |
| `INQUIRY_MOCK` | само `.dev.vars` | `1` = не праща, логва |
| `UMAMI_URL`, `UMAMI_WEBSITE_ID` | Worker → Build → Variables / `.env` | аналитика; без тях няма скрипт |
| `GA4_ID`, `GOOGLE_ADS_ID`, `META_PIXEL_ID` | Worker → Build → Variables / `.env` | Google Analytics 4 (`G-…`), Google Ads (`AW-…`), Meta Pixel; зареждат се само след съгласие |
| `CONSENT_LOG` | `wrangler.toml` → kv_namespaces (по избор) | записи за дадено съгласие за бисквитки (доказателство по чл. 7 GDPR); без него записите са само в лога |

### 8. Реклами и проследяване (Google, Meta)

1. GA4: Admin → Data streams → Web → **Measurement ID** (`G-…`) → `GA4_ID`. В Admin → Data
   retention сложи **14 months** (така е в политиката за поверителност).
2. Google Ads: Tools → Conversions → Google tag → ID (`AW-…`) → `GOOGLE_ADS_ID`.
3. Meta: Events Manager → Data sources → Pixel ID → `META_PIXEL_ID`.
4. И трите са Build Variables (влизат в HTML-а при build). Скриптовете на Google и Meta се
   зареждат от `public/consent.js` чак след съгласие; CSP-то в `public/_headers` ги допуска.
5. Доказателство за съгласието: Dashboard → KV → Create namespace `consent-log`, ID-то в
   `wrangler.toml` като `[[kv_namespaces]] binding = "CONSENT_LOG"`. Записите се пазят 3 години.

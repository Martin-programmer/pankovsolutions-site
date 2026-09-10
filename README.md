# pankovsolutions.com

Портфолио сайт на Pankov Solutions. Astro 5 (static) + Tailwind v4, хостинг Cloudflare Pages.
Правилата за работа са в `CLAUDE.md`, дизайнът в `DESIGN.md`, текстът в `COPY.md`, прегледът
в `CHECKLIST.md`. Съдържанието е в `content/bg/` (източник на истината) и `content/en/`.

```
npm run dev            # Astro dev сървър (без формата — тя е в Worker-а)
npm run build          # production build в dist/
npm run preview        # сервира dist/
npm run dev:functions  # wrangler dev: dist/ + worker/ (формата) на http://localhost:8788
npm run check          # astro check
npm run shot -- <url> <папка>   # скрийншоти 1440/390 (Playwright през Edge)
npm run crop -- <url> "<селектор>" <файл>
npm run overflow -- <url> [ширина]
npm run test:form -- http://127.0.0.1:8788 .shots   # формата: грешки по поле, успех (срещу dev:functions)
npm run serve:dist                                   # dist/ с компресия на 127.0.0.1:4177 — за одитите по-долу
npm run audit:lh                                     # Lighthouse CI, mobile, 6 URL, праг 95 (lighthouserc.cjs)
npm run audit:a11y                                   # pa11y-ci, axe + htmlcs, WCAG 2.2 AA (.pa11yci.json)
npm run audit:js                                     # JS на страница, бюджет 60 KB gzip
```

Одитите са на порт 4177 и през `127.0.0.1` нарочно: забравен `astro dev` слуша на `[::1]:4321`
и `localhost:4321` отива при него — тогава Lighthouse мери dev toolbar-а (perf ~56).
В `.pa11yci.json` `hideElements: "svg.diagram"` — axe не чете `fill`/фон на SVG текст и
докладва фалшив контраст за етикетите на схемата (реално 5,9-14:1); схемата е `role="img"`
с `<title>`.

## Форма - настройка

Формата за запитване (`src/components/InquiryForm.astro`) праща POST към `/api/inquiry` —
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
  -d "name=Тест Тестов" -d "email=test@example.com" -d "type=eu" ^
  -d "message=Пробно запитване от curl, десет знака." -d "consent=on"
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
автоотговорът е с текста от `src/i18n/ui.ts` (`mail.autoreply.*`).

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
   Software, Inc. като обработващ в `content/bg/privacy.md`).
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

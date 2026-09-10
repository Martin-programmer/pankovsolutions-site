# pankovsolutions.com

Портфолио сайт на Pankov Solutions. Astro 5 (static) + Tailwind v4, хостинг Cloudflare Pages.
Правилата за работа са в `CLAUDE.md`, дизайнът в `DESIGN.md`, текстът в `COPY.md`, прегледът
в `CHECKLIST.md`. Съдържанието е в `content/bg/` (източник на истината) и `content/en/`.

```
npm run dev            # Astro dev сървър (без формата — тя е Pages Function)
npm run build          # production build в dist/
npm run preview        # сервира dist/
npm run dev:functions  # wrangler pages dev: dist/ + functions/ на http://localhost:8788
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
Cloudflare Pages Function в `functions/api/inquiry.ts`. Ред на обработка: honeypot → timing
(под 3 s) → rate limit (KV, 5 на час на IP) → Turnstile → Zod → Resend (известие до
`hello@` + автоотговор) → Telegram → отговор. Работи и без JavaScript (303 към
`/contact/sent` или `/contact/error`).

Секретите живеят **само** в Cloudflare (Pages → Settings → Environment variables) и локално в
`.dev.vars` (в `.gitignore`). Никога в repo-то.

### 1. Локално, без ключове (mock)

```
npm run build
copy .dev.vars.example .dev.vars      # съдържа INQUIRY_MOCK=1
npm run dev:functions                 # http://localhost:8788/contact
```

С `INQUIRY_MOCK=1` функцията валидира всичко, но не праща нищо — payload-ът се появява в
конзолата на wrangler. Turnstile се прескача, а виджетът не се рендерира, защото при build
няма `TURNSTILE_SITE_KEY`.

Ръчен тест с curl (JSON отговор заради `Accept`):

```
curl -s -X POST http://localhost:8788/api/inquiry -H "accept: application/json" ^
  -d "name=Тест Тестов" -d "email=test@example.com" -d "type=eu" ^
  -d "message=Пробно запитване от curl, десет знака." -d "consent=on"
```

### 2. Cloudflare Turnstile

1. Cloudflare Dashboard → Turnstile → **Add site**: домейн `pankovsolutions.com` (за preview
   деплойте добави и `*.pages.dev`), widget mode **Managed**.
2. Копирай **Site key** и **Secret key**.
3. Pages → проекта → Settings → Environment variables:
   - `TURNSTILE_SITE_KEY` = site key (Production и Preview) — чете се при build и влиза в HTML-а;
   - `TURNSTILE_SECRET` = secret key (**Encrypt**).
4. Локално: `TURNSTILE_SITE_KEY` в `.env` (за `npm run build`), `TURNSTILE_SECRET` в `.dev.vars`.

Виджетът (`<div class="cf-turnstile">` + `challenges.cloudflare.com/turnstile/v0/api.js`) е
единственият external скрипт на сайта и се зарежда само на страници с форма.

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
   domain `pankovsolutions.com`. Ключът → `RESEND_API_KEY` (Encrypt) в Pages и в `.dev.vars`.
4. Тест на репутацията: прати през формата до адрес от mail-tester.com — цел ≥ 9/10
   (CHECKLIST §D).

Известията идват от `Pankov Solutions <hello@pankovsolutions.com>` с `reply-to` подателя;
автоотговорът е с текста от COPY.md §Микрокопи (`src/i18n/ui.ts`, `mail.autoreply.*`).

### 4. Telegram бот

1. В Telegram → **@BotFather** → `/newbot` → име и username (напр. `pankov_inquiries_bot`).
   BotFather връща **token** → `TELEGRAM_BOT_TOKEN` (Encrypt).
2. Отвори чат с бота и му прати каквото и да е (иначе не може да ти пише).
3. Вземи **chat id**: `https://api.telegram.org/bot<TOKEN>/getUpdates` → `message.chat.id`
   → `TELEGRAM_CHAT_ID`.
4. Проверка: `https://api.telegram.org/bot<TOKEN>/sendMessage?chat_id=<ID>&text=test`.

Telegram е известие, не условие: ако падне, запитването вече е в пощата и функцията връща успех.

### 5. KV binding за rate limit

1. Cloudflare → Workers & Pages → **KV** → Create namespace: `inquiry-rate-limit`.
2. Pages → проекта → Settings → **Bindings → KV namespace**: variable name **`INQUIRY_RL`**,
   namespace `inquiry-rate-limit` (за Production и Preview).
3. Локално `npm run dev:functions` подава `--kv INQUIRY_RL` (локален in-memory namespace).
   Без binding функцията прескача rate limit-а и го логва.

Лимит: 5 запитвания на час на IP (`functions/api/inquiry.ts`, `RATE_LIMIT`).

### 6. Променливи - обобщение

| Име | Къде | Какво |
|---|---|---|
| `TURNSTILE_SITE_KEY` | Pages env (build) / `.env` | публичен ключ на виджета |
| `TURNSTILE_SECRET` | Pages env (Encrypt) / `.dev.vars` | siteverify |
| `RESEND_API_KEY` | Pages env (Encrypt) / `.dev.vars` | изпращане на имейли |
| `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID` | Pages env (Encrypt) / `.dev.vars` | известие |
| `INQUIRY_RL` | Pages → Bindings → KV | rate limit |
| `INQUIRY_MOCK` | само `.dev.vars` | `1` = не праща, логва |

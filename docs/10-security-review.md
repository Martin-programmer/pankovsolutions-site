# 10 · Преглед на сигурността (10.09.2026)

Обхват: статичен сайт (Astro) + Cloudflare Worker (`worker/index.ts`) + форма `/api/inquiry`
(`functions/api/inquiry.ts`). Няма вход с парола, база данни или плащания - повърхността е
формата, headers, скриптовете от трети страни и веригата от зависимости.

## Находки и какво е направено

| Тежест | Находка | Поправка |
|---|---|---|
| Средна | Cross-site POST: друг сайт можеше да прати формата ни от свое име (CSRF). Turnstile го ограничава, но не е предназначен за това. | `sameOrigin()`: Origin трябва да е нашият; при липсващ Origin се гледа `Sec-Fetch-Site`. Чужд произход → 403. |
| Средна | Тялото на заявката се четеше без лимит и без try/catch: голямо или невалидно тяло → CPU + необработена грешка (500 от Worker-а). | `Content-Length` > 32 KB → 413; невалидно тяло → 400. |
| Ниска | Логовете при грешка съдържаха целия отговор на Resend/Telegram (може да включва имейла на подателя; при мрежова грешка - URL с Telegram токена). | `safeError()`: само статус и първи ред, токенът се маскира; отговорът на API-тата не се логва. |
| Ниска | Името от формата влизаше в темата на имейла без филтър за нови редове. | `oneLine()` за темата. |
| Ниска | 303 отговорите на формата нямаха `Cache-Control: no-store`. | Добавен; `/api/*` получава и `no-store` + `noindex` в `_headers`. |
| Ниска | Липсваха `Cross-Origin-Opener-Policy` и `Cross-Origin-Resource-Policy`. | COOP `same-origin` глобално; CORP `same-origin` за `/_astro/*` и `/fonts/*` (OG картинките нарочно без CORP - социалните мрежи ги теглят). |

## Проверено и наред

- **XSS**: потребителски вход никога не влиза в HTML - отговорите на сървъра се показват с
  `textContent`, няма `innerHTML`/`eval`; `set:html` се ползва само за съдържание от `content/`.
- **Имейл**: Resend получава JSON с `text` (не HTML); `reply_to` е валидиран от Zod като имейл.
- **Telegram**: без `parse_mode` → текстът не се интерпретира като HTML/Markdown.
- **Секрети**: няма в repo/dist (grep за Resend/Telegram/Turnstile формати - 0 извън
  `package-lock.json` хешовете); `.env`, `.dev.vars` са в `.gitignore`; секретите са само в
  Cloudflare. Mock режимът (`INQUIRY_MOCK=1`) е env променлива - не я слагай в production.
- **Headers**: HSTS preload, nosniff, X-Frame-Options DENY + `frame-ancestors 'none'`,
  Referrer-Policy, Permissions-Policy, CSP без `unsafe-inline` за скриптове (само self,
  Turnstile, Umami), `form-action 'self'`, `base-uri 'self'`, `object-src 'none'`.
  `style-src 'unsafe-inline'` остава заради inline CSS на Astro - приемлив риск при липса на
  потребителски HTML.
- **Worker**: само `/api/inquiry` стига до handler-а; GET/HEAD/OPTIONS → 405 с `Allow: POST`;
  всичко друго е статичен файл; `not_found_handling = 404-page`.
- **Формата**: honeypot + timing + rate limit (KV, 5/час/IP, брои се след валидна заявка) +
  Turnstile server-side + Zod с горни граници на всяко поле; `locale` е валидиран (без open
  redirect); отговорите с грешка не разкриват вътрешности.
- **Трети страни**: само Turnstile и Umami (без SRI - скриптовете им се променят; CSP ги
  ограничава до тези хостове); шрифтовете са self-hosted.
- **Информация**: `/styleguide`, `/contact/sent|error`, `/404` са `noindex` и извън sitemap;
  `llms.txt` съдържа само публични текстове.
- **Поща**: README §3 - DKIM + SPF на `send.` + DMARC (`p=none` → `quarantine`); Resend
  верифицира домейна, така че `From: hello@` не може да се фалшифицира през Resend.

## Не е правено / за Марти

1. `npm audit` не можа да се пусне в тази сесия - пусни `npm audit --omit=dev` и при
   High/Critical ъпдейт на пакета.
2. HSTS `preload` е заявен в header-а, но не е подаден на hstspreload.org - по избор; ако се
   подаде, всички поддомейни трябва да са HTTPS завинаги.
3. Cloudflare → Security → **Bot Fight Mode** (безплатен) и WAF managed rules са допълнителен
   слой пред Worker-а - включват се с един клик.
4. Периодично: `npm update` + `npm audit`; ротация на Resend/Telegram ключовете при съмнение.

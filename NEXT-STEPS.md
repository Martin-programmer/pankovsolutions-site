# NEXT-STEPS.md — как продължаваме оттук

Състояние към 03.09.2026: рисърчът е готов (`docs/00-05`), решенията са взети, repo файловете
(`CLAUDE.md`, `DESIGN.md`, `COPY.md`, `CHECKLIST.md`, `src/styles/tokens.css`) и българските
чернови на съдържанието (`content/bg/`) са написани. Не е писан код.

## Стъпка 1 — Марти преглежда съдържанието (1-2 дни, без Claude)
Отвори `content/bg/*.md` и `content/bg/projects/*.md`. За всеки `<!-- TODO -->`: попълни или
изтрий. Най-важни: години/периоди в `about.md`, числата в кейсовете (брой служители, курсове,
табла, дати), едно изречение „какво бих направил различно“ на кейс. Не се старай да е красиво -
после минаваме с `copy-editor`.

Паралелно: прати имейла за отзив + лого (шаблон: `docs/05` §5) на Домоуправител България,
КИВИ-ТВ, stegi.store, Сикрет Леджънд, KSG Brand, INFRALINK, Her Harmony Glow; и на Биляна -
да потвърди текста за „Еко Глоуб“ в `about.md` и `for-beneficiaries.md` + да прати лого SVG.

## Стъпка 2 — Инфраструктура (1 вечер, Марти + Claude Code за командите)
1. GitHub repo `pankovsolutions-site`; копирай тази папка `repo/` като корен, а `docs/` = папката
   с рисърча (00-05).
2. Cloudflare: домейнът pankovsolutions.com на Cloudflare DNS; Pages проект, свързан с repo-то.
3. Имейл на домейна: Cloudflare Email Routing (безплатно, hello@ → Gmail) за получаване +
   Resend с верифициран домейн за изпращане; или Google Workspace, ако искаш пълна пощенска
   кутия. SPF/DKIM/DMARC - по `docs/04` §8.
4. Turnstile site key/secret, Telegram бот + chat id, Umami (Cloud free tier или на Hetzner).
5. Шрифтове: изтегли Source Serif 4, Source Sans 3, JetBrains Mono (variable или static),
   subset-ирай latin+cyrillic → `public/fonts/`.
6. `design/refs/`: 3-5 скрийншота на сайтове, които харесваш (предложения в `DESIGN.md`).

## Стъпка 3 — Claude Code, сесия 1: скелет и дизайн проверка (без страници)
Отвори Claude Code в repo-то и промптни в този ред:
1. „Прочети CLAUDE.md, DESIGN.md, COPY.md, CHECKLIST.md и docs/00. Опиши с 10 изречения
   визуалния език, който ще следваш, и къде би могъл да се подхлъзнеш към AI default. Не пиши код.“
2. „Инициализирай Astro 5 + Tailwind v4 + i18n (bg default, en) + content collections по
   схемите, които извличаш от frontmatter-а в content/bg. Свържи tokens.css с @theme.
   Направи една тестова страница /styleguide, която показва всички токени, шрифтовете с
   български текст „Тест: тд лб вж зип шщ“ и състоянията на бутон/линк/поле. Скрийншот.“
3. Провери сам в браузъра: българските форми на кирилицата, контраста, шрифтовете.
   Ако нещо не ти харесва в палитрата - сега е моментът, промяната е в един файл.
4. Инсталирай Playwright MCP и субагентите `design-critic` и `copy-editor` (текстове в CLAUDE.md).

## Стъпка 4 — Claude Code, сесии 2-9: по една страница на сесия
Ред: Начало → Проекти (листинг + Домоуправител като шаблон за кейс) → останалите кейсове →
Услуги → За бенефициенти → Продукти → За мен → Контакт + форма (Pages Function, Turnstile,
Resend, Telegram) → Privacy + 404 + footer.
Шаблон на промпт за всяка страница:
„Изгради /<страница> само от content/bg/<файл>.md. Спазвай DESIGN.md §Вместо това за тази
секция. След това: скрийншот 1440 и 390, мини CHECKLIST.md A-D, извикай design-critic, поправи
само находките. Не пипай други страници.“
След всяка страница: `git commit`.

## Стъпка 5 — EN версия (1-2 сесии)
След одобрен BG текст: промптът е в `content/en/README.md`. После hreflang проверка.

## Стъпка 6 — Реални материали и launch
Смени placeholder логата/отзивите (`placeholder: false`, `consent: <дата>`), качи портрета,
скрийншотите; мини `CHECKLIST.md` E-F; Lighthouse; Search Console; Google Business Profile.

## Какво мога да направя аз (Cowork) преди Claude Code
- Да направя визуален mockup на hero + услуги + един кейс (Claude Design canvas), за да видиш
  палитрата и типографията върху реален layout, преди да се пише код - и да ги коригираме.
- Да напиша Astro скелета и компонентите тук и да ти ги дам като zip (ако предпочиташ да не
  започваш от нула в Claude Code).
- Да преведа EN версията, щом одобриш BG.
- Да генерирам примерно лого/wordmark по палитрата като отправна точка за дизайнера.

# 06 · Снимки за качване и концепция за лого

Всички пътища са спрямо `repo/public/`. Пълният път на диска:
`c:\Users\mpankov\Project_M\portfolio\repo\public\img\...`
Файлът трябва да се казва **точно** както е в таблицата — кодът проверява дали файлът
съществува (`publicFileExists`) и сам сменя wireframe-а с реалния кадър. Нищо друго не се
пипа, освен където е отбелязано.

## 1. Скрийншоти по проекти

Формат: какъвто и да е (PNG/JPG), пълен прозорец на браузъра; аз ги свалям до 1600 px
ширина и ги обръщам в WebP (пропорцията се пази, не се реже до 16:10). Без курсор, без отворени менюта, без лични данни
на клиенти — замъглени имена/суми, където има реални (DESIGN.md: „замъглен скрийншот“).
Целият прозорец на браузъра без адресна лента — само страницата.

| # | Файл | Какво да има в кадъра |
|---|------|------------------------|
| 1 | `img/projects/domoupravitel/odoo-crm.webp` | ✅ качено – Odoo CRM – табло с възможности по етапи (kanban). **Това е и hero кадърът на началната.** |
| 2 | `img/projects/domoupravitel/moodle-course.webp` | ✅ качено – Moodle – курс за служители с тест |
| 4 | `img/projects/stegi-store/home.webp` | ✅ качено – stegi.store – начална страница |
| 7 | `img/projects/secret-bar/loyalty.webp` | ✅ качено – app.secretpleven.com – екран с точки и награди |
| 8 | `img/projects/secret-bar/venue.webp` | ✅ качено – Реална снимка от заведението (JPG, 16:10, 2400 × 1500, ≤ 350 KB) |
| 10 | `img/projects/infralink/home.webp` | ✅ качено – infralink-de.com – начална страница |
| 11 | `img/projects/her-harmony-glow/home.webp` | ✅ качено – herharmonyglow.com – начална страница след миграцията |

Приоритет: 1, 4, 7 – Odoo CRM, stegi.store, Secret Bar (те са на началната като избрани проекти), после останалите.

## 2. Портрет

| Файл | Спецификация |
|------|--------------|
| `img/marti.webp` | ✅ качено (4:5, 1200 × 1500, WebP). Естествена светлина, неутрален фон (стена, офис), лице и рамене, гледаш в обектива, без силни филтри. Показва се на началната („Кой стои зад…“) и на /about. |

## 3. Лога на клиенти (лента доверие + архив)

Формат: SVG или PNG/JPG (белият фон се маха при обработката); на сайта са WebP q82, височина 80 px. Естествените
цветове на клиента, не сиви. Хоризонтална версия, изрязана до ръба на знака (без празно
поле около него), защото се показва с височина 28 px – трябва да е четливо толкова малко.

| Файл | Клиент |
|------|--------|
| `img/clients/domoupravitel.webp` | ✅ качено – Домоуправител България ООД |
| `img/clients/dosev-impex.webp` | ✅ качено – Досев Импекс ЕООД |
| `img/clients/stegi-store.webp` | ✅ качено – stegi.store |
| `img/clients/secret-bar.webp` | ✅ качено – Secret Bar |
| `img/clients/her-harmony-glow.webp` | ✅ качено – Her Harmony Glow |
| `img/clients/infralink.webp` | ✅ качено – INFRALINK UG |
| `img/clients/eco-globe.webp` | ✅ качено – Еко Глоуб ООД (партньор – блокът „Партньор“ на /about и /for-beneficiaries) |

След качване, за всеки клиент в `content/bg/clients.yaml`: `placeholder: false` и
`consent: 2026-MM-DD` (дата на писменото съгласие за показване на логото). Докато е
`placeholder: true`, логото не се показва в production.

## 4. Продукт (FudiAR)

| Файл | Спецификация |
|------|--------------|
| `img/products/fudiar/home.webp` | **Качено** – началната страница на платформата; пътят е в frontmatter-а на `content/bg/products.md` (`image:`). |

## 5. Собствено лого — готово (10.09.2026)

Източник: `design/logo/gemini-source.jpeg` (Gemini). Обработка: махнат фон, цветовете
щракнати към `--color-primary` / `--color-accent`, знакът векторизиран в два цвята.

| Файл | За какво |
|------|----------|
| `public/img/logo.webp` | Хоризонтално лого, WebP @2x (284 × 96) с прозрачен фон – хедърът. Растер, защото знакът има преливане петрол→охра, което двуцветният вектор губи. |
| `public/img/logo-mark.svg` | Само знакът, вектор в два цвята. |
| `public/favicon.svg` | Същият знак. |
| `public/apple-touch-icon.png` | 180 × 180, знакът върху хартия. |
| `src/assets/og-logo-mark.png` | 256 px знак за OG картинките (satori). |
| `design/logo/logo-full.png`, `logo-vector.svg` | Пълна резолюция и вектор на цялото лого – за печат/презентации. |

------|----------|
| `favicon.svg` (в `public/`) | Квадратен знак. Сега е временен петролен квадрат с „P“. |
| `img/logo.svg` | Хоризонтално лого (знак + надпис) за хедъра и OG картинките. Сега хедърът е текстов wordmark – включвам логото, когато го има. |
| `img/logo-mark.svg` | Само знакът, за малки места. |

---

## Концепция за лого (за Gemini)

**Идея: монограм-плочка.** Знакът е заоблен квадрат в петрол (същата геометрия като
плочките на сайта и като иконка на приложение), с бяла серифна буква **P** и една малка
охрена точка след нея – „P.“ Точката е и пунктуацията на „предаден, приет“, и единственият
акцент. Надписът „Pankov Solutions“ стои вдясно в петролен сериф. Без илюстрация, без
схема – само типография и форма.

**Цветове (само тези):** петрол `#0E4A5A`, хартия `#F5F3EE` (буквата), охра `#C9702A`
(точката). Фон на файла – прозрачен.

**Един файл:** PNG, **2000 × 500 px**, прозрачен фон, хоризонтално: знак вляво (480 × 480),
надпис вдясно. Favicon-а (512 × 512) изрязвам аз от знака.

```
Create ONE final logo image, not a sheet of variants.

Logo for "Pankov Solutions", a software engineering studio. Composition, left to right:
(1) the mark: a solid deep petrol blue (#0E4A5A) rounded square, corner radius 22% of its
side, like a premium app icon; inside it, a bold serif capital "P" in off-white (#F5F3EE),
optically centered, taking about 60% of the square's height; immediately after the P, at
its baseline, one small filled circle in warm ochre (#C9702A), about 12% of the square's
height — reading as "P." (2) To the right, with a gap equal to half the mark's width, the
wordmark "Pankov Solutions" on a single line in the same bold serif, deep petrol blue,
cap height about 45% of the mark's height, vertically centered on the mark.

Serif in the spirit of Source Serif 4 Bold: warm, high contrast, classic. Flat vector
look: no gradients, no shadows, no 3D, no bevels, no glow, no texture, no outlines, no
icons, no globes, circuits, gears or swooshes. Calm, premium, Apple-like restraint.

Output: a single PNG, 2000 × 500 pixels, landscape, fully transparent background, logo
centered with even margins, nothing else in the image — no mockup, no caption, no
background color.
```

Ако Gemini не спази размера точно, го изрязвам и мащабирам аз – важното е фонът да е
прозрачен и да няма нищо друго в кадъра.

import { defineCollection, z } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { parse as parseYaml } from 'yaml';

// Схемите са извлечени от frontmatter-а на съществуващите файлове в content/bg.
// Ново поле се добавя тук СЛЕД като се появи в content/, не преди това.

// content/<locale>/<page>.md — id: "bg/home", "en/home".
// README.md в content/en е инструкция за превода, не страница — изключен е.
const pages = defineCollection({
  loader: glob({ base: './content', pattern: ['*/*.md', '!*/README.md'] }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    // Кадър за страници с една карта (products.md → FudiAR).
    image: z.object({ src: z.string(), alt: z.string() }).optional(),
  }),
});

// content/<locale>/projects/<slug>.md — id: "bg/projects/stegi-store".
const projects = defineCollection({
  loader: glob({ base: './content', pattern: '*/projects/*.md' }),
  schema: z.object({
    title: z.string(),
    result: z.string(),
    client: z.string(),
    industry: z.string(),
    services: z.array(z.string()),
    stack: z.array(z.string()),
    year: z.number().int(),
    duration: z.string(),
    // Само при проекти по европейска програма (3 от 8 файла).
    program: z.string().optional(),
    // Единствената стойност, която се среща в content/. Нова стойност се добавя тук изрично.
    status: z.enum(['in-progress']).optional(),
    featured: z.boolean().default(false),
    order: z.number().int(),
    images: z.array(z.object({ src: z.string(), alt: z.string() })),
  }),
});

// YAML файловете са масиви без id. Ключът за clients е slug-ът; за testimonials
// няма естествен ключ, затова id-то е позицията във файла (редът е смислен — DESIGN.md
// показва максимум 3 отзива).
// TODO: при добавяне на content/en/*.yaml — отделни колекции или общ loader.
const clients = defineCollection({
  loader: file('content/bg/clients.yaml', {
    parser: (text) =>
      Object.fromEntries(parseYaml(text).map((entry: { slug: string }) => [entry.slug, entry])),
  }),
  schema: z.object({
    slug: z.string(),
    name: z.string(),
    logo: z.string(),
    // Партньор (Еко Глоуб), не клиент — показва се в отделен блок.
    partner: z.boolean().default(false),
    // Сайт на партньора/клиента — логото става линк (проверимост).
    url: z.string().url().optional(),
    placeholder: z.boolean().default(false),
    // Дата на писменото съгласие; YAML може да я даде като Date, ако не е в кавички.
    consent: z.union([z.string(), z.date()]).nullable().default(null),
  }),
});

const testimonials = defineCollection({
  loader: file('content/bg/testimonials.yaml', {
    parser: (text) =>
      Object.fromEntries(parseYaml(text).map((entry: unknown, i: number) => [String(i + 1), entry])),
  }),
  schema: z.object({
    quote: z.string(),
    // Празно, докато клиентът не потвърди кой се подписва.
    name: z.string().default(''),
    role: z.string(),
    company: z.string(),
    // slug от clients.yaml — логото до отзива.
    client: z.string().optional(),
    // slug на проект от колекцията projects (без префикса на езика).
    project: z.string(),
    placeholder: z.boolean().default(false),
  }),
});

// content/<locale>/campaigns/<slug>.md — лендинг по процедура/ниша (docs/11). Фиксираните
// блокове (безплатно до одобрение, стъпки, партньор, общ FAQ, форма) са в _shared.md на
// същата папка — отделна колекция, за да не излиза като страница.
const campaignImage = z.object({ src: z.string(), alt: z.string() });
const campaigns = defineCollection({
  loader: glob({ base: './content', pattern: ['*/campaigns/*.md', '!*/campaigns/_*.md'] }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    procedure: z.object({ code: z.string(), name: z.string(), programme: z.string() }),
    // Ниша („производствени предприятия“) — в readout реда над заглавието; без нея е общата страница.
    niche: z.string().optional(),
    status: z.enum(['upcoming', 'open', 'closed']).default('open'),
    // Текст, както ще се покаже („10 ноември 2026, 16:30“), не дата — форматът е решение на текста.
    deadline: z.string().optional(),
    // Лентата с числа под hero-то: до 4 двойки стойност/етикет, от условията на процедурата.
    facts: z.array(z.object({ value: z.string(), label: z.string() })).max(4).default([]),
    // Линк към официалните условия — проверимост (docs/07, Stanford №1).
    source: z.string().url().optional(),
    // Снимка в hero-то (4:5 или 16:10) и широк банер по средата; до качване — Placeholder.
    image: campaignImage.optional(),
    banner: campaignImage.optional(),
    // Кейсове за доказателството (slug-ове от projects); без списък — всички с program.
    projects: z.array(z.string()).optional(),
    // Стойността на скритото поле във формата; по подразбиране slug-ът на файла.
    campaign: z.string().optional(),
    noindex: z.boolean().default(false),
  }),
});

const campaignBlocks = defineCollection({
  loader: glob({ base: './content', pattern: '*/campaigns/_*.md' }),
  schema: z.object({ title: z.string() }),
});

export const collections = { pages, projects, clients, testimonials, campaigns, campaignBlocks };

import { createMarkdownProcessor } from '@astrojs/markdown-remark';

// Същият процесор, който Astro ползва за render() на колекциите — за да се рендерира
// еднакво markdown-ът от content/, независимо дали идва цял или на секции.
const processor = await createMarkdownProcessor({});

export type Link = { text: string; href: string };

export async function md(source: string): Promise<string> {
  return (await processor.render(source.trim())).code;
}

// Един абзац без обвиващото <p> — за заглавия, водещи текстове, редове в списъци.
export async function mdInline(source: string): Promise<string> {
  const html = await md(source);
  return html.replace(/^<p>/, '').replace(/<\/p>\s*$/, '');
}

// Секциите в content/bg/home.md са маркирани с <!-- ИМЕ — описание --> (описанието е по
// избор). Ключът е само с главни букви; <!-- TODO: ... --> (двоеточие) и бележките с малки
// букви не са секции и остават вътре в текста (излизат като HTML коментари = празно място).
export function splitSections(body: string): Map<string, string> {
  const marker = /<!--\s*([A-ZА-Я][A-ZА-Я0-9 +\/-]*?)\s*(?:—[\s\S]*?)?-->/g;
  const hits = [...body.matchAll(marker)];
  const sections = new Map<string, string>();
  hits.forEach((hit, i) => {
    const start = hit.index! + hit[0].length;
    const end = hits[i + 1]?.index ?? body.length;
    sections.set(hit[1].trim(), body.slice(start, end).trim());
  });
  return sections;
}

const LINK = /\[([^\]]+)\]\(([^)]+)\)/g;

export function paragraphs(source: string): string[] {
  return source
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// Първото заглавие от дадено ниво и остатъкът без него.
export function takeHeading(source: string, level: 1 | 2): { heading: string; rest: string } {
  const m = source.match(new RegExp(`^#{${level}}\\s+(.+)$`, 'm'));
  if (!m) return { heading: '', rest: source.trim() };
  return { heading: m[1].trim(), rest: source.replace(m[0], '').trim() };
}

// Последен абзац, съставен само от линкове („[а](/x) · [б](/y)“) — CTA редовете.
export function takeLastLinkLine(source: string): { rest: string; links: Link[] } {
  const paras = paragraphs(source);
  const last = paras.at(-1) ?? '';
  const onlyLinks = last !== '' && last.replace(LINK, '').replace(/[·\s]/g, '') === '';
  if (!onlyLinks) return { rest: source, links: [] };
  const links = [...last.matchAll(LINK)].map((m) => ({ text: m[1], href: m[2] }));
  return { rest: paras.slice(0, -1).join('\n\n'), links };
}

// Линк в края на абзац: „...текст. [Как протече →](/projects/x)“.
function takeTrailingLink(paragraph: string): { rest: string; link: Link | null } {
  const m = paragraph.match(/\s*\[([^\]]+)\]\(([^)]+)\)\s*$/);
  if (!m) return { rest: paragraph, link: null };
  return { rest: paragraph.slice(0, m.index).trim(), link: { text: m[1], href: m[2] } };
}

// Заглавията в run-in форма („**01 · Заглавие.** текст“) завършват с точка; като <h3> тя пада.
export const trimDot = (s: string) => s.replace(/\.\s*$/, '');

export async function parseHero(source: string) {
  const { heading, rest } = takeHeading(source, 1);
  const { rest: body, links } = takeLastLinkLine(rest);
  return { title: await mdInline(heading), lede: await md(body), links };
}

// „## Заглавие“ + произволен markdown.
export async function parseSection(source: string) {
  const { heading, rest } = takeHeading(source, 2);
  const { rest: body, links } = takeLastLinkLine(rest);
  return { heading: await mdInline(heading), body: await md(body), links };
}

// „**01 · Заглавие.** Два реда текст. [Линк →](/x)“ — по един абзац на услуга.
export async function parseServices(source: string) {
  const { heading, rest } = takeHeading(source, 2);
  const items = [];
  for (const p of paragraphs(rest)) {
    const m = p.match(/^\*\*(\d+)\s*·\s*(.+?)\*\*\s*([\s\S]*)$/);
    if (!m) continue;
    const { rest: text, link } = takeTrailingLink(m[3]);
    items.push({
      number: m[1],
      title: await mdInline(trimDot(m[2])),
      text: await mdInline(text),
      link,
    });
  }
  return { heading: await mdInline(heading), items };
}

// Номериран списък със стъпки. Две форми от content/:
//   „1. **Заглавие.** Едно изречение.“      (home.md)
//   „1. Заглавие – едно изречение.“          (services.md)
export async function parseStepLines(source: string) {
  const items = [];
  for (const line of source.split('\n')) {
    const m = line.match(/^(\d+)\.\s+(.*)$/);
    if (!m) continue;
    let title = m[2];
    let text = '';
    const bold = title.match(/^\*\*(.+?)\*\*\s*(.*)$/);
    const dash = title.search(/\s[–—]\s/);
    if (bold) {
      title = bold[1];
      text = bold[2];
    } else if (dash >= 0) {
      text = title.slice(dash + 3);
      title = title.slice(0, dash);
    }
    items.push({
      number: m[1].padStart(2, '0'),
      title: await mdInline(trimDot(title)),
      text: await mdInline(text),
    });
  }
  return items;
}

export async function parseSteps(source: string) {
  const { heading, rest } = takeHeading(source, 2);
  return { heading: await mdInline(heading), items: await parseStepLines(rest) };
}

// Страница, нарязана по „## “: текстът преди първото h2 + секциите.
export function splitH2(source: string): { preface: string; sections: Array<{ heading: string; body: string }> } {
  const parts = source.split(/^(?=## )/m);
  const preface = parts[0]?.trim() ?? '';
  const sections = parts.slice(1).map((p) => {
    const { heading, rest } = takeHeading(p, 2);
    return { heading, body: rest };
  });
  return { preface, sections };
}

// „**Въпрос?** Отговор.“ — по един абзац на въпрос.
export async function parseFaq(source: string) {
  const items = [];
  for (const p of paragraphs(source)) {
    const m = p.match(/^\*\*(.+?)\*\*\s*([\s\S]*)$/);
    if (!m) continue;
    items.push({ question: await mdInline(m[1]), answer: await md(m[2]) });
  }
  return items;
}

// id за котва от заглавие: малки букви, само букви/цифри, тирета.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-');
}

// Само текстът от HTML — за JSON-LD.
export function plainText(html: string): string {
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

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

function paragraphs(source: string): string[] {
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
const trimDot = (s: string) => s.replace(/\.\s*$/, '');

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

// „1. **Заглавие.** Едно изречение.“ — номериран списък със стъпки.
export async function parseSteps(source: string) {
  const { heading, rest } = takeHeading(source, 2);
  const items = [];
  for (const line of rest.split('\n')) {
    const m = line.match(/^(\d+)\.\s+\*\*(.+?)\*\*\s*(.*)$/);
    if (!m) continue;
    items.push({
      number: m[1].padStart(2, '0'),
      title: await mdInline(trimDot(m[2])),
      text: await mdInline(m[3]),
    });
  }
  return { heading: await mdInline(heading), items };
}

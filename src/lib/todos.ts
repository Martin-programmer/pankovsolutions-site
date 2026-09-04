// <!-- TODO: ... --> бележките в content/ са празноти, които Марти попълва (CLAUDE.md §Правила 1).
// В HTML-а не трябва да се виждат — нито като текст, нито като коментар в source-а — а при
// build се логват с името на файла, за да не се забравят.

const COMMENT = /<!--[\s\S]*?-->/g;
const TODO = /<!--\s*TODO:?\s*([\s\S]*?)-->/g;

export function stripComments(html: string): string {
  return html.replace(COMMENT, '');
}

// За рендериран markdown: маха коментарите и елементите, които остават празни без тях
// (например <li>, в което е имало само TODO — иначе излиза празна точка).
export function cleanHtml(html: string): string {
  return stripComments(html)
    .replace(/<li>\s*<\/li>/g, '')
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<ul>\s*<\/ul>/g, '');
}

// За стойности от frontmatter: маха коментарите и сгъва останалото двойно разстояние.
export function cleanText(value: string | null | undefined): string {
  return value ? stripComments(value).replace(/\s{2,}/g, ' ').trim() : '';
}

export function warnTodos(file: string, ...sources: Array<string | null | undefined>): void {
  const todos = sources.flatMap((s) =>
    [...(s ?? '').matchAll(TODO)].map((m) => m[1].trim().replace(/\s+/g, ' ').slice(0, 60) || '(без текст)'),
  );
  if (todos.length === 0) return;
  console.warn(`[todo] ${file}: ${todos.length} — ${todos.map((x) => `„${x}“`).join(', ')}`);
}

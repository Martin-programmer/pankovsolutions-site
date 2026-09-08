import type { APIRoute } from 'astro';
import { getCollection, getEntry } from 'astro:content';
import { company } from '../data/company';
import { ui } from '../i18n/ui';
import { cleanText } from '../lib/todos';

// llms.txt (llmstxt.org): кратко описание и линкове към страниците, от същите източници
// като самия сайт — frontmatter-ите в content/bg.
export const GET: APIRoute = async ({ site }) => {
  const base = site?.href ?? 'https://pankovsolutions.com/';
  const url = (path: string) => new URL(path, base).href;
  const t = ui.bg;

  const home = await getEntry('pages', 'bg/home');
  const pages = await getCollection('pages', (p) => p.id.startsWith('bg/') && p.id !== 'bg/home');
  const projects = (await getCollection('projects', (p) => p.id.startsWith('bg/'))).sort(
    (a, b) => a.data.order - b.data.order,
  );

  const routes: Record<string, string> = {
    'bg/projects': '/projects',
    'bg/about': '/about',
    'bg/services': '/services',
    'bg/for-beneficiaries': '/for-beneficiaries',
    'bg/products': '/products',
    'bg/contact': '/contact',
    'bg/privacy': '/privacy',
    'bg/accessibility': '/accessibility',
  };

  const lines = [
    `# ${company.brand}`,
    '',
    `> ${home?.data.description ?? ''}`,
    '',
    `${company.name}, ЕИК ${company.eik}, ${company.address}. ${company.email} · ${company.phone}.`,
    '',
    `## ${t['llms.pages']}`,
    '',
    `- [${home?.data.title ?? company.brand}](${url('/')})`,
    ...pages
      .filter((p) => routes[p.id])
      .map((p) => `- [${p.data.title}](${url(routes[p.id])}): ${p.data.description}`),
    '',
    `## ${t['llms.projects']}`,
    '',
    ...projects.map(
      (p) =>
        `- [${cleanText(p.data.title)}](${url(`/projects/${p.id.replace(/^bg\/projects\//, '')}`)}): ${cleanText(p.data.result)}`,
    ),
    '',
  ];

  return new Response(lines.join('\n'), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
};

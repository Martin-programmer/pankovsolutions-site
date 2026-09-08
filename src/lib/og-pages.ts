import { getCollection } from 'astro:content';
import { company } from '../data/company';
import { ui } from '../i18n/ui';
import { cleanText } from './todos';

// Списъкът страници, за които при build се генерира OG изображение (/og/<slug>.png) —
// единствен източник и за endpoint-а, и за Base.astro (кои пътища имат картинка).
export type OgPage = { slug: string; title: string };

export async function ogPages(): Promise<OgPage[]> {
  const pages = await getCollection('pages', (p) => p.id.startsWith('bg/'));
  const projects = await getCollection('projects', (p) => p.id.startsWith('bg/'));
  return [
    ...pages.map((p) => ({
      slug: p.id === 'bg/home' ? 'index' : p.id.replace(/^bg\//, ''),
      title: p.data.title,
    })),
    // Листингът има OG само ако няма content/bg/projects.md (иначе идва от pages по-горе).
    ...(pages.some((p) => p.id === 'bg/projects')
      ? []
      : [{ slug: 'projects', title: `${ui.bg['nav.projects']} – ${company.brand}` }]),
    ...projects.map((p) => ({ slug: p.id.replace(/^bg\//, ''), title: cleanText(p.data.title) })),
  ];
}

// Път към OG изображението за даден pathname (без езиков префикс), или null, ако няма такова.
export function ogSlugFor(pathname: string): string {
  const bare = pathname.replace(/^\/en(?=\/|$)/, '').replace(/\/$/, '') || '/';
  return bare === '/' ? 'index' : bare.slice(1);
}

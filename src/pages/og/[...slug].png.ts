import type { APIRoute } from 'astro';
import { renderOg } from '../../lib/og';
import { ogPages } from '../../lib/og-pages';

// По едно OG изображение за всяка страница, по нейния title, генерирано при build.
export async function getStaticPaths() {
  return (await ogPages()).map((p) => ({ params: { slug: p.slug }, props: { title: p.title } }));
}

export const GET: APIRoute = async ({ props }) => {
  const png = await renderOg((props as { title: string }).title);
  return new Response(png, { headers: { 'content-type': 'image/png' } });
};

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

// Проверка при build дали файл от public/ реално съществува. Пътищата в content/ сочат към
// изображения, които Марти още не е качил — дотогава компонентите показват placeholder
// вместо счупено <img>. process.cwd() е коренът на repo-то и при dev, и при build.
export function publicFileExists(src: string): boolean {
  return existsSync(join(process.cwd(), 'public', src));
}

// Реалните width/height на изображение от public/ — за атрибутите на <img>, така че
// браузърът да запази мястото преди зареждане (без CLS). Кадрите са с различни пропорции
// (Odoo 2.6:1, Moodle 1.4:1, сайтове 2.1:1), затова не се твърди 16:10.
const sizeCache = new Map<string, { width: number; height: number }>();
export async function publicImageSize(src: string): Promise<{ width: number; height: number }> {
  const hit = sizeCache.get(src);
  if (hit) return hit;
  const { width = 1200, height = 750 } = await sharp(join(process.cwd(), 'public', src)).metadata();
  const size = { width, height };
  sizeCache.set(src, size);
  return size;
}

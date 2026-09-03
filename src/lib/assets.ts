import { existsSync } from 'node:fs';
import { join } from 'node:path';

// Проверка при build дали файл от public/ реално съществува. Пътищата в content/ сочат към
// изображения, които Марти още не е качил — дотогава компонентите показват placeholder
// вместо счупено <img>. process.cwd() е коренът на repo-то и при dev, и при build.
export function publicFileExists(src: string): boolean {
  return existsSync(join(process.cwd(), 'public', src));
}

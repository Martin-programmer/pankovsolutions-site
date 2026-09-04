import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';
import { company } from '../data/company';

// OG изображение 1200×630: paper фон, заглавие в Source Serif 700, mono ред с домейна —
// DESIGN.md §Изображения. Цветовете се четат от tokens.css, за да няма hex тук.
// Шрифтовете са TTF с „изпечени“ български форми (scripts/og-fonts.py).
const root = process.cwd();
const tokens = readFileSync(join(root, 'src/styles/tokens.css'), 'utf-8');
const color = (name: string) => tokens.match(new RegExp(`--color-${name}:\\s*(#[0-9A-Fa-f]{6})`))?.[1] ?? '';

const serif = readFileSync(join(root, 'src/assets/og-fonts/SourceSerif4-Bold.ttf'));
const mono = readFileSync(join(root, 'src/assets/og-fonts/JetBrainsMono-Regular.ttf'));

const WIDTH = 1200;
const HEIGHT = 630;

export async function renderOg(title: string): Promise<ArrayBuffer> {
  const size = title.length > 60 ? 56 : title.length > 40 ? 64 : 72;
  const svg = await satori(
    {
      type: 'div',
      props: {
        style: {
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: color('paper'),
          color: color('ink'),
        },
        children: [
          {
            type: 'div',
            props: {
              style: { fontFamily: 'JetBrains Mono', fontSize: 28, color: color('muted') },
              children: company.email.replace(/^.*@/, ''),
            },
          },
          {
            type: 'div',
            props: {
              style: {
                fontFamily: 'Source Serif 4',
                fontWeight: 700,
                fontSize: size,
                lineHeight: 1.1,
                letterSpacing: '-0.01em',
                maxWidth: '1000px',
              },
              children: title,
            },
          },
          {
            type: 'div',
            props: {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: 24,
                fontFamily: 'JetBrains Mono',
                fontSize: 24,
                color: color('primary'),
                borderTop: `2px solid ${color('line')}`,
                paddingTop: 28,
              },
              children: [
                { type: 'div', props: { children: company.brand } },
                { type: 'div', props: { style: { color: color('muted') }, children: '·' } },
                { type: 'div', props: { style: { color: color('muted') }, children: `${company.city}` } },
              ],
            },
          },
        ],
      },
    },
    {
      width: WIDTH,
      height: HEIGHT,
      fonts: [
        { name: 'Source Serif 4', data: serif, weight: 700, style: 'normal' },
        { name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
      ],
    },
  );
  const png = new Resvg(svg, { fitTo: { mode: 'width', value: WIDTH } }).render().asPng();
  // Копие като чист ArrayBuffer — това е типът, който Response приема.
  return png.buffer.slice(png.byteOffset, png.byteOffset + png.byteLength) as ArrayBuffer;
}

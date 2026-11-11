import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

// OG изображение 1200×630 в стила на сайта: navy фон, бяло лого, заглавие в Onest 600,
// lime блок с асиметричен ъгъл. Шрифтовете са статични WOFF (satori не чете WOFF2).
const dir = join(process.cwd(), 'src/assets/og');
const font = (f: string) => readFileSync(join(dir, f));
const fonts = [
  { name: 'Onest', data: font('onest-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
  { name: 'Onest', data: font('onest-cyrillic-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
  { name: 'Manrope', data: font('manrope-latin-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
  { name: 'Manrope', data: font('manrope-cyrillic-600-normal.woff'), weight: 600 as const, style: 'normal' as const },
];
const logo = `data:image/svg+xml;base64,${readFileSync(join(dir, 'logo-white.svg'), 'base64')}`;

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export async function renderOg(title: string, kicker: string): Promise<Uint8Array> {
  const size = title.length > 70 ? 54 : title.length > 45 ? 62 : 72;
  const svg = await satori(
    h(
      'div',
      { width: '100%', height: '100%', display: 'flex', background: '#0A2A66', color: '#FFFFFF', position: 'relative', fontFamily: 'Manrope' },
      [
        h('div', { position: 'absolute', right: 0, bottom: 0, width: 300, height: 210, background: '#C6F24E', borderTopLeftRadius: 120 }),
        h('div', { position: 'absolute', right: 300, bottom: 0, width: 150, height: 110, background: '#2563EB', borderTopLeftRadius: 24, borderTopRightRadius: 24 }),
        h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 72px', width: '100%' }, [
          { type: 'img', props: { src: logo, width: 230, height: 88, style: { width: 230, height: 88 } } },
          h('div', { display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 900 }, [
            h('div', { fontSize: 26, color: '#C6F24E', fontWeight: 600 }, kicker),
            h('div', { fontFamily: 'Onest', fontWeight: 600, fontSize: size, lineHeight: 1.08, letterSpacing: '-0.02em' }, title),
          ]),
          h('div', { fontSize: 24, color: '#C9D4EA' }, 'pankovsolutions.com'),
        ]),
      ],
    ) as never,
    { width: 1200, height: 630, fonts },
  );
  return new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } }).render().asPng();
}

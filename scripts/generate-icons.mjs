import { Resvg } from '@resvg/resvg-js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const svgPath = resolve(__dirname, '../public/logo.svg');
const svgData = readFileSync(svgPath, 'utf-8');

for (const size of [192, 512]) {
  const resvg = new Resvg(svgData, {
    fitTo: { mode: 'width', value: size },
  });
  const png = resvg.render().asPng();
  const outPath = resolve(__dirname, `../public/icons/icon-${size}.png`);
  writeFileSync(outPath, png);
  console.log(`✓ icon-${size}.png`);
}

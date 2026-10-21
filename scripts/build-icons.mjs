// Gera os ícones do app a partir de scripts/icon-master.svg (fundo cheio:
// o celular aplica o próprio arredondamento). Uso: node scripts/build-icons.mjs
// O símbolo ocupa ~60% do centro, dentro da zona segura do ícone "maskable".
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const master = await readFile(new URL('./icon-master.svg', import.meta.url));
const out = (name, size) => sharp(master).resize(size, size).png().toFile(fileURLToPath(new URL(`../public/icons/${name}.png`, import.meta.url)));

await out('icon-192', 192);
await out('icon-512', 512);
await out('icon-maskable-512', 512);
await out('apple-touch-icon', 180);

// Ícone da aba do navegador: o mesmo desenho, com cantos arredondados.
const svg = master.toString()
  .replace('Fundo cheio: o sistema (Android/iOS) aplica o próprio arredondamento.', 'Ícone da aba do navegador (gerado por scripts/build-icons.mjs).')
  .replace('<rect width="1024" height="1024" fill="#0F1115"/>', '<rect width="1024" height="1024" rx="224" fill="#0F1115"/>');
await writeFile(new URL('../app/icon.svg', import.meta.url), svg);
// favicon.ico (o navegador pede /favicon.ico sozinho): ICO com PNGs de 16, 32 e 48 px.
const sizes = [16, 32, 48];
const pngs = await Promise.all(sizes.map(n => sharp(Buffer.from(svg)).resize(n, n).png().toBuffer()));
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(sizes.length, 4);
let offset = 6 + 16 * sizes.length;
const entries = sizes.map((n, i) => {
  const e = Buffer.alloc(16);
  e.writeUInt8(n, 0); e.writeUInt8(n, 1); e.writeUInt8(0, 2); e.writeUInt8(0, 3);
  e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
  e.writeUInt32LE(pngs[i].length, 8); e.writeUInt32LE(offset, 12);
  offset += pngs[i].length;
  return e;
});
await writeFile(new URL('../app/favicon.ico', import.meta.url), Buffer.concat([header, ...entries, ...pngs]));

console.log('Ícones gerados.');

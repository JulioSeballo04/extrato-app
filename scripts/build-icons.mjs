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
console.log('Ícones gerados.');

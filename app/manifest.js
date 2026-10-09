// Manifest do PWA: permite instalar o app na tela inicial e abrir em tela
// cheia, sem a barra do navegador. Servido pelo Next em /manifest.webmanifest.
// Sem service worker de propósito: os dados já ficam no Firestore e um cache
// offline do app faria o celular mostrar versões antigas depois de um deploy.
import { BRAND } from '../lib/brand';

export default function manifest() {
  return {
    name: BRAND.name,
    short_name: BRAND.shortName,
    description: BRAND.description,
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#0F1115',
    theme_color: '#0F1115',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}

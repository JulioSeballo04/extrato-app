import { AuthProvider } from '../context/AuthContext';
import './globals.css';
import { BRAND } from '../lib/brand';

export const metadata = {
  title: `${BRAND.name} — ${BRAND.tagline.toLowerCase()}`,
  description: BRAND.description,
  applicationName: BRAND.name,
  // iPhone: abre em tela cheia quando instalado pela opção "Adicionar à Tela de Início".
  appleWebApp: { capable: true, title: BRAND.shortName, statusBarStyle: 'black' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

// Cor da barra de status/navegador. O app atualiza para a cor da paleta escolhida.
export const viewport = {
  themeColor: '#0F1115',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover', // permite respeitar a área segura (barra de gestos) no celular
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}

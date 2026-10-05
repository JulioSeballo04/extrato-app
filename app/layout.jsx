import { AuthProvider } from '../context/AuthContext';
import './globals.css';

export const metadata = {
  title: 'Gestor de Gastos — contas e cartões compartilhados',
  description: 'Controle de gastos e cartões compartilhados entre pessoas',
  applicationName: 'Gestor de Gastos',
  // iPhone: abre em tela cheia quando instalado pela opção "Adicionar à Tela de Início".
  appleWebApp: { capable: true, title: 'Gastos', statusBarStyle: 'black' },
  icons: { apple: '/icons/apple-touch-icon.png' },
};

// Cor da barra de status/navegador. O app atualiza para a cor da paleta escolhida.
export const viewport = {
  themeColor: '#0F1115',
  width: 'device-width',
  initialScale: 1,
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

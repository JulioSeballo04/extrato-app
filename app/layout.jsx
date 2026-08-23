import { AuthProvider } from '../context/AuthContext';
import './globals.css';

export const metadata = {
  title: 'Extrato — gestão de contas compartilhadas',
  description: 'Controle de gastos e cartões compartilhados entre pessoas',
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

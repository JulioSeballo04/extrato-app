/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Só em desenvolvimento: abrir o app também por 127.0.0.1 (outra origem,
  // outro login) para testar dois usuários ao mesmo tempo com os emuladores.
  allowedDevOrigins: ['127.0.0.1'],
  // Cabeçalhos de segurança. Sem CSP completa nem COOP de propósito: o login
  // com Google abre uma janela que precisa falar com o app (window.opener).
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' }, // o app não abre dentro de outro site
        { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      ],
    }];
  },
};

module.exports = nextConfig;

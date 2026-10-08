/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Só em desenvolvimento: abrir o app também por 127.0.0.1 (outra origem,
  // outro login) para testar dois usuários ao mesmo tempo com os emuladores.
  allowedDevOrigins: ['127.0.0.1'],
};

module.exports = nextConfig;

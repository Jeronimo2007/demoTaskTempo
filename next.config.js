/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Desactivar ESLint durante el build
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignorar errores de TypeScript durante el build
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;

/** @type {import('next').NextConfig} */

// Ensure next-intl trailing slash setting is always present for both build and runtime phases.
if (!process.env._next_intl_trailing_slash) {
  process.env._next_intl_trailing_slash = 'false';
}

const withNextIntl = require('next-intl/plugin')(
  // This is the default (also the `src` folder is supported out of the box)
  './i18n.ts'
);

const nextConfig = {
  // Standalone output para Docker
  output: 'standalone',
  
  // Mejorar hot reload en desarrollo
  reactStrictMode: true,
  
  // Optimizar compilación
  swcMinify: true,
  
  // Configuración de webpack para mejor hot reload
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Mejorar hot reload en desarrollo
      config.watchOptions = {
        poll: 1000, // Verificar cambios cada segundo
        aggregateTimeout: 300, // Esperar 300ms antes de recompilar
      };
    }
    return config;
  },
  
  experimental: {
    serverComponentsExternalPackages: ['prisma'],
  },
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
    _next_intl_trailing_slash: process.env._next_intl_trailing_slash,
  },
  // Suppress next-intl trailing slash warning
  trailingSlash: false,
  // Configuración de imágenes externas
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'geolocation=(), microphone=(), camera=()',
          },
        ],
      },
    ];
  },
};

module.exports = withNextIntl(nextConfig);
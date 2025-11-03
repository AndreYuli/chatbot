/** @type {import('next').NextConfig} */

const withNextIntl = require('next-intl/plugin')(
  './i18n.ts'
);

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  swcMinify: true,
  trailingSlash: false,
  experimental: {
    serverComponentsExternalPackages: ['prisma'],
  },
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
};

module.exports = withNextIntl(nextConfig);
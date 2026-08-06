/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  experimental: {
    serverActions: { allowedOrigins: ['*'] }
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  // Only 2 usages of next/image in the app, both static logo/watermark
  // images that don't need dynamic resizing - skipping optimization avoids
  // needing the "sharp" native binary correctly installed in this same
  // Alpine + standalone Docker setup that already took real effort to get
  // right for Prisma's engine. Not worth the same risk twice for a feature
  // this app doesn't actually need.
  images: {
    unoptimized: true
  }
};
module.exports = nextConfig;

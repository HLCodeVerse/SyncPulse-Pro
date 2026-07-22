const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // On Vercel, output .next at repo root so @vercel/next finds it
  // (the monorepo root is the Vercel project root, not apps/web/)
  distDir: process.env.VERCEL ? '../.next' : '.next',
  transpilePackages: ['@webrtc/ui', '@webrtc/sdk', '@webrtc/types'],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@webrtc/types': path.resolve(__dirname, '../../packages/types/src/index.ts'),
      '@webrtc/sdk': path.resolve(__dirname, '../../packages/webrtc-sdk/src/index.ts'),
      '@webrtc/ui': path.resolve(__dirname, '../../packages/ui/src/index.ts'),
    };
    return config;
  },
};

module.exports = nextConfig;

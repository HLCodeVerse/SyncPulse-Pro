const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@webrtc/ui', '@webrtc/sdk', '@webrtc/types'],
  reactStrictMode: true,
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

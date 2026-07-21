/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@webrtc/ui', '@webrtc/sdk', '@webrtc/types'],
  reactStrictMode: true,
};

module.exports = nextConfig;

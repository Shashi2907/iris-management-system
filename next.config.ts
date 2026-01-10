import type { NextConfig } from "next";

const withPWA = require('next-pwa')({
  dest: 'public',
  // THIS IS THE KEY: Disable PWA in development to stop the infinite refresh loop
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /* Add any other Next.js config options here */
};

export default withPWA(nextConfig);
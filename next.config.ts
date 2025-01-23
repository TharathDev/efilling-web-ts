import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  env: {
    API_BASE_URL: process.env.API_BASE_URL,
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS
  },
  publicRuntimeConfig: {
    apiBaseUrl: process.env.API_BASE_URL
  },
  serverRuntimeConfig: {
    apiBaseUrl: process.env.API_BASE_URL
  }
};

export default nextConfig;

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
  },
  api: {
    bodyParser: {
      sizeLimit: '1mb'
    },
    responseLimit: '10mb',
    externalResolver: true
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb'
    }
  }
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api/v1",
  },
  async rewrites() {
    return [
      {
        source: '/insforge-proxy/:path*',
        destination: 'https://qqskjqm7.us-east.insforge.app/:path*',
      },
    ];
  },
};

export default nextConfig;

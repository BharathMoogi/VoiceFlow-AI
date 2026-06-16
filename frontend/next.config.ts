import type { NextConfig } from "next";

if (process.env.NODE_ENV === "development") {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
}

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
      {
        source: '/api/auth/:path*',
        destination: 'https://qqskjqm7.us-east.insforge.app/api/auth/:path*',
      },
    ];
  },
};

export default nextConfig;

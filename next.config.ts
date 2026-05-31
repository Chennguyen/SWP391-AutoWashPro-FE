import type { NextConfig } from "next";

const backendApiBaseUrl =
  process.env.BACKEND_API_BASE_URL ??
  "https://autowashpro-deploy-latest.onrender.com";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/identity-api/:path*",
        destination: `${backendApiBaseUrl}/api/:path*`,
      },
      {
        source: "/api/:path*",
        destination: `${backendApiBaseUrl}/api/:path*`,
      },
      {
        source: "/Voucher/:path*",
        destination: `${backendApiBaseUrl}/Voucher/:path*`,
      },
      {
        source: "/Reward/:path*",
        destination: `${backendApiBaseUrl}/Reward/:path*`,
      },
      {
        source: "/Tier/:path*",
        destination: `${backendApiBaseUrl}/Tier/:path*`,
      },
      {
        source: "/Promotion/:path*",
        destination: `${backendApiBaseUrl}/Promotion/:path*`,
      },
    ];
  },
};

export default nextConfig;

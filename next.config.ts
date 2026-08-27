import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Listening allows up to 25 MB; keep headroom above Import's 10 MB limit.
      bodySizeLimit: "50mb",
    },
    proxyClientMaxBodySize: "50mb",
  },
  serverExternalPackages: [
    "assemblyai",
    "openai",
    "stripe",
    "@stream-io/node-sdk",
    "@stream-io/openai-realtime-api",
  ],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
};

export default withNextIntl(nextConfig);

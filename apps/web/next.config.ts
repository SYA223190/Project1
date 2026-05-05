import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@zoho-clone/shared",
    "@zoho-clone/core",
    "@zoho-clone/db",
  ],
  experimental: {
    serverComponentsExternalPackages: ["@prisma/client"],
  },
};

export default nextConfig;

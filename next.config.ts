import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@google/genai"],
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

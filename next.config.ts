import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    turbopackFileSystemCacheForDev: true,
    // Increase body size limit for route handlers
    middlewareClientMaxBodySize: '50mb',
  },
};

export default nextConfig;

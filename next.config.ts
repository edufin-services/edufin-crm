import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    staleTimes: {
      dynamic: 30, // Keep dynamic pages in client cache for 30s to make back-and-forth tab switching instant
      static: 180,
    },
  },
};

export default nextConfig;

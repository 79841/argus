import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  async redirects() {
    return [
      {
        source: "/docs",
        destination: "/docs/en/getting-started",
        permanent: true,
      },
      {
        source: "/docs/:slug((?!en|ko)[^/]+)",
        destination: "/docs/en/:slug",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', '@opentelemetry/otlp-transformer'],
  devIndicators: false,
};

export default nextConfig;

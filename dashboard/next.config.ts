import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['better-sqlite3', '@opentelemetry/otlp-transformer'],
};

export default nextConfig;

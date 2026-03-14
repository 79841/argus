import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', '@opentelemetry/otlp-transformer'],
};

export default nextConfig;

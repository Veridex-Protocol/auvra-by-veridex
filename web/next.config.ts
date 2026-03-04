import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  serverExternalPackages: ['pino', 'pino-pretty'],
  turbopack: {
    resolveAlias: {
      // WalletConnect imports pino which uses dynamic worker files that
      // Turbopack can't resolve at SSR time. Stub it — pino logging is
      // only relevant in the browser console.
      'pino': './src/lib/pino-stub.js',
      'pino-pretty': './src/lib/pino-stub.js',
    },
  },
};

export default nextConfig;

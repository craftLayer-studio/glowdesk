import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // PGlite ships WASM and node-postgres has optional native bits: load them from node_modules at runtime.
  serverExternalPackages: ["@electric-sql/pglite", "pg"],
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // better-sqlite3 是原生模块，需在 server 端外部化，避免被打包
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;

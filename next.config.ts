import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@solana/web3.js", "bs58"],
};

export default nextConfig;

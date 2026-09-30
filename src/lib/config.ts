import path from "node:path";

export function repoRoot(): string {
  return process.cwd();
}

export function dataDir(): string {
  return path.join(repoRoot(), "data");
}

export function dbPath(): string {
  return process.env.PROOFORGE_DB_PATH ?? path.join(dataDir(), "proofforge.db");
}

export function artifactsDir(): string {
  return path.join(dataDir(), "artifacts");
}

export function packsDir(): string {
  return path.join(dataDir(), "packs");
}

export function keysDir(): string {
  return path.join(dataDir(), "keys");
}

export function solanaCluster(): "mock" | "devnet" | "testnet" | "custom" {
  const value = (process.env.SOLANA_CLUSTER ?? "mock").toLowerCase();
  if (value === "devnet" || value === "testnet" || value === "custom") {
    return value;
  }
  return "mock";
}

export function solanaRpcUrl(): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  if (solanaCluster() === "devnet") return "https://api.devnet.solana.com";
  if (solanaCluster() === "testnet") return "https://api.testnet.solana.com";
  return "http://northbridge-mock.invalid";
}

export function settleLamports(): number {
  const parsed = Number(process.env.SETTLE_LAMPORTS ?? "1000");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1000;
}

export function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || undefined;
}

export const SCHEMA_VERSION = 1;

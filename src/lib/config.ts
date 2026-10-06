import os from "node:os";
import path from "node:path";
import type { SettleMode } from "@/lib/types";

export function repoRoot(): string {
  return process.cwd();
}

/**
 * Scratch directory for proof-node artifacts, sealed packs, and local keys.
 * Serverless platforms (Vercel) only allow writes under the OS temp dir.
 */
export function dataDir(): string {
  if (process.env.PROOFFORGE_DATA_DIR) return process.env.PROOFFORGE_DATA_DIR;
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), "proofforge");
  }
  return path.join(repoRoot(), "data");
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

export type LiveCluster = "devnet" | "testnet" | "custom";

/** Back-compat: SOLANA_CLUSTER=mock|devnet|testnet|custom picks the default settle mode. */
export function solanaCluster(): "mock" | LiveCluster {
  const value = (process.env.SOLANA_CLUSTER ?? "mock").toLowerCase();
  if (value === "devnet" || value === "testnet" || value === "custom") {
    return value;
  }
  return "mock";
}

export function defaultSettleMode(): SettleMode {
  return solanaCluster() === "mock" ? "mock" : "live";
}

/** Public cluster used when settle mode is "live". */
export function liveCluster(): LiveCluster {
  const configured = solanaCluster();
  if (configured !== "mock") return configured;
  const live = (process.env.SOLANA_LIVE_CLUSTER ?? "devnet").toLowerCase();
  return live === "testnet" || live === "custom" ? live : "devnet";
}

export function liveRpcUrl(): string {
  if (process.env.SOLANA_RPC_URL) return process.env.SOLANA_RPC_URL;
  if (liveCluster() === "testnet") return "https://api.testnet.solana.com";
  return "https://api.devnet.solana.com";
}

export const MOCK_RPC_URL = "northbridge-mock://in-process";

export function solanaRpcUrl(mode: SettleMode = defaultSettleMode()): string {
  return mode === "mock" ? MOCK_RPC_URL : liveRpcUrl();
}

export function settleLamports(): number {
  const parsed = Number(process.env.SETTLE_LAMPORTS ?? "1000");
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1000;
}

export function githubToken(): string | undefined {
  return process.env.GITHUB_TOKEN || undefined;
}

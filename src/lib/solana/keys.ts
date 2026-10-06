import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { keysDir } from "@/lib/config";
import type { SettleMode } from "@/lib/types";

function parseSecret(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed) as number[];
    return Uint8Array.from(arr);
  }
  return bs58.decode(trimmed);
}

/**
 * Mock-cluster keys are derived from public seeds so every serverless instance
 * agrees on Avery's treasury and Morgan's wallet without writing key files.
 * They never hold real value.
 */
function mockKeypair(label: string): Keypair {
  const seed = createHash("sha256").update(`northbridge:proofforge:mock:${label}`).digest();
  return Keypair.fromSeed(Uint8Array.from(seed));
}

function localKeyPath(file: string): string {
  return path.join(keysDir(), file);
}

function readLocalKey(file: string): Keypair | null {
  const full = localKeyPath(file);
  if (!existsSync(/*turbopackIgnore: true*/ full)) return null;
  const arr = JSON.parse(readFileSync(/*turbopackIgnore: true*/ full, "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export function createLocalKey(file: string): Keypair {
  const existing = readLocalKey(file);
  if (existing) return existing;
  mkdirSync(/*turbopackIgnore: true*/ keysDir(), { recursive: true });
  const keypair = Keypair.generate();
  writeFileSync(/*turbopackIgnore: true*/ localKeyPath(file), JSON.stringify(Array.from(keypair.secretKey)), {
    encoding: "utf8",
    mode: 0o600,
  });
  return keypair;
}

/** Live payer: SOLANA_PAYER_SECRET, else data/keys/payer.json (created by `npm run devnet:setup`). */
export function liveConfiguredPayer(): Keypair | null {
  const env = process.env.SOLANA_PAYER_SECRET;
  if (env && env.trim()) return Keypair.fromSecretKey(parseSecret(env));
  return readLocalKey("payer.json");
}

export function loadPayer(mode: SettleMode): Keypair {
  if (mode === "mock") return mockKeypair("avery-treasury");
  const payer = liveConfiguredPayer();
  if (!payer) {
    throw new Error(
      "Live settle needs a funded payer. Set SOLANA_PAYER_SECRET or run `npm run devnet:setup`."
    );
  }
  return payer;
}

export function loadPayee(mode: SettleMode): PublicKey {
  if (mode === "live" && process.env.SOLANA_PAYEE_PUBKEY?.trim()) {
    return new PublicKey(process.env.SOLANA_PAYEE_PUBKEY.trim());
  }
  // Morgan's wallet. Public seed: fine for devnet demo payouts, never for mainnet.
  return mockKeypair("morgan-wallet").publicKey;
}

export function explorerTxUrl(cluster: string, signature: string, rpcUrl?: string): string | null {
  if (cluster === "devnet" || cluster === "testnet") {
    return `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;
  }
  if (cluster === "custom" && rpcUrl) {
    return `https://explorer.solana.com/tx/${signature}?cluster=custom&customUrl=${encodeURIComponent(rpcUrl)}`;
  }
  return null;
}

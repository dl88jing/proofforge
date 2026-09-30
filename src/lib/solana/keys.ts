import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { Keypair, PublicKey } from "@solana/web3.js";
import bs58 from "bs58";
import { keysDir } from "@/lib/config";

function parseSecret(raw: string): Uint8Array {
  const trimmed = raw.trim();
  if (trimmed.startsWith("[")) {
    const arr = JSON.parse(trimmed) as number[];
    return Uint8Array.from(arr);
  }
  return bs58.decode(trimmed);
}

function loadOrCreate(file: string, envValue?: string): Keypair {
  if (envValue && envValue.trim()) {
    return Keypair.fromSecretKey(parseSecret(envValue));
  }
  mkdirSync(keysDir(), { recursive: true });
  const full = path.join(keysDir(), file);
  if (existsSync(full)) {
    const arr = JSON.parse(readFileSync(full, "utf8")) as number[];
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }
  const keypair = Keypair.generate();
  writeFileSync(full, JSON.stringify(Array.from(keypair.secretKey)), {
    encoding: "utf8",
    mode: 0o600,
  });
  return keypair;
}

export function loadPayer(): Keypair {
  return loadOrCreate("payer.json", process.env.SOLANA_PAYER_SECRET);
}

export function loadPayee(): PublicKey {
  if (process.env.SOLANA_PAYEE_PUBKEY?.trim()) {
    return new PublicKey(process.env.SOLANA_PAYEE_PUBKEY.trim());
  }
  return loadOrCreate("payee.json").publicKey;
}

export function explorerTxUrl(cluster: string, signature: string): string | null {
  if (cluster === "devnet") {
    return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
  }
  if (cluster === "testnet") {
    return `https://explorer.solana.com/tx/${signature}?cluster=testnet`;
  }
  return null;
}

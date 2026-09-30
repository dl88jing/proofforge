import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { getDb, initDb } from "@/lib/db/client";
import { nowIso } from "@/lib/ids";

initDb();

const LAMPORTS_PER_SOL = 1_000_000_000;
const GENESIS = "northbridge-mock-genesis";

type RpcRequest = {
  jsonrpc?: string;
  id?: unknown;
  method?: string;
  params?: unknown;
};

type RpcResponse = {
  jsonrpc: "2.0";
  id: unknown;
  result?: unknown;
  error?: { code: number; message: string };
};

function metaGet(key: string, fallback: string): string {
  const row = getDb()
    .prepare("SELECT v FROM solana_mock_meta WHERE k = ?")
    .get(key) as { v: string } | undefined;
  return row?.v ?? fallback;
}

function metaSet(key: string, value: string): void {
  getDb()
    .prepare(
      "INSERT INTO solana_mock_meta (k, v) VALUES (?, ?) ON CONFLICT(k) DO UPDATE SET v = excluded.v"
    )
    .run(key, value);
}

function slot(): number {
  return Number(metaGet("slot", "1"));
}

function bumpSlot(): number {
  const next = slot() + 1;
  metaSet("slot", String(next));
  return next;
}

function ensureBlockhash(): { blockhash: string; lastValidBlockHeight: number } {
  const current = metaGet("blockhash", "");
  const height = Number(metaGet("lastValidBlockHeight", "0"));
  if (current && height > slot()) {
    return { blockhash: current, lastValidBlockHeight: height };
  }
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const blockhash = bs58.encode(bytes);
  const lastValidBlockHeight = slot() + 150;
  metaSet("blockhash", blockhash);
  metaSet("lastValidBlockHeight", String(lastValidBlockHeight));
  return { blockhash, lastValidBlockHeight };
}

export function mockAirdrop(pubkey: string, lamports: number): void {
  const db = getDb();
  const row = db
    .prepare("SELECT lamports FROM solana_mock_accounts WHERE pubkey = ?")
    .get(pubkey) as { lamports: number } | undefined;
  const next = (row?.lamports ?? 0) + lamports;
  db.prepare(
    "INSERT INTO solana_mock_accounts (pubkey, lamports) VALUES (?, ?) ON CONFLICT(pubkey) DO UPDATE SET lamports = excluded.lamports"
  ).run(pubkey, next);
}

function getLamports(pubkey: string): number {
  const row = getDb()
    .prepare("SELECT lamports FROM solana_mock_accounts WHERE pubkey = ?")
    .get(pubkey) as { lamports: number } | undefined;
  return row?.lamports ?? 0;
}

function applyLegacyTransfer(raw: Buffer): void {
  try {
    const tx = Transaction.from(raw);
    for (const ix of tx.instructions) {
      if (ix.programId.equals(PublicKey.default) && ix.data.length >= 12) {
        const opcode = ix.data.readUInt32LE(0);
        if (opcode === 2 && ix.keys.length >= 2) {
          const lamports = Number(ix.data.readBigUInt64LE(4));
          const from = ix.keys[0].pubkey.toBase58();
          const to = ix.keys[1].pubkey.toBase58();
          const fromBal = getLamports(from);
          if (fromBal < lamports) {
            throw new Error("insufficient mock lamports");
          }
          mockAirdrop(from, -lamports);
          mockAirdrop(to, lamports);
        }
      }
    }
  } catch {
    // Versioned tx or unparseable transfer: still accept the signature.
  }
}

function signatureFromRaw(raw: Buffer): string {
  try {
    const tx = Transaction.from(raw);
    const sig = tx.signature;
    if (sig) return bs58.encode(sig);
  } catch {
    // fall through
  }
  try {
    const vtx = VersionedTransaction.deserialize(raw);
    if (vtx.signatures[0]) return bs58.encode(vtx.signatures[0]);
  } catch {
    // fall through
  }
  return bs58.encode(raw.subarray(1, 65));
}

function context() {
  return { slot: slot(), apiVersion: "2.0.0" };
}

function ok(id: unknown, result: unknown): RpcResponse {
  return { jsonrpc: "2.0", id: id ?? 1, result };
}

function fail(id: unknown, message: string): RpcResponse {
  return { jsonrpc: "2.0", id: id ?? 1, error: { code: -32000, message } };
}

function handleMethod(method: string, params: unknown, id: unknown): RpcResponse {
  switch (method) {
    case "getHealth":
      return ok(id, "ok");
    case "getVersion":
      return ok(id, { "solana-core": "2.0.0-northbridge-mock", "feature-set": 0 });
    case "getGenesisHash":
      return ok(id, GENESIS);
    case "getSlot":
      return ok(id, slot());
    case "getBlockHeight":
      return ok(id, slot());
    case "getLatestBlockhash": {
      const value = ensureBlockhash();
      return ok(id, { context: context(), value });
    }
    case "getRecentBlockhash": {
      const value = ensureBlockhash();
      return ok(id, {
        context: context(),
        value: {
          blockhash: value.blockhash,
          feeCalculator: { lamportsPerSignature: 5000 },
        },
      });
    }
    case "getEpochInfo":
      return ok(id, {
        epoch: 0,
        slotIndex: slot(),
        slotsInEpoch: 432000,
        absoluteSlot: slot(),
        blockHeight: slot(),
        transactionCount: slot(),
      });
    case "getMinimumBalanceForRentExemption":
      return ok(id, 890880);
    case "getFeeForMessage":
      return ok(id, { context: context(), value: 5000 });
    case "getRecentPrioritizationFees":
      return ok(id, []);
    case "getBalance": {
      const [pubkey] = (params as [string]) ?? [];
      return ok(id, { context: context(), value: getLamports(pubkey) });
    }
    case "getAccountInfo": {
      const [pubkey] = (params as [string]) ?? [];
      const lamports = getLamports(pubkey);
      if (!lamports) return ok(id, { context: context(), value: null });
      return ok(id, {
        context: context(),
        value: {
          lamports,
          owner: "11111111111111111111111111111111",
          data: ["", "base64"],
          executable: false,
          rentEpoch: 0,
          space: 0,
        },
      });
    }
    case "requestAirdrop": {
      const [pubkey, lamports] = (params as [string, number]) ?? [];
      mockAirdrop(pubkey, lamports ?? LAMPORTS_PER_SOL);
      const sig = bs58.encode(crypto.getRandomValues(new Uint8Array(64)));
      const currentSlot = bumpSlot();
      getDb()
        .prepare(
          "INSERT INTO solana_mock_sigs (signature, slot, status, err, raw_tx, created_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(sig, currentSlot, "confirmed", null, null, nowIso());
      return ok(id, sig);
    }
    case "simulateTransaction":
      return ok(id, {
        context: context(),
        value: { err: null, logs: ["northbridge mock simulate ok"], unitsConsumed: 1000, accounts: null, returnData: null },
      });
    case "sendTransaction": {
      const [encoded, opts] = (params as [string, { encoding?: string }?]) ?? [];
      const encoding = opts?.encoding ?? "base64";
      const raw =
        encoding === "base64"
          ? Buffer.from(encoded, "base64")
          : Buffer.from(encoded, "hex");
      applyLegacyTransfer(raw);
      const signature = signatureFromRaw(raw);
      const currentSlot = bumpSlot();
      getDb()
        .prepare(
          `INSERT INTO solana_mock_sigs (signature, slot, status, err, raw_tx, created_at)
           VALUES (?, ?, ?, ?, ?, ?)
           ON CONFLICT(signature) DO UPDATE SET slot = excluded.slot, status = excluded.status`
        )
        .run(signature, currentSlot, "confirmed", null, raw.toString("base64"), nowIso());
      return ok(id, signature);
    }
    case "getSignatureStatuses": {
      const [signatures] = (params as [string[]]) ?? [[]];
      const db = getDb();
      const value = (signatures ?? []).map((signature) => {
        const row = db
          .prepare("SELECT slot, status, err FROM solana_mock_sigs WHERE signature = ?")
          .get(signature) as { slot: number; status: string; err: string | null } | undefined;
        if (!row) return null;
        return {
          slot: row.slot,
          confirmations: 1,
          err: row.err ? { InstructionError: row.err } : null,
          confirmationStatus: row.status,
        };
      });
      return ok(id, { context: context(), value });
    }
    case "getTransaction": {
      const [signature] = (params as [string]) ?? [];
      const row = getDb()
        .prepare("SELECT slot, raw_tx FROM solana_mock_sigs WHERE signature = ?")
        .get(signature) as { slot: number; raw_tx: string | null } | undefined;
      if (!row) return ok(id, null);
      return ok(id, {
        slot: row.slot,
        transaction: { signatures: [signature], message: { accountKeys: [], instructions: [] } },
        meta: { err: null, fee: 5000, logMessages: ["northbridge mock"] },
        blockTime: Math.floor(Date.now() / 1000),
      });
    }
    default:
      return fail(id, `Northbridge mock RPC does not implement ${method}`);
  }
}

export function handleSolanaRpc(body: RpcRequest | RpcRequest[]): RpcResponse | RpcResponse[] {
  if (Array.isArray(body)) {
    return body.map((item) => handleSolanaRpc(item) as RpcResponse);
  }
  const method = body.method ?? "";
  return handleMethod(method, body.params, body.id);
}

export async function mockSolanaFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const raw = init?.body ? String(init.body) : "{}";
  let parsed: RpcRequest | RpcRequest[];
  try {
    parsed = JSON.parse(raw) as RpcRequest | RpcRequest[];
  } catch {
    return new Response(
      JSON.stringify({ jsonrpc: "2.0", id: 1, error: { code: -32700, message: "parse error" } }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
  const result = handleSolanaRpc(parsed);
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export function fundIfNeeded(pubkey: string, minLamports = LAMPORTS_PER_SOL): void {
  if (getLamports(pubkey) < minLamports) {
    mockAirdrop(pubkey, minLamports);
  }
}

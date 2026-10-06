import {
  PublicKey,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import bs58 from "bs58";
import { getStore, touchStore } from "@/lib/store";
import { nowIso } from "@/lib/ids";

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
  return getStore().mockMeta[key] ?? fallback;
}

function metaSet(key: string, value: string): void {
  getStore().mockMeta[key] = value;
  touchStore();
}

function recordSig(signature: string, slotNo: number, rawTx: string | null): void {
  getStore().mockSigs[signature] = {
    slot: slotNo,
    status: "confirmed",
    err: null,
    raw_tx: rawTx,
    created_at: nowIso(),
  };
  touchStore();
}

/** Raw base64 transaction the mock cluster accepted for this signature. */
export function mockRawTransaction(signature: string): { slot: number; rawTx: string } | null {
  const row = getStore().mockSigs[signature];
  return row?.raw_tx ? { slot: row.slot, rawTx: row.raw_tx } : null;
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
  const accounts = getStore().mockAccounts;
  accounts[pubkey] = (accounts[pubkey] ?? 0) + lamports;
  touchStore();
}

export function getLamports(pubkey: string): number {
  return getStore().mockAccounts[pubkey] ?? 0;
}

/**
 * Validate and apply a legacy transaction like a (tiny) real cluster would:
 * every required signature must verify, the blockhash must be one we issued,
 * and System Program transfers must be funded. Returns an error string or null.
 */
function applyLegacyTransfer(raw: Buffer): string | null {
  let tx: Transaction;
  try {
    tx = Transaction.from(raw);
  } catch {
    return null; // Versioned tx: accept signature without balance effects.
  }
  if (!tx.verifySignatures()) return "signature verification failed";
  if (tx.recentBlockhash && tx.recentBlockhash !== metaGet("blockhash", "")) {
    return "blockhash not found";
  }
  const fee = 5000 * tx.signatures.length;
  const payer = tx.feePayer?.toBase58();
  if (payer) {
    if (getLamports(payer) < fee) return "insufficient funds for fee";
    mockAirdrop(payer, -fee);
  }
  for (const ix of tx.instructions) {
    if (ix.programId.equals(PublicKey.default) && ix.data.length >= 12) {
      const opcode = ix.data.readUInt32LE(0);
      if (opcode === 2 && ix.keys.length >= 2) {
        const lamports = Number(ix.data.readBigUInt64LE(4));
        const from = ix.keys[0].pubkey.toBase58();
        const to = ix.keys[1].pubkey.toBase58();
        if (getLamports(from) < lamports) return "insufficient lamports for transfer";
        mockAirdrop(from, -lamports);
        mockAirdrop(to, lamports);
      }
    }
  }
  return null;
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
      recordSig(sig, bumpSlot(), null);
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
      const rejected = applyLegacyTransfer(raw);
      if (rejected) return fail(id, `Transaction rejected by Northbridge mock cluster: ${rejected}`);
      const signature = signatureFromRaw(raw);
      recordSig(signature, bumpSlot(), raw.toString("base64"));
      return ok(id, signature);
    }
    case "getSignatureStatuses": {
      const [signatures] = (params as [string[]]) ?? [[]];
      const value = (signatures ?? []).map((signature) => {
        const row = getStore().mockSigs[signature];
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
      const row = getStore().mockSigs[signature];
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

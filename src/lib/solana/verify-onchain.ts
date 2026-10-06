import {
  Connection,
  type ParsedInstruction,
  type PartiallyDecodedInstruction,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { digestOf } from "@/lib/hash";
import { getPack, parsePack, settlementForPack } from "@/lib/db/queries";
import { MEMO_PROGRAM_ID } from "@/lib/solana/settle";
import { mockRawTransaction } from "@/lib/solana/mock-rpc";
import { explorerTxUrl } from "@/lib/solana/keys";

export type OnchainCheck = { id: string; passed: boolean; detail: string };

export type OnchainVerification = {
  packId: string;
  digest: string;
  cluster: string | null;
  signature: string | null;
  explorer: string | null;
  verified: boolean;
  checks: OnchainCheck[];
  verifiedAt: string;
};

type DecodedTx = {
  feePayer: string | null;
  signaturesValid: boolean | null;
  memos: string[];
  transfers: { from: string; to: string; lamports: number }[];
  slot: number | null;
};

function decodeMock(rawB64: string, slot: number): DecodedTx {
  const tx = Transaction.from(Buffer.from(rawB64, "base64"));
  const memos: string[] = [];
  const transfers: DecodedTx["transfers"] = [];
  for (const ix of tx.instructions) {
    if (ix.programId.equals(MEMO_PROGRAM_ID)) memos.push(ix.data.toString("utf8"));
    if (ix.programId.equals(SystemProgram.programId) && ix.data.readUInt32LE(0) === 2) {
      transfers.push({
        from: ix.keys[0].pubkey.toBase58(),
        to: ix.keys[1].pubkey.toBase58(),
        lamports: Number(ix.data.readBigUInt64LE(4)),
      });
    }
  }
  return {
    feePayer: tx.feePayer?.toBase58() ?? null,
    signaturesValid: tx.verifySignatures(),
    memos,
    transfers,
    slot,
  };
}

async function decodeLive(rpcUrl: string, signature: string): Promise<DecodedTx | null> {
  const connection = new Connection(rpcUrl, "confirmed");
  const tx = await connection.getParsedTransaction(signature, {
    commitment: "confirmed",
    maxSupportedTransactionVersion: 0,
  });
  if (!tx) return null;
  const memos: string[] = [];
  const transfers: DecodedTx["transfers"] = [];
  for (const ix of tx.transaction.message.instructions as (
    | ParsedInstruction
    | PartiallyDecodedInstruction
  )[]) {
    if (!("parsed" in ix)) continue;
    if (ix.programId.equals(MEMO_PROGRAM_ID) && typeof ix.parsed === "string") memos.push(ix.parsed);
    if (ix.program === "system" && ix.parsed?.type === "transfer") {
      const info = ix.parsed.info as { source: string; destination: string; lamports: number };
      transfers.push({ from: info.source, to: info.destination, lamports: Number(info.lamports) });
    }
  }
  const feePayer = tx.transaction.message.accountKeys.find((key) => key.signer)?.pubkey;
  return {
    feePayer: feePayer ? new PublicKey(feePayer).toBase58() : null,
    signaturesValid: tx.meta ? tx.meta.err === null : null,
    memos,
    transfers,
    slot: tx.slot,
  };
}

/**
 * Trust-minimized check a judge (or anyone) can run: recompute the Proof Pack
 * digest from its canonical JSON, read the settlement transaction back from the
 * cluster, and confirm the memo commits to exactly that digest.
 */
export async function verifyPackOnchain(packId: string): Promise<OnchainVerification | null> {
  const row = getPack(packId);
  if (!row) return null;
  const { pack } = parsePack(row);
  const checks: OnchainCheck[] = [];

  const { digest: claimed, ...unsigned } = pack;
  const recomputed = digestOf({ ...unsigned, packId: row.id });
  checks.push({
    id: "pack_digest",
    passed: recomputed === claimed && claimed === row.digest,
    detail:
      recomputed === claimed
        ? `canonical SHA-256 recomputed: ${recomputed.slice(0, 23)}…`
        : `recomputed ${recomputed} ≠ sealed ${claimed}`,
  });
  checks.push({
    id: "verifier_passed",
    passed: pack.verifier.passed,
    detail: pack.verifier.summary,
  });

  const settlement = settlementForPack(row.id);
  const base = {
    packId: row.id,
    digest: row.digest,
    verifiedAt: new Date().toISOString(),
  };
  if (!settlement?.signature) {
    checks.push({ id: "settlement", passed: false, detail: "No confirmed Solana settlement yet." });
    return { ...base, cluster: null, signature: null, explorer: null, verified: false, checks };
  }

  const expectedMemo = `northbridge:${row.digest}`;
  let decoded: DecodedTx | null = null;
  try {
    if (settlement.cluster === "mock") {
      const raw = mockRawTransaction(settlement.signature);
      decoded = raw ? decodeMock(raw.rawTx, raw.slot) : null;
    } else {
      decoded = await decodeLive(settlement.rpc_url, settlement.signature);
    }
  } catch (error) {
    checks.push({
      id: "tx_found",
      passed: false,
      detail: `RPC lookup failed: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  if (decoded) {
    checks.push({
      id: "tx_found",
      passed: true,
      detail: `${settlement.cluster} slot ${decoded.slot ?? "?"}`,
    });
    checks.push({
      id: "tx_succeeded",
      passed: decoded.signaturesValid !== false,
      detail:
        settlement.cluster === "mock"
          ? "ed25519 signatures re-verified locally"
          : "cluster reports meta.err = null",
    });
    checks.push({
      id: "memo_commits_digest",
      passed: decoded.memos.includes(expectedMemo),
      detail: decoded.memos.includes(expectedMemo)
        ? `memo = ${expectedMemo.slice(0, 32)}…`
        : `memo(s) on chain: ${decoded.memos.join(" | ") || "none"}`,
    });
    const transfer = decoded.transfers.find(
      (t) => t.from === settlement.payer_pubkey && t.to === settlement.payee_pubkey
    );
    checks.push({
      id: "payout_transfer",
      passed: Boolean(transfer && transfer.lamports === settlement.lamports),
      detail: transfer
        ? `${transfer.lamports} lamports Avery treasury → Morgan`
        : "no matching System Program transfer",
    });
    checks.push({
      id: "treasury_signed",
      passed: decoded.feePayer === settlement.payer_pubkey,
      detail: `fee payer ${decoded.feePayer?.slice(0, 8) ?? "?"}…`,
    });
  } else if (!checks.some((c) => c.id === "tx_found")) {
    checks.push({ id: "tx_found", passed: false, detail: "Transaction not found on cluster." });
  }

  return {
    ...base,
    cluster: settlement.cluster,
    signature: settlement.signature,
    explorer: explorerTxUrl(settlement.cluster, settlement.signature, settlement.rpc_url),
    verified: checks.every((c) => c.passed),
    checks,
  };
}

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { liveCluster, settleLamports, solanaRpcUrl } from "@/lib/config";
import { fundIfNeeded, mockSolanaFetch } from "@/lib/solana/mock-rpc";
import { liveConfiguredPayer, loadPayer, loadPayee } from "@/lib/solana/keys";
import type { SettleMode } from "@/lib/types";

export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export function memoInstruction(message: string, signer?: PublicKey): TransactionInstruction {
  return new TransactionInstruction({
    // Memo v2 records signers; listing the payer binds the memo to Avery's treasury key.
    keys: signer ? [{ pubkey: signer, isSigner: true, isWritable: false }] : [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(message, "utf8"),
  });
}

export function clusterLabel(mode: SettleMode): string {
  return mode === "mock" ? "mock" : liveCluster();
}

export function createSettleConnection(mode: SettleMode): {
  connection: Connection;
  cluster: string;
  rpcUrl: string;
} {
  const rpcUrl = solanaRpcUrl(mode);
  if (mode === "mock") {
    // web3.js Connection requires an http(s) endpoint; fetch is intercepted in-process.
    const connection = new Connection("http://northbridge-mock.invalid", {
      commitment: "confirmed",
      fetch: mockSolanaFetch,
      disableRetryOnRateLimit: true,
      confirmTransactionInitialTimeout: 8_000,
    });
    return { connection, cluster: "mock", rpcUrl };
  }
  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 45_000,
  });
  return { connection, cluster: liveCluster(), rpcUrl };
}

/** What the UI needs to render the mock / live settle toggle. */
export function settleOptions() {
  const payer = (() => {
    try {
      return liveConfiguredPayer();
    } catch {
      return null;
    }
  })();
  return {
    liveCluster: liveCluster(),
    liveRpcUrl: solanaRpcUrl("live"),
    liveReady: Boolean(payer),
    livePayer: payer?.publicKey.toBase58() ?? null,
    mockPayer: loadPayer("mock").publicKey.toBase58(),
    payee: loadPayee("live").toBase58(),
    lamports: settleLamports(),
  };
}

export async function liveBalances() {
  const opts = settleOptions();
  if (!opts.livePayer) return null;
  const { connection } = createSettleConnection("live");
  const [payer, payee] = await Promise.all([
    connection.getBalance(new PublicKey(opts.livePayer)),
    connection.getBalance(new PublicKey(opts.payee)),
  ]);
  return { payer, payee, payerSol: payer / LAMPORTS_PER_SOL };
}

export async function sendProofSettlement(
  memo: string,
  mode: SettleMode
): Promise<{
  signature: string;
  slot: number | null;
  payer: string;
  payee: string;
  lamports: number;
  cluster: string;
  rpcUrl: string;
  serializedTx: string;
}> {
  const { connection, cluster, rpcUrl } = createSettleConnection(mode);
  const payer = loadPayer(mode);
  const payee = loadPayee(mode);
  let lamports = settleLamports();

  if (mode === "mock") {
    fundIfNeeded(payer.publicKey.toBase58());
  } else {
    // A brand-new payee account must end up rent-exempt or the cluster rejects the transfer.
    const [payeeBalance, rentFloor, payerBalance] = await Promise.all([
      connection.getBalance(payee, "confirmed"),
      connection.getMinimumBalanceForRentExemption(0),
      connection.getBalance(payer.publicKey, "confirmed"),
    ]);
    if (payeeBalance + lamports < rentFloor) lamports = rentFloor - payeeBalance;
    if (payerBalance < lamports + 10_000) {
      throw new Error(
        `Payer ${payer.publicKey.toBase58()} has ${payerBalance} lamports on ${cluster}; needs ${lamports + 10_000}. Fund it at https://faucet.solana.com.`
      );
    }
  }

  const latest = await connection.getLatestBlockhash("confirmed");
  const tx = new Transaction({
    feePayer: payer.publicKey,
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  }).add(
    SystemProgram.transfer({
      fromPubkey: payer.publicKey,
      toPubkey: payee,
      lamports,
    }),
    memoInstruction(memo, payer.publicKey)
  );
  tx.sign(payer);

  const raw = tx.serialize();
  const serializedTx = raw.toString("base64");
  const signature = await connection.sendRawTransaction(raw, {
    skipPreflight: mode === "mock",
    maxRetries: mode === "mock" ? 0 : 5,
  });

  let slot: number | null = null;
  if (mode === "mock") {
    // confirmTransaction races a websocket subscribe that cannot resolve on mock RPC.
    const statuses = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const value = statuses.value[0];
    if (!value) {
      throw new Error("Mock RPC accepted the tx but returned no signature status.");
    }
    if (value.err) {
      throw new Error(`Solana transaction failed: ${JSON.stringify(value.err)}`);
    }
    slot = value.slot ?? null;
  } else {
    slot = await pollConfirmation(connection, signature, latest.lastValidBlockHeight);
  }

  return {
    signature,
    slot,
    payer: payer.publicKey.toBase58(),
    payee: payee.toBase58(),
    lamports,
    cluster,
    rpcUrl,
    serializedTx,
  };
}

/** HTTP polling instead of websocket subscriptions: works inside serverless functions. */
async function pollConfirmation(
  connection: Connection,
  signature: string,
  lastValidBlockHeight: number
): Promise<number | null> {
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline) {
    const { value } = await connection.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const status = value[0];
    if (status?.err) throw new Error(`Solana transaction failed: ${JSON.stringify(status.err)}`);
    if (status && (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized")) {
      return status.slot ?? null;
    }
    const height = await connection.getBlockHeight("confirmed");
    if (height > lastValidBlockHeight) throw new Error("Blockhash expired before confirmation.");
    await new Promise((resolve) => setTimeout(resolve, 1_200));
  }
  throw new Error(`Timed out waiting for ${signature} to confirm.`);
}

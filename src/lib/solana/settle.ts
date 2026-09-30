import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { solanaCluster, solanaRpcUrl, settleLamports } from "@/lib/config";
import { fundIfNeeded, mockSolanaFetch } from "@/lib/solana/mock-rpc";
import { loadPayer, loadPayee } from "@/lib/solana/keys";

export const MEMO_PROGRAM_ID = new PublicKey(
  "MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"
);

export function memoInstruction(message: string): TransactionInstruction {
  return new TransactionInstruction({
    keys: [],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(message, "utf8"),
  });
}

export function createSettleConnection(): {
  connection: Connection;
  cluster: string;
  rpcUrl: string;
} {
  const cluster = solanaCluster();
  const rpcUrl = solanaRpcUrl();
  if (cluster === "mock") {
    const connection = new Connection(rpcUrl, {
      commitment: "confirmed",
      fetch: mockSolanaFetch,
      disableRetryOnRateLimit: true,
      confirmTransactionInitialTimeout: 8_000,
    });
    return { connection, cluster, rpcUrl };
  }
  const connection = new Connection(rpcUrl, {
    commitment: "confirmed",
    confirmTransactionInitialTimeout: 30_000,
  });
  return { connection, cluster, rpcUrl };
}

export async function sendProofSettlement(memo: string): Promise<{
  signature: string;
  slot: number | null;
  payer: string;
  payee: string;
  lamports: number;
  cluster: string;
  rpcUrl: string;
  serializedTx: string;
}> {
  const { connection, cluster, rpcUrl } = createSettleConnection();
  const payer = loadPayer();
  const payee = loadPayee();
  const lamports = settleLamports();

  if (cluster === "mock") {
    fundIfNeeded(payer.publicKey.toBase58());
    fundIfNeeded(payee.toBase58(), 0);
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
    memoInstruction(memo)
  );
  tx.sign(payer);

  const serializedTx = tx.serialize().toString("base64");
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: cluster === "mock",
    maxRetries: cluster === "mock" ? 0 : 5,
  });

  let slot: number | null = null;
  if (cluster === "mock") {
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
    const confirmation = await connection.confirmTransaction(
      {
        signature,
        blockhash: latest.blockhash,
        lastValidBlockHeight: latest.lastValidBlockHeight,
      },
      "confirmed"
    );
    if (confirmation.value.err) {
      throw new Error(`Solana transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }
    slot = confirmation.context.slot ?? null;
    try {
      const statuses = await connection.getSignatureStatuses([signature]);
      slot = statuses.value[0]?.slot ?? slot;
    } catch {
      // keep context slot
    }
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

/**
 * Prepare a live Solana devnet payer (Avery's treasury) for real settlement.
 *   npm run devnet:setup
 * Creates data/keys/payer.json (gitignored) unless SOLANA_PAYER_SECRET is set,
 * then tries a 1 SOL faucet airdrop. Public faucets rate-limit; if the airdrop
 * fails, fund the printed address at https://faucet.solana.com.
 */
import { Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { liveCluster, liveRpcUrl } from "../src/lib/config";
import { createLocalKey, liveConfiguredPayer, loadPayee } from "../src/lib/solana/keys";

async function main() {
  const payer = liveConfiguredPayer() ?? createLocalKey("payer.json");
  const connection = new Connection(liveRpcUrl(), "confirmed");
  const pubkey = payer.publicKey;
  console.log(`cluster  ${liveCluster()}  ${liveRpcUrl()}`);
  console.log(`payer    ${pubkey.toBase58()}  (Avery treasury)`);
  console.log(`payee    ${loadPayee("live").toBase58()}  (Morgan wallet)`);
  let balance = await connection.getBalance(pubkey);
  console.log(`balance  ${balance / LAMPORTS_PER_SOL} SOL`);
  if (balance < 0.05 * LAMPORTS_PER_SOL) {
    try {
      const sig = await connection.requestAirdrop(pubkey, LAMPORTS_PER_SOL);
      const latest = await connection.getLatestBlockhash();
      await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
      balance = await connection.getBalance(pubkey);
      console.log(`airdrop  ok → ${balance / LAMPORTS_PER_SOL} SOL`);
    } catch (error) {
      console.log(`airdrop  failed (${error instanceof Error ? error.message.split("\n")[0] : error})`);
      console.log(`         Fund ${pubkey.toBase58()} at https://faucet.solana.com (devnet), then re-run.`);
    }
  }
  if (!process.env.SOLANA_PAYER_SECRET) {
    console.log("\nFor Vercel, set SOLANA_PAYER_SECRET to the JSON array in data/keys/payer.json.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

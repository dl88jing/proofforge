/**
 * End-to-end household demo: intake → proof → pack → accept → Solana settle → on-chain verify.
 * Uses the same pipeline as the web UI. Does not seed fake rows up front.
 *
 *   npm run demo                 # in-process mock cluster (no network, no keys)
 *   npm run demo -- --live       # real Solana devnet (after `npm run devnet:setup`)
 *   npm run demo -- <issue-url>  # any public GitHub issue / bounty URL
 */
import {
  importAndBoundMission,
  runMissionProof,
  submitMissionPack,
  reviewMission,
  settleMission,
} from "../src/lib/pipeline";
import { verifyPackOnchain } from "../src/lib/solana/verify-onchain";
import type { SettleMode } from "../src/lib/types";

const DEFAULT_URL = "https://github.com/solana-foundation/solana-web3.js/issues/1";

async function main() {
  const args = process.argv.slice(2);
  const mode: SettleMode = args.includes("--live") ? "live" : args.includes("--mock") ? "mock" : (process.env.SOLANA_CLUSTER && process.env.SOLANA_CLUSTER !== "mock" ? "live" : "mock");
  const url = args.find((arg) => !arg.startsWith("--")) ?? DEFAULT_URL;
  console.log("Northbridge ProofForge demo loop");
  console.log(`intake   ${url}`);

  const imported = await importAndBoundMission(url);
  console.log(`bounded  ${imported.mission.id}  ${imported.mission.title}`);

  const ran = runMissionProof(imported.mission.id);
  console.log(`morgan   ran ${ran.run?.id}  verifier=${ran.pack?.verifier.passed ? "pass" : "fail"}`);
  if (!ran.pack) {
    throw new Error("Verifier did not produce a Proof Pack.");
  }
  console.log(`pack     ${ran.pack.digest}`);

  const submitted = submitMissionPack(imported.mission.id);
  console.log(`morgan   submitted → ${submitted.mission.status}`);

  const accepted = reviewMission(
    imported.mission.id,
    "accept",
    "Avery accepts. The work holds. Authorize Solana settle."
  );
  console.log(`avery    accepted → ${accepted.mission.status}`);

  const settled = await settleMission(imported.mission.id, mode);
  const stl = settled.settlement;
  if (!stl?.signature) {
    throw new Error("Settle did not return a signature.");
  }
  console.log(`settled  ${stl.cluster}  ${stl.lamports} lamports  slot ${stl.slot}`);
  console.log(`payer    ${stl.payerPubkey}  (Avery treasury)`);
  console.log(`payee    ${stl.payeePubkey}  (Morgan wallet)`);
  console.log(`sig      ${stl.signature}`);
  console.log(`memo     ${stl.memo}`);
  if (stl.explorer) console.log(`explorer ${stl.explorer}`);

  const verification = await verifyPackOnchain(settled.pack!.packId);
  for (const check of verification?.checks ?? []) {
    console.log(`verify   ${check.passed ? "✓" : "✗"} ${check.id.padEnd(20)} ${check.detail}`);
  }
  console.log(`proof    /proof/${settled.pack!.packId}`);
  console.log(verification?.verified ? "The work holds. On-chain record matches the sealed pack." : "Verification incomplete.");
  if (!verification?.verified) process.exit(1);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

/**
 * End-to-end household demo: intake → proof → pack → accept → Solana settle.
 * Uses the same pipeline as the web UI. Does not seed fake table rows up front.
 */
import {
  importAndBoundMission,
  runMissionProof,
  submitMissionPack,
  reviewMission,
  settleMission,
} from "../src/lib/pipeline";

const DEFAULT_URL = "https://github.com/solana-foundation/solana-web3.js/issues/1";

async function main() {
  const url = process.argv[2] ?? DEFAULT_URL;
  console.log("Northbridge ProofForge demo loop");
  console.log(`Intake ${url}`);

  const imported = await importAndBoundMission(url);
  console.log(`bounded  ${imported.mission.id}  ${imported.mission.title}`);

  const ran = runMissionProof(imported.mission.id);
  console.log(`ran      ${ran.run?.id}  verifier=${ran.pack?.verifier.passed ? "pass" : "fail"}`);
  if (!ran.pack) {
    throw new Error("Verifier did not produce a Proof Pack.");
  }

  const submitted = submitMissionPack(imported.mission.id);
  console.log(`submitted status=${submitted.mission.status}`);

  const accepted = reviewMission(
    imported.mission.id,
    "accept",
    "Avery accepts. The work holds. Authorize Solana settle."
  );
  console.log(`accepted status=${accepted.mission.status}`);

  const settled = await settleMission(imported.mission.id);
  const stl = settled.settlement;
  if (!stl?.signature) {
    throw new Error("Settle did not return a signature.");
  }
  console.log(`settled  ${stl.cluster}  ${stl.lamports} lamports`);
  console.log(`payer    ${stl.payerPubkey}`);
  console.log(`payee    ${stl.payeePubkey}`);
  console.log(`sig      ${stl.signature}`);
  console.log(`memo     ${stl.memo}`);
  console.log(`pack     ${settled.pack?.digest}`);
  console.log("The work holds.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});

import { HOUSEHOLD } from "@/lib/household";
import { fetchGithubSource } from "@/lib/github/import";
import { boundMission } from "@/lib/mission/bound";
import { scanPolicy } from "@/lib/mission/policy";
import { runProofNode } from "@/lib/proof/runner";
import { verifyRun } from "@/lib/proof/verifier";
import { buildProofPack, markPublicProof } from "@/lib/proof/pack";
import { grantAcceptedCredit, recordRejection, recordSettlement } from "@/lib/credit/reputation";
import { sendProofSettlement } from "@/lib/solana/settle";
import { explorerTxUrl } from "@/lib/solana/keys";
import { appendEvent } from "@/lib/events/chain";
import { newId, nowIso } from "@/lib/ids";
import { getDb } from "@/lib/db/client";
import {
  getMission,
  getPack,
  insertMission,
  insertProofPack,
  insertProofRun,
  insertReview,
  insertSettlement,
  latestPack,
  latestReview,
  latestRun,
  latestSettlement,
  listCredits,
  listEvents,
  listMissions,
  listReputation,
  listSettlements,
  parseMission,
  parsePack,
  toSettlementRecord,
  updateMissionStatus,
  updateSettlement,
  type MissionRow,
} from "@/lib/db/queries";

function requireMission(id: string) {
  const row = getMission(id);
  if (!row) throw new Error("Mission not found.");
  return parseMission(row);
}

export async function importAndBoundMission(url: string) {
  const source = await fetchGithubSource(url);
  const policy = scanPolicy(source);
  if (!policy.allowed) {
    const blocked = policy.findings.filter((finding) => finding.severity === "block");
    throw new Error(blocked[0]?.message ?? "Policy blocked this source.");
  }
  const bounded = boundMission(source);
  const mission = insertMission({
    id: newId("msn"),
    source,
    title: bounded.title,
    objective: bounded.objective,
    bounds: bounded.bounds,
    acceptance: bounded.acceptance,
    rewardLabel: bounded.rewardLabel,
    status: "bounded",
    policy,
  });
  appendEvent("source.imported", mission.id, {
    url: source.url,
    title: source.title,
    offlineFallback: source.offlineFallback,
  });
  appendEvent("mission.bounded", mission.id, {
    title: bounded.title,
    acceptance: bounded.acceptance,
    rewardLabel: bounded.rewardLabel,
  });
  return assembleMission(mission.id);
}

export function runMissionProof(missionId: string) {
  const mission = requireMission(missionId);
  if (mission.status !== "bounded" && mission.status !== "failed" && mission.status !== "rejected") {
    throw new Error(`Cannot run proof from status ${mission.status}.`);
  }
  updateMissionStatus(missionId, "running");
  const runId = newId("run");
  const output = runProofNode({
    runId,
    source: mission.source,
    acceptance: mission.acceptance,
    policy: mission.policy,
    missionTitle: mission.title,
    missionObjective: mission.objective,
  });
  const verifier = verifyRun({
    runId,
    artifacts: output.artifacts,
    commands: output.commands,
    logs: output.logs,
    policy: mission.policy,
    sourceDigest: output.sourceDigest,
  });
  insertProofRun({
    id: runId,
    mission_id: missionId,
    node_id: HOUSEHOLD.nodeId,
    operator: HOUSEHOLD.operators.morgan.name,
    started_at: output.startedAt,
    finished_at: output.finishedAt,
    status: verifier.passed ? "passed" : "failed",
    commands_json: JSON.stringify(output.commands),
    logs: output.logs,
    artifacts_json: JSON.stringify(output.artifacts),
    env_json: JSON.stringify(output.env),
  });
  appendEvent("proof.ran", missionId, {
    runId,
    commands: output.commands.length,
    sourceDigest: output.sourceDigest,
  });
  appendEvent("proof.verified", missionId, {
    runId,
    passed: verifier.passed,
    summary: verifier.summary,
  });

  if (!verifier.passed) {
    updateMissionStatus(missionId, "failed");
    return assembleMission(missionId);
  }

  const packId = newId("pack");
  const built = buildProofPack({
    packId,
    missionId,
    runId,
    source: mission.source,
    title: mission.title,
    objective: mission.objective,
    bounds: mission.bounds,
    acceptance: mission.acceptance,
    rewardLabel: mission.reward_label ?? "Household credit",
    policy: mission.policy,
    operator: HOUSEHOLD.operators.morgan.name,
    startedAt: output.startedAt,
    finishedAt: output.finishedAt,
    commands: output.commands,
    artifacts: output.artifacts,
    verifier,
  });
  insertProofPack({
    id: packId,
    mission_id: missionId,
    run_id: runId,
    schema_version: built.pack.schema,
    digest: built.pack.digest,
    pack_json: JSON.stringify(built.pack),
    public_json: JSON.stringify(built.publicProof),
    created_at: built.pack.createdAt,
  });
  appendEvent("pack.created", missionId, {
    packId,
    digest: built.pack.digest,
    filePath: built.filePath,
  });
  updateMissionStatus(missionId, "packed");
  return assembleMission(missionId);
}

export function submitMissionPack(missionId: string) {
  const mission = requireMission(missionId);
  if (mission.status !== "packed") {
    throw new Error("Submit is only available after a Proof Pack is created.");
  }
  const pack = latestPack(missionId);
  if (!pack) throw new Error("No Proof Pack to submit.");
  updateMissionStatus(missionId, "submitted");
  appendEvent("pack.submitted", missionId, { packId: pack.id, digest: pack.digest });
  return assembleMission(missionId);
}

export function reviewMission(
  missionId: string,
  decision: "accept" | "reject",
  note: string,
  reviewer = HOUSEHOLD.operators.avery.name
) {
  const mission = requireMission(missionId);
  if (mission.status !== "submitted") {
    throw new Error("Avery can only review a submitted Proof Pack.");
  }
  const packRow = latestPack(missionId);
  if (!packRow) throw new Error("No Proof Pack on this mission.");
  const { pack, publicProof } = parsePack(packRow);
  insertReview({
    id: newId("rev"),
    mission_id: missionId,
    pack_id: packRow.id,
    reviewer,
    decision,
    note: note.trim() || null,
    decided_at: nowIso(),
  });
  if (decision === "accept") {
    updateMissionStatus(missionId, "accepted");
    grantAcceptedCredit(missionId, packRow.id);
    const nextPublic = markPublicProof(publicProof, {
      accepted: true,
      credit: 25,
    });
    packRow.public_json = JSON.stringify(nextPublic);
    getDb()
      .prepare("UPDATE proof_packs SET public_json = ? WHERE id = ?")
      .run(packRow.public_json, packRow.id);
    appendEvent("review.accepted", missionId, {
      reviewer,
      packId: packRow.id,
      digest: pack.digest,
      note: note.trim() || null,
    });
  } else {
    updateMissionStatus(missionId, "rejected");
    recordRejection();
    appendEvent("review.rejected", missionId, {
      reviewer,
      packId: packRow.id,
      note: note.trim() || null,
    });
  }
  return assembleMission(missionId);
}

export async function settleMission(missionId: string) {
  const mission = requireMission(missionId);
  if (mission.status !== "accepted") {
    throw new Error("Settle only runs after Avery accepts the Proof Pack.");
  }
  const existing = latestSettlement(missionId);
  if (existing?.status === "confirmed") {
    throw new Error("This mission is already settled.");
  }
  const packRow = latestPack(missionId);
  if (!packRow) throw new Error("No Proof Pack to settle.");
  const memo = `northbridge:${packRow.digest}`;
  const settlementId = newId("stl");
  insertSettlement({
    id: settlementId,
    mission_id: missionId,
    pack_id: packRow.id,
    cluster: "pending",
    rpc_url: "",
    payer_pubkey: "",
    payee_pubkey: "",
    lamports: 0,
    memo,
    signature: null,
    slot: null,
    status: "pending",
    tx_json: null,
    error: null,
    created_at: nowIso(),
    confirmed_at: null,
  });
  appendEvent("settle.submitted", missionId, { settlementId, memo });

  try {
    const result = await sendProofSettlement(memo);
    updateSettlement(settlementId, {
      signature: result.signature,
      slot: result.slot,
      status: "confirmed",
      tx_json: JSON.stringify({
        payer: result.payer,
        payee: result.payee,
        lamports: result.lamports,
        serializedTx: result.serializedTx,
        explorer: explorerTxUrl(result.cluster, result.signature),
      }),
      confirmed_at: nowIso(),
    });
    getDb()
      .prepare(
        "UPDATE settlements SET cluster = ?, rpc_url = ?, payer_pubkey = ?, payee_pubkey = ?, lamports = ? WHERE id = ?"
      )
      .run(
        result.cluster,
        result.rpcUrl,
        result.payer,
        result.payee,
        result.lamports,
        settlementId
      );
    const { publicProof } = parsePack(packRow);
    const nextPublic = markPublicProof(publicProof, {
      settled: true,
      settlementSignature: result.signature,
      cluster: result.cluster,
    });
    getDb()
      .prepare("UPDATE proof_packs SET public_json = ? WHERE id = ?")
      .run(JSON.stringify(nextPublic), packRow.id);
    updateMissionStatus(missionId, "settled");
    recordSettlement();
    appendEvent("settle.confirmed", missionId, {
      settlementId,
      signature: result.signature,
      cluster: result.cluster,
      lamports: result.lamports,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateSettlement(settlementId, { status: "failed", error: message });
    appendEvent("settle.failed", missionId, { settlementId, error: message });
    throw error;
  }

  return assembleMission(missionId);
}

function plain<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function assembleMission(id: string) {
  const row = getMission(id);
  if (!row) throw new Error("Mission not found.");
  const mission = parseMission(row);
  const run = latestRun(id) ?? null;
  const packRow = latestPack(id) ?? null;
  const pack = packRow ? parsePack(packRow) : null;
  if (pack && packRow) {
    pack.pack.packId = packRow.id;
    pack.publicProof.packId = packRow.id;
  }
  const review = latestReview(id) ?? null;
  const settlement = latestSettlement(id);
  return plain({
    mission,
    run,
    pack: pack?.pack ?? null,
    publicProof: pack?.publicProof ?? null,
    review,
    settlement: settlement ? toSettlementRecord(settlement) : null,
    events: listEvents(id),
  });
}

export function listMissionSummaries() {
  return listMissions().map((row: MissionRow) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    sourceUrl: row.source_url,
    rewardLabel: row.reward_label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export function ledgerSnapshot() {
  return {
    reputation: listReputation(),
    credits: listCredits(),
    settlements: listSettlements().map(toSettlementRecord),
    events: listEvents(),
  };
}

export function publicPack(packId: string) {
  const row = getPack(packId);
  if (!row) return null;
  const parsed = parsePack(row);
  parsed.publicProof.packId = row.id;
  return parsed.publicProof;
}

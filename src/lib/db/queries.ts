import { getStore, touchStore } from "@/lib/store";
import { nowIso } from "@/lib/ids";
import type {
  EventKind,
  GithubSource,
  MissionBounds,
  MissionStatus,
  PolicyReport,
  ProofPack,
  PublicProof,
  SettlementRecord,
} from "@/lib/types";
import type {
  CreditRow,
  EventRow,
  MissionRow,
  ProofPackRow,
  ProofRunRow,
  ReputationRow,
  ReviewRow,
  SettlementRow,
} from "@/lib/store/types";

export type {
  CreditRow,
  EventRow,
  MissionRow,
  ProofPackRow,
  ProofRunRow,
  ReputationRow,
  ReviewRow,
  SettlementRow,
};

const byDesc = <T,>(key: keyof T) => (a: T, b: T) =>
  String(b[key]).localeCompare(String(a[key]));

function latestBy<T>(rows: T[], key: keyof T): T | undefined {
  return [...rows].sort(byDesc<T>(key))[0];
}

export function insertMission(input: {
  id: string;
  source: GithubSource;
  title: string;
  objective: string;
  bounds: MissionBounds;
  acceptance: string[];
  rewardLabel: string;
  status: MissionStatus;
  policy: PolicyReport;
}): MissionRow {
  const created = nowIso();
  const row: MissionRow = {
    id: input.id,
    source_kind: input.source.kind,
    source_url: input.source.url,
    source_owner: input.source.owner,
    source_repo: input.source.repo,
    source_number: input.source.number,
    source_title: input.source.title,
    source_body: input.source.body,
    source_json: JSON.stringify(input.source),
    title: input.title,
    objective: input.objective,
    bounds_json: JSON.stringify(input.bounds),
    acceptance_json: JSON.stringify(input.acceptance),
    reward_label: input.rewardLabel,
    status: input.status,
    policy_json: JSON.stringify(input.policy),
    created_at: created,
    updated_at: created,
  };
  getStore().missions.push(row);
  touchStore();
  return row;
}

export function listMissions(): MissionRow[] {
  return [...getStore().missions].sort(byDesc<MissionRow>("created_at"));
}

export function getMission(id: string): MissionRow | undefined {
  return getStore().missions.find((row) => row.id === id);
}

export function updateMissionStatus(id: string, status: MissionStatus): void {
  const row = getMission(id);
  if (!row) return;
  row.status = status;
  row.updated_at = nowIso();
  touchStore();
}

export function insertProofRun(row: ProofRunRow): void {
  getStore().proofRuns.push(row);
  touchStore();
}

export function latestRun(missionId: string): ProofRunRow | undefined {
  return latestBy(
    getStore().proofRuns.filter((row) => row.mission_id === missionId),
    "started_at"
  );
}

export function insertProofPack(row: ProofPackRow): void {
  getStore().proofPacks.push(row);
  touchStore();
}

export function latestPack(missionId: string): ProofPackRow | undefined {
  return latestBy(
    getStore().proofPacks.filter((row) => row.mission_id === missionId),
    "created_at"
  );
}

export function getPack(id: string): ProofPackRow | undefined {
  return getStore().proofPacks.find((row) => row.id === id);
}

export function updatePackPublicJson(id: string, publicJson: string): void {
  const row = getPack(id);
  if (!row) return;
  row.public_json = publicJson;
  touchStore();
}

export function insertReview(row: ReviewRow): void {
  getStore().reviews.push(row);
  touchStore();
}

export function latestReview(missionId: string): ReviewRow | undefined {
  return latestBy(
    getStore().reviews.filter((row) => row.mission_id === missionId),
    "decided_at"
  );
}

export function insertCredit(row: CreditRow): void {
  getStore().credits.push(row);
  touchStore();
}

export function listCredits(): CreditRow[] {
  return [...getStore().credits].sort(byDesc<CreditRow>("created_at"));
}

export function upsertReputation(
  actor: string,
  patch: Partial<Pick<ReputationRow, "score" | "accepted_count" | "rejected_count" | "settled_count">>
): ReputationRow {
  const store = getStore();
  const existing = store.reputation.find((row) => row.actor === actor);
  const next: ReputationRow = {
    actor,
    score: (existing?.score ?? 0) + (patch.score ?? 0),
    accepted_count: (existing?.accepted_count ?? 0) + (patch.accepted_count ?? 0),
    rejected_count: (existing?.rejected_count ?? 0) + (patch.rejected_count ?? 0),
    settled_count: (existing?.settled_count ?? 0) + (patch.settled_count ?? 0),
    updated_at: nowIso(),
  };
  if (existing) Object.assign(existing, next);
  else store.reputation.push(next);
  touchStore();
  return next;
}

export function listReputation(): ReputationRow[] {
  return [...getStore().reputation].sort(
    (a, b) => b.score - a.score || a.actor.localeCompare(b.actor)
  );
}

export function latestEvent(): EventRow | undefined {
  const events = getStore().events;
  return events[events.length - 1];
}

export function insertEvent(row: {
  seq: number;
  kind: EventKind;
  missionId: string | null;
  payloadJson: string;
  prevHash: string;
  hash: string;
}): EventRow {
  const event: EventRow = {
    id: row.seq,
    seq: row.seq,
    kind: row.kind,
    mission_id: row.missionId,
    payload_json: row.payloadJson,
    prev_hash: row.prevHash,
    hash: row.hash,
    created_at: nowIso(),
  };
  getStore().events.push(event);
  touchStore();
  return event;
}

export function listEvents(missionId?: string): EventRow[] {
  const events = getStore().events;
  return missionId ? events.filter((event) => event.mission_id === missionId) : [...events];
}

export function insertSettlement(row: SettlementRow): void {
  getStore().settlements.push(row);
  touchStore();
}

export function updateSettlement(
  id: string,
  patch: Partial<
    Pick<
      SettlementRow,
      | "signature"
      | "slot"
      | "status"
      | "tx_json"
      | "error"
      | "confirmed_at"
      | "cluster"
      | "rpc_url"
      | "payer_pubkey"
      | "payee_pubkey"
      | "lamports"
    >
  >
): void {
  const current = getSettlement(id);
  if (!current) return;
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) (current as Record<string, unknown>)[key] = value;
  }
  touchStore();
}

export function getSettlement(id: string): SettlementRow | undefined {
  return getStore().settlements.find((row) => row.id === id);
}

export function latestSettlement(missionId: string): SettlementRow | undefined {
  return latestBy(
    getStore().settlements.filter((row) => row.mission_id === missionId),
    "created_at"
  );
}

export function settlementForPack(packId: string): SettlementRow | undefined {
  return latestBy(
    getStore().settlements.filter((row) => row.pack_id === packId && row.status === "confirmed"),
    "created_at"
  );
}

export function listSettlements(): SettlementRow[] {
  return [...getStore().settlements].sort(byDesc<SettlementRow>("created_at"));
}

export function parseMission(row: MissionRow) {
  return {
    ...row,
    source: JSON.parse(row.source_json) as GithubSource,
    bounds: JSON.parse(row.bounds_json) as MissionBounds,
    acceptance: JSON.parse(row.acceptance_json) as string[],
    policy: JSON.parse(row.policy_json) as PolicyReport,
  };
}

export function parsePack(row: ProofPackRow): {
  pack: ProofPack;
  publicProof: PublicProof;
} {
  return {
    pack: JSON.parse(row.pack_json) as ProofPack,
    publicProof: JSON.parse(row.public_json) as PublicProof,
  };
}

export function toSettlementRecord(row: SettlementRow): SettlementRecord {
  let explorer: string | null = null;
  if (row.tx_json) {
    try {
      explorer = (JSON.parse(row.tx_json) as { explorer?: string | null }).explorer ?? null;
    } catch {
      explorer = null;
    }
  }
  return {
    id: row.id,
    missionId: row.mission_id,
    packId: row.pack_id,
    cluster: row.cluster,
    rpcUrl: row.rpc_url,
    payerPubkey: row.payer_pubkey,
    payeePubkey: row.payee_pubkey,
    lamports: row.lamports,
    memo: row.memo,
    signature: row.signature,
    slot: row.slot,
    status: row.status as SettlementRecord["status"],
    error: row.error,
    explorer,
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
  };
}

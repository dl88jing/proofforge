import { getDb, initDb, reloadDb } from "@/lib/db/client";
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

initDb();

export type MissionRow = {
  id: string;
  source_kind: string;
  source_url: string;
  source_owner: string | null;
  source_repo: string | null;
  source_number: number | null;
  source_title: string | null;
  source_body: string | null;
  source_json: string;
  title: string;
  objective: string;
  bounds_json: string;
  acceptance_json: string;
  reward_label: string | null;
  status: MissionStatus;
  policy_json: string;
  created_at: string;
  updated_at: string;
};

export type ProofRunRow = {
  id: string;
  mission_id: string;
  node_id: string;
  operator: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  commands_json: string;
  logs: string;
  artifacts_json: string;
  env_json: string;
};

export type ProofPackRow = {
  id: string;
  mission_id: string;
  run_id: string;
  schema_version: string;
  digest: string;
  pack_json: string;
  public_json: string;
  created_at: string;
};

export type ReviewRow = {
  id: string;
  mission_id: string;
  pack_id: string;
  reviewer: string;
  decision: string;
  note: string | null;
  decided_at: string;
};

export type CreditRow = {
  id: string;
  mission_id: string;
  pack_id: string;
  contributor: string;
  amount: number;
  kind: string;
  created_at: string;
};

export type ReputationRow = {
  actor: string;
  score: number;
  accepted_count: number;
  rejected_count: number;
  settled_count: number;
  updated_at: string;
};

export type EventRow = {
  id: number;
  seq: number;
  kind: string;
  mission_id: string | null;
  payload_json: string;
  prev_hash: string;
  hash: string;
  created_at: string;
};

export type SettlementRow = {
  id: string;
  mission_id: string;
  pack_id: string;
  cluster: string;
  rpc_url: string;
  payer_pubkey: string;
  payee_pubkey: string;
  lamports: number;
  memo: string;
  signature: string | null;
  slot: number | null;
  status: string;
  tx_json: string | null;
  error: string | null;
  created_at: string;
  confirmed_at: string | null;
};

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
  const db = getDb();
  const created = nowIso();
  db.prepare(
    `INSERT INTO missions (
      id, source_kind, source_url, source_owner, source_repo, source_number,
      source_title, source_body, source_json, title, objective, bounds_json,
      acceptance_json, reward_label, status, policy_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    input.id,
    input.source.kind,
    input.source.url,
    input.source.owner,
    input.source.repo,
    input.source.number,
    input.source.title,
    input.source.body,
    JSON.stringify(input.source),
    input.title,
    input.objective,
    JSON.stringify(input.bounds),
    JSON.stringify(input.acceptance),
    input.rewardLabel,
    input.status,
    JSON.stringify(input.policy),
    created,
    created
  );
  return getMission(input.id)!;
}

export function listMissions(): MissionRow[] {
  return getDb()
    .prepare("SELECT * FROM missions ORDER BY created_at DESC")
    .all() as MissionRow[];
}

export function getMission(id: string): MissionRow | undefined {
  const read = () =>
    getDb().prepare("SELECT * FROM missions WHERE id = ?").get(id) as MissionRow | undefined;
  return read() ?? (reloadDb(), read());
}

export function updateMissionStatus(id: string, status: MissionStatus): void {
  getDb()
    .prepare("UPDATE missions SET status = ?, updated_at = ? WHERE id = ?")
    .run(status, nowIso(), id);
}

export function insertProofRun(row: ProofRunRow): void {
  getDb()
    .prepare(
      `INSERT INTO proof_runs (
        id, mission_id, node_id, operator, started_at, finished_at, status,
        commands_json, logs, artifacts_json, env_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.mission_id,
      row.node_id,
      row.operator,
      row.started_at,
      row.finished_at,
      row.status,
      row.commands_json,
      row.logs,
      row.artifacts_json,
      row.env_json
    );
}

export function latestRun(missionId: string): ProofRunRow | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM proof_runs WHERE mission_id = ? ORDER BY started_at DESC LIMIT 1"
    )
    .get(missionId) as ProofRunRow | undefined;
}

export function insertProofPack(row: ProofPackRow): void {
  getDb()
    .prepare(
      `INSERT INTO proof_packs (
        id, mission_id, run_id, schema_version, digest, pack_json, public_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.mission_id,
      row.run_id,
      row.schema_version,
      row.digest,
      row.pack_json,
      row.public_json,
      row.created_at
    );
}

export function latestPack(missionId: string): ProofPackRow | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM proof_packs WHERE mission_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(missionId) as ProofPackRow | undefined;
}

export function getPack(id: string): ProofPackRow | undefined {
  const read = () =>
    getDb().prepare("SELECT * FROM proof_packs WHERE id = ?").get(id) as ProofPackRow | undefined;
  return read() ?? (reloadDb(), read());
}

export function insertReview(row: ReviewRow): void {
  getDb()
    .prepare(
      `INSERT INTO reviews (id, mission_id, pack_id, reviewer, decision, note, decided_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.mission_id,
      row.pack_id,
      row.reviewer,
      row.decision,
      row.note,
      row.decided_at
    );
}

export function latestReview(missionId: string): ReviewRow | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM reviews WHERE mission_id = ? ORDER BY decided_at DESC LIMIT 1"
    )
    .get(missionId) as ReviewRow | undefined;
}

export function insertCredit(row: CreditRow): void {
  getDb()
    .prepare(
      `INSERT INTO credits (id, mission_id, pack_id, contributor, amount, kind, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.mission_id,
      row.pack_id,
      row.contributor,
      row.amount,
      row.kind,
      row.created_at
    );
}

export function listCredits(): CreditRow[] {
  return getDb()
    .prepare("SELECT * FROM credits ORDER BY created_at DESC")
    .all() as CreditRow[];
}

export function upsertReputation(
  actor: string,
  patch: Partial<Pick<ReputationRow, "score" | "accepted_count" | "rejected_count" | "settled_count">>
): ReputationRow {
  const db = getDb();
  const existing = db.prepare("SELECT * FROM reputation WHERE actor = ?").get(actor) as
    | ReputationRow
    | undefined;
  const next: ReputationRow = {
    actor,
    score: (existing?.score ?? 0) + (patch.score ?? 0),
    accepted_count: (existing?.accepted_count ?? 0) + (patch.accepted_count ?? 0),
    rejected_count: (existing?.rejected_count ?? 0) + (patch.rejected_count ?? 0),
    settled_count: (existing?.settled_count ?? 0) + (patch.settled_count ?? 0),
    updated_at: nowIso(),
  };
  db.prepare(
    `INSERT INTO reputation (actor, score, accepted_count, rejected_count, settled_count, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(actor) DO UPDATE SET
       score = excluded.score,
       accepted_count = excluded.accepted_count,
       rejected_count = excluded.rejected_count,
       settled_count = excluded.settled_count,
       updated_at = excluded.updated_at`
  ).run(
    next.actor,
    next.score,
    next.accepted_count,
    next.rejected_count,
    next.settled_count,
    next.updated_at
  );
  return next;
}

export function listReputation(): ReputationRow[] {
  return getDb()
    .prepare("SELECT * FROM reputation ORDER BY score DESC, actor ASC")
    .all() as ReputationRow[];
}

export function latestEvent(): EventRow | undefined {
  return getDb()
    .prepare("SELECT * FROM events ORDER BY seq DESC LIMIT 1")
    .get() as EventRow | undefined;
}

export function insertEvent(row: {
  seq: number;
  kind: EventKind;
  missionId: string | null;
  payloadJson: string;
  prevHash: string;
  hash: string;
}): EventRow {
  const created = nowIso();
  getDb()
    .prepare(
      `INSERT INTO events (seq, kind, mission_id, payload_json, prev_hash, hash, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(row.seq, row.kind, row.missionId, row.payloadJson, row.prevHash, row.hash, created);
  return getDb()
    .prepare("SELECT * FROM events WHERE seq = ?")
    .get(row.seq) as EventRow;
}

export function listEvents(missionId?: string): EventRow[] {
  const db = getDb();
  if (missionId) {
    return db
      .prepare("SELECT * FROM events WHERE mission_id = ? ORDER BY seq ASC")
      .all(missionId) as EventRow[];
  }
  return db.prepare("SELECT * FROM events ORDER BY seq ASC").all() as EventRow[];
}

export function insertSettlement(row: SettlementRow): void {
  getDb()
    .prepare(
      `INSERT INTO settlements (
        id, mission_id, pack_id, cluster, rpc_url, payer_pubkey, payee_pubkey,
        lamports, memo, signature, slot, status, tx_json, error, created_at, confirmed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      row.id,
      row.mission_id,
      row.pack_id,
      row.cluster,
      row.rpc_url,
      row.payer_pubkey,
      row.payee_pubkey,
      row.lamports,
      row.memo,
      row.signature,
      row.slot,
      row.status,
      row.tx_json,
      row.error,
      row.created_at,
      row.confirmed_at
    );
}

export function updateSettlement(
  id: string,
  patch: Partial<
    Pick<SettlementRow, "signature" | "slot" | "status" | "tx_json" | "error" | "confirmed_at">
  >
): void {
  const current = getSettlement(id);
  if (!current) return;
  getDb()
    .prepare(
      `UPDATE settlements SET signature = ?, slot = ?, status = ?, tx_json = ?, error = ?, confirmed_at = ?
       WHERE id = ?`
    )
    .run(
      patch.signature ?? current.signature,
      patch.slot ?? current.slot,
      patch.status ?? current.status,
      patch.tx_json ?? current.tx_json,
      patch.error ?? current.error,
      patch.confirmed_at ?? current.confirmed_at,
      id
    );
}

export function getSettlement(id: string): SettlementRow | undefined {
  return getDb().prepare("SELECT * FROM settlements WHERE id = ?").get(id) as
    | SettlementRow
    | undefined;
}

export function latestSettlement(missionId: string): SettlementRow | undefined {
  return getDb()
    .prepare(
      "SELECT * FROM settlements WHERE mission_id = ? ORDER BY created_at DESC LIMIT 1"
    )
    .get(missionId) as SettlementRow | undefined;
}

export function listSettlements(): SettlementRow[] {
  return getDb()
    .prepare("SELECT * FROM settlements ORDER BY created_at DESC")
    .all() as SettlementRow[];
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
    createdAt: row.created_at,
    confirmedAt: row.confirmed_at,
  };
}

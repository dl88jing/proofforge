import type { MissionStatus } from "@/lib/types";

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

export type MockSigRow = {
  slot: number;
  status: string;
  err: string | null;
  raw_tx: string | null;
  created_at: string;
};

/** Whole ProofForge household state. Small, JSON-serializable, serverless-friendly. */
export type StoreData = {
  schema: "northbridge.store.v2";
  revision: number;
  missions: MissionRow[];
  proofRuns: ProofRunRow[];
  proofPacks: ProofPackRow[];
  reviews: ReviewRow[];
  credits: CreditRow[];
  reputation: ReputationRow[];
  settlements: SettlementRow[];
  events: EventRow[];
  mockAccounts: Record<string, number>;
  mockSigs: Record<string, MockSigRow>;
  mockMeta: Record<string, string>;
};

export function emptyStore(): StoreData {
  return {
    schema: "northbridge.store.v2",
    revision: 0,
    missions: [],
    proofRuns: [],
    proofPacks: [],
    reviews: [],
    credits: [],
    reputation: [],
    settlements: [],
    events: [],
    mockAccounts: {},
    mockSigs: {},
    mockMeta: {},
  };
}

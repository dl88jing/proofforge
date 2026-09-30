-- Northbridge ProofForge schema v1
-- SQLite. Applied by src/lib/db/init.ts and scripts/init-db.ts

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  source_kind TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_owner TEXT,
  source_repo TEXT,
  source_number INTEGER,
  source_title TEXT,
  source_body TEXT,
  source_json TEXT NOT NULL,
  title TEXT NOT NULL,
  objective TEXT NOT NULL,
  bounds_json TEXT NOT NULL,
  acceptance_json TEXT NOT NULL,
  reward_label TEXT,
  status TEXT NOT NULL,
  policy_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS proof_runs (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  operator TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  status TEXT NOT NULL,
  commands_json TEXT NOT NULL,
  logs TEXT NOT NULL,
  artifacts_json TEXT NOT NULL,
  env_json TEXT NOT NULL,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS proof_packs (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  run_id TEXT NOT NULL,
  schema_version TEXT NOT NULL,
  digest TEXT NOT NULL,
  pack_json TEXT NOT NULL,
  public_json TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mission_id) REFERENCES missions(id),
  FOREIGN KEY (run_id) REFERENCES proof_runs(id)
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  reviewer TEXT NOT NULL,
  decision TEXT NOT NULL,
  note TEXT,
  decided_at TEXT NOT NULL,
  FOREIGN KEY (mission_id) REFERENCES missions(id),
  FOREIGN KEY (pack_id) REFERENCES proof_packs(id)
);

CREATE TABLE IF NOT EXISTS credits (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  contributor TEXT NOT NULL,
  amount INTEGER NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (mission_id) REFERENCES missions(id)
);

CREATE TABLE IF NOT EXISTS reputation (
  actor TEXT PRIMARY KEY,
  score INTEGER NOT NULL,
  accepted_count INTEGER NOT NULL,
  rejected_count INTEGER NOT NULL,
  settled_count INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS settlements (
  id TEXT PRIMARY KEY,
  mission_id TEXT NOT NULL,
  pack_id TEXT NOT NULL,
  cluster TEXT NOT NULL,
  rpc_url TEXT NOT NULL,
  payer_pubkey TEXT NOT NULL,
  payee_pubkey TEXT NOT NULL,
  lamports INTEGER NOT NULL,
  memo TEXT NOT NULL,
  signature TEXT,
  slot INTEGER,
  status TEXT NOT NULL,
  tx_json TEXT,
  error TEXT,
  created_at TEXT NOT NULL,
  confirmed_at TEXT,
  FOREIGN KEY (mission_id) REFERENCES missions(id),
  FOREIGN KEY (pack_id) REFERENCES proof_packs(id)
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  seq INTEGER NOT NULL UNIQUE,
  kind TEXT NOT NULL,
  mission_id TEXT,
  payload_json TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS solana_mock_accounts (
  pubkey TEXT PRIMARY KEY,
  lamports INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS solana_mock_sigs (
  signature TEXT PRIMARY KEY,
  slot INTEGER NOT NULL,
  status TEXT NOT NULL,
  err TEXT,
  raw_tx TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS solana_mock_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_missions_status ON missions(status);
CREATE INDEX IF NOT EXISTS idx_proof_runs_mission ON proof_runs(mission_id);
CREATE INDEX IF NOT EXISTS idx_proof_packs_mission ON proof_packs(mission_id);
CREATE INDEX IF NOT EXISTS idx_events_mission ON events(mission_id);
CREATE INDEX IF NOT EXISTS idx_settlements_mission ON settlements(mission_id);

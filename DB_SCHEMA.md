# Northbridge ProofForge database

SQLite file: `data/proofforge.db` (gitignored). Created on first run by `src/lib/db/init` via `src/lib/db/client.ts` loading `src/lib/db/schema.sql`.

Fresh installs: `npm run db:init` (or just start the app / `npm run demo`).

Schema changes: update `src/lib/db/schema.sql` **and** add a version in `scripts/migrate.ts`, then run `npm run db:migrate`.

Current version: **1**.

## tables

### schema_migrations
| column | type | notes |
| --- | --- | --- |
| version | INTEGER PK | applied migration |
| applied_at | TEXT | ISO timestamp |

### missions
Bounded source-backed work.

| column | type | notes |
| --- | --- | --- |
| id | TEXT PK | `msn_…` |
| source_kind | TEXT | `github_issue` \| `bounty_url` |
| source_url | TEXT | canonical URL |
| source_owner | TEXT | GitHub owner |
| source_repo | TEXT | GitHub repo |
| source_number | INTEGER | issue number |
| source_title | TEXT | raw title |
| source_body | TEXT | raw body |
| source_json | TEXT | `GithubSource` JSON |
| title | TEXT | bounded title |
| objective | TEXT | first-paragraph or derived |
| bounds_json | TEXT | `MissionBounds` |
| acceptance_json | TEXT | string[] |
| reward_label | TEXT | parsed bounty / household credit |
| status | TEXT | bounded → running → packed → submitted → accepted → settled |
| policy_json | TEXT | `PolicyReport` |
| created_at | TEXT | ISO |
| updated_at | TEXT | ISO |

### proof_runs
Local proof node executions.

| column | type | notes |
| --- | --- | --- |
| id | TEXT PK | `run_…` |
| mission_id | TEXT FK | missions.id |
| node_id | TEXT | `northbridge-forge-1` |
| operator | TEXT | Morgan |
| started_at | TEXT | |
| finished_at | TEXT | |
| status | TEXT | passed \| failed |
| commands_json | TEXT | command results |
| logs | TEXT | plain log |
| artifacts_json | TEXT | hashed files |
| env_json | TEXT | node/platform |

### proof_packs
Sealed evidence packets.

| column | type | notes |
| --- | --- | --- |
| id | TEXT PK | `pack_…` |
| mission_id | TEXT FK | |
| run_id | TEXT FK | |
| schema_version | TEXT | `northbridge.proofpack.v1` |
| digest | TEXT | canonical SHA-256 |
| pack_json | TEXT | full pack |
| public_json | TEXT | sanitized public proof |
| created_at | TEXT | |

### reviews
Human accept gate.

| column | type | notes |
| --- | --- | --- |
| id | TEXT PK | `rev_…` |
| mission_id | TEXT FK | |
| pack_id | TEXT FK | |
| reviewer | TEXT | Avery |
| decision | TEXT | accept \| reject |
| note | TEXT | |
| decided_at | TEXT | |

### credits
Granted only after accept.

| column | type | notes |
| --- | --- | --- |
| id | TEXT PK | `crd_…` |
| mission_id | TEXT FK | |
| pack_id | TEXT FK | |
| contributor | TEXT | Morgan |
| amount | INTEGER | reputation units |
| kind | TEXT | `accepted_proof` |
| created_at | TEXT | |

### reputation
Rolled-up household scores.

| column | type | notes |
| --- | --- | --- |
| actor | TEXT PK | Avery, Morgan, node id |
| score | INTEGER | |
| accepted_count | INTEGER | |
| rejected_count | INTEGER | |
| settled_count | INTEGER | |
| updated_at | TEXT | |

### settlements
Real Solana transfer+memo (mock or public RPC).

| column | type | notes |
| --- | --- | --- |
| id | TEXT PK | `stl_…` |
| mission_id | TEXT FK | |
| pack_id | TEXT FK | |
| cluster | TEXT | mock \| devnet \| testnet |
| rpc_url | TEXT | |
| payer_pubkey | TEXT | |
| payee_pubkey | TEXT | |
| lamports | INTEGER | |
| memo | TEXT | `northbridge:<digest>` |
| signature | TEXT | base58 |
| slot | INTEGER | |
| status | TEXT | pending \| confirmed \| failed |
| tx_json | TEXT | serialized tx metadata |
| error | TEXT | |
| created_at | TEXT | |
| confirmed_at | TEXT | |

### events
Hash-linked household log (`hash = sha256(canonical(seq, kind, payload, prevHash))`).

| column | type | notes |
| --- | --- | --- |
| id | INTEGER PK | auto |
| seq | INTEGER UNIQUE | monotonic |
| kind | TEXT | event kind |
| mission_id | TEXT | |
| payload_json | TEXT | |
| prev_hash | TEXT | |
| hash | TEXT | |
| created_at | TEXT | |

### solana_mock_accounts / solana_mock_sigs / solana_mock_meta
In-process mock validator state used when `SOLANA_CLUSTER=mock`.

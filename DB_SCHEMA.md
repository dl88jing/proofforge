# Northbridge ProofForge state store

ProofForge keeps all household state in **one JSON document** (`northbridge.store.v2`, `src/lib/store/types.ts`). There is no native database dependency, so the same build runs locally, in the CLI, and on serverless.

| Backend | When | Where |
| --- | --- | --- |
| `file` | default locally | `data/proofforge.json` (override `PROOFFORGE_STORE_PATH`) — atomic write-through |
| `memory` | default on Vercel without Redis | process memory (per-instance, demo only) |
| `redis` | auto when `UPSTASH_REDIS_REST_URL`/`TOKEN` (or `KV_REST_API_*`) are set | key `northbridge:proofforge:store` (override `PROOFFORGE_STORE_KEY`) |

Force one with `PROOFFORGE_STORE=file|memory|redis`. Request handlers call `hydrateStore()` before reading and `flushStore()` after writing (`withStore()`); every mutation bumps `revision`, and a newer remote revision always wins. `npm run db:init` / `npm run demo:reset` wipe state.

## Collections

| Key | Row type | Notes |
| --- | --- | --- |
| `missions` | `MissionRow` | `msn_…`, source snapshot JSON, bounds, acceptance, policy, `status` (`bounded → running → packed → submitted → accepted/rejected → settled`, or `failed`) |
| `proofRuns` | `ProofRunRow` | `run_…`, operator Morgan, commands, logs, artifact hashes, env |
| `proofPacks` | `ProofPackRow` | `pack_…`, `digest` = `sha256:` of canonical pack JSON, full `pack_json` + sanitized `public_json` |
| `reviews` | `ReviewRow` | Avery's accept / reject + note |
| `credits` | `CreditRow` | +25 accepted-proof credit to Morgan, only on accept |
| `reputation` | `ReputationRow` | Morgan, Avery, proof node: score, accepted / rejected / settled counts |
| `settlements` | `SettlementRow` | cluster (`mock`/`devnet`/…), RPC URL, payer, payee, lamports, memo, signature, slot, status, tx JSON (explorer link, serialized tx) |
| `events` | `EventRow` | hash-linked chain: `hash = sha256(canonical{seq, kind, missionId, payload, prevHash})`, genesis `sha256:northbridge-proof-genesis` |
| `mockAccounts` | `pubkey → lamports` | mock cluster balances |
| `mockSigs` | `signature → {slot, status, raw_tx}` | mock cluster ledger; raw tx is what on-chain verification decodes |
| `mockMeta` | `k → v` | mock slot, blockhash, lastValidBlockHeight |

Event kinds: `source.imported`, `mission.bounded`, `proof.ran`, `proof.verified`, `pack.created`, `pack.submitted`, `review.accepted`, `review.rejected`, `credit.granted`, `settle.submitted`, `settle.confirmed`, `settle.failed`.

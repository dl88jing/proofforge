# Northbridge ProofForge

**Proof before payout** for agent-spend and bounty work.

Operated by **Avery** (maintainer) and **Morgan** (runner) of the Northbridge household.

ProofForge takes a public GitHub issue or bounty URL, bounds a local mission, runs a constrained proof node, independently verifies artifacts, seals a Proof Pack, waits for a human accept gate, then settles on Solana. Testnet and an in-process mock RPC are both real transaction paths — the mock still builds, signs, and confirms a System Program transfer plus Memo instruction.

Built for [Colosseum Crypto World's Fair](https://www.colosseum.com/hackathon). Submission deadline: **12 October 2026, 11:59pm PT**.

> No proof, no credit. Builders do not grade their own work. Human judgment guards settle.

Licensed MIT. Original implementation. Architecture is informed by public proof-of-work / open-agent patterns (including the ETHGlobal ProofForge writeup) and rewritten cleanly here — this is not a copy of proprietary Instinct code.

## Loop

```text
GitHub issue / bounty URL
  → bounded mission (policy + acceptance)
  → Morgan runs proof node (local evidence only)
  → independent verifier
  → Proof Pack (northbridge.proofpack.v1)
  → Avery accept / reject gate
  → credit + reputation
  → Solana settle (transfer + memo of the pack digest)
```

The product does **not** custody user funds, post to GitHub, or skip the accept gate. Settle is an explicit household action after accept.

## Architecture

| Layer | What it does |
| --- | --- |
| Intake | `src/lib/github/import.ts` fetches public GitHub issues. Non-GitHub https URLs bound as bounty sources. Offline fallback: `fixtures/github-issue.json`. |
| Policy | `src/lib/mission/policy.ts` blocks private-key / mainnet-fund asks. Warns on auto-PR language. |
| Bound | `src/lib/mission/bound.ts` derives objective, acceptance, reward label, 30-minute local-only bounds. |
| Proof node | `src/lib/proof/runner.ts` inspects, hashes, writes artifacts under `data/artifacts/`. No GitHub writes. |
| Verifier | `src/lib/proof/verifier.ts` re-hashes files, forbids self-grading, checks policy and required artifacts. |
| Pack | `src/lib/proof/pack.ts` seals `northbridge.proofpack.v1` with a canonical SHA-256 digest. |
| Accept | Avery-only review. Credit hits the SQLite ledger only on accept. |
| Settle | `src/lib/solana/settle.ts` using `@solana/web3.js`: `SystemProgram.transfer` + Memo program `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`. |
| Mock RPC | `src/lib/solana/mock-rpc.ts` implements `getLatestBlockhash`, `sendTransaction`, `getSignatureStatuses`, balances. Also exposed at `POST /api/solana-rpc`. |
| Ledger | Hash-linked `events` table plus `credits`, `reputation`, `settlements`. Schema: [DB_SCHEMA.md](DB_SCHEMA.md). |

Stack: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + SQLite (`node:sqlite`) + `@solana/web3.js`.

## Run locally

Requires Node 22+.

```bash
npm install
cp .env.example .env.local
npm run db:init
npm run demo
npm run dev
```

App: [http://127.0.0.1:43173](http://127.0.0.1:43173)

Step-by-step Avery/Morgan settle loop: [DEPLOY.md](DEPLOY.md). `npm run demo` exercises the same pipeline as the UI against the mock Solana RPC and prints the transfer signature.

### Web demo

1. Open the app. The missions table starts empty — nothing is seeded.
2. **Intake**: paste a public GitHub issue (default is `https://github.com/solana-foundation/solana-web3.js/issues/1`) and bound the mission.
3. Switch operator to **Morgan · runner** and **Run proof node**.
4. **Submit pack to Avery**.
5. Switch to **Avery · maintainer**, accept with a note. Credit appears on **Ledger**.
6. **Settle on Solana**. Mock cluster confirms immediately. Signature, payer, payee, and memo (`northbridge:<digest>`) are stored on the mission and ledger.

Public proof URL: `/proof/<packId>` (no raw logs).

### Real Solana devnet

```bash
# .env.local
SOLANA_CLUSTER=devnet
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_PAYER_SECRET=[/* 64-byte JSON secret key with devnet SOL */]
SOLANA_PAYEE_PUBKEY=/* recipient */
SETTLE_LAMPORTS=1000
```

Fund the payer on [devnet faucet](https://faucet.solana.com), then run `npm run demo` or settle from the UI. Explorer links use `https://explorer.solana.com/tx/<sig>?cluster=devnet`.

Do not commit `.env.local` or `data/keys/*.json`.

## Demo script (3 minutes)

See [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for the spoken walkthrough.

Clock-time version:

1. `npm run demo` — show CLI signature and “The work holds.”
2. `npm run dev` — intake the same issue in the UI (or a live bounty URL).
3. Morgan run → pack → Avery accept → settle.
4. Ledger: reputation, credit, settlement, hash-linked events.
5. Open public proof page. State the rule: **no accept, no settle**.

## Configuration

See `.env.example`. Defaults are mock cluster, 1000 lamports, no GitHub token.

Optional `GITHUB_TOKEN` raises API rate limits. Without it, public issues still import until GitHub throttles; then intake uses the recorded fixture.

## What this is not

- Not a marketplace, escrow, or token issuer.
- Not automatic GitHub PR spam.
- Not mainnet custody.
- Not a copy of proprietary agent runtimes.

## License

MIT © Northbridge household

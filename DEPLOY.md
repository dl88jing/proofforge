# Deploying Northbridge ProofForge

ProofForge has **no native dependencies and no required database**. It runs anywhere Next.js 16 runs on Node 20+.

## 1. Local (mock cluster, zero config)

```bash
git clone https://github.com/dl88jing/proofforge.git
cd proofforge
npm install
npm run demo      # CLI loop: intake → proof → pack → accept → settle → verify
npm run dev       # http://127.0.0.1:43173
```

State lives in `data/proofforge.json` (gitignored). `npm run demo:reset` wipes it.

UI loop: **Intake** → mission page → act as **Morgan**: *Run proof node* → *Submit pack to Avery* → switch to **Avery**: *Avery accepts* → pick settle target → *Settle* → **Public proof**. Or press **Autopilot: play the loop**.

## 2. Live Solana devnet (local)

```bash
npm run devnet:setup   # creates data/keys/payer.json (gitignored), tries a 1 SOL airdrop
```

If the public faucet is rate-limited (common), fund the printed **payer** address at <https://faucet.solana.com> (devnet), re-run `npm run devnet:setup` to confirm the balance, then:

```bash
npm run demo:live      # prints the devnet signature + Explorer link + on-chain verification
npm run dev            # the "Solana devnet" settle target is now enabled
```

The first payout to a brand-new payee is automatically raised to the rent-exempt floor (~0.00089 SOL); later payouts use `SETTLE_LAMPORTS`.

## 3. Vercel

### 3a. CLI (exact steps)

```bash
npm i -g vercel            # or: npx vercel
vercel login
cd proofforge
vercel link                # create/link project "proofforge" (framework: Next.js, defaults OK)
vercel deploy --prod       # prints https://proofforge-<hash>.vercel.app
```

No environment variables are required for the mock-cluster demo.

### 3b. Dashboard

1. <https://vercel.com/new> → Import `dl88jing/proofforge`.
2. Framework preset **Next.js**, root `/`, build `next build`, output default. Deploy.

### 3c. Recommended env vars (Project → Settings → Environment Variables)

| Variable | Why |
| --- | --- |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | **Durable shared state.** Without them the store is per-instance memory: fine for a single judge session, but a cold start or a second instance shows an empty Missions list. Add via Vercel → Storage → Marketplace → **Upstash Redis** (free tier); the `KV_REST_API_URL` / `KV_REST_API_TOKEN` names are also detected. |
| `SOLANA_PAYER_SECRET` | Enables the **live devnet** settle target. Paste the JSON array from `data/keys/payer.json` (devnet-only key, funded). |
| `SOLANA_CLUSTER=devnet` | Optional: make live devnet the default settle target. |
| `GITHUB_TOKEN` | Optional: avoids GitHub API rate limits on intake (read-only, no scopes needed). |
| `PROOFFORGE_ALLOW_RESET=0` | Optional: hide the public reset endpoint after recording. |

Redeploy after changing env vars (`vercel deploy --prod`).

### 3d. Smoke test the deployment

```bash
URL=https://<your-deployment>.vercel.app
curl -s $URL/api/health          # store.backend should be "redis" if Upstash is attached; settle.liveReady true if payer set
```

Then open `$URL`, bound the default issue, press **Autopilot**, and open the public proof page. Paste `$URL` into README.md (Live demo row) and the Colosseum "Links" field.

## Serverless notes

- Proof artifacts and packs are written under the OS temp dir on Vercel (`/tmp/proofforge`). Run + verify happen in one request, and the sealed pack JSON is persisted in the store, so `/tmp` loss is harmless.
- Mock-cluster keys are derived from public seeds, so every instance agrees on the treasury/payee addresses without key files. They never hold real value.
- Live confirmation polls `getSignatureStatuses` over HTTP (no websockets); the settle route allows up to 60 s.
- Never commit `.env.local` or `data/keys/*.json`. Never use a mainnet key.

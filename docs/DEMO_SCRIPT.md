# Northbridge ProofForge — demo script

Audience: Colosseum Crypto World's Fair judges. Target: ~3 minutes. Operators on screen: **Avery** and **Morgan**. Never use personal names.

## Setup (before recording)

```bash
npm install
cp .env.example .env.local
npm run db:init
npm run demo
npm run dev
```

Browser: `http://127.0.0.1:43173`

## Spoken beats

1. **Problem.** Agent-spend and bounty payouts still skip review. Useful work is scattered across GitHub issues. Maintainers get noise. Contributors do not get a proof that can settle.
2. **Product.** Northbridge ProofForge: intake → bounded mission → proof node → verifier → Proof Pack → Avery’s accept gate → Solana settle.
3. **CLI proof.** Show `npm run demo` output: pack digest, 1000 lamports, base58 signature, memo `northbridge:sha256:…`. “The work holds.”
4. **Intake.** Paste a public GitHub issue. Policy is local and evidence-only. No GitHub write.
5. **Morgan.** Run the proof node. Show commands, hashes, verifier checks. Submit the pack.
6. **Avery.** Switch operator. Accept. Credit hits the ledger. Morgan cannot accept her own run.
7. **Settle.** Avery settles. Mock RPC (or funded devnet) confirms a real `@solana/web3.js` transfer + Memo instruction. Show signature on the mission and Ledger.
8. **Close.** Public proof page. Rule on screen: proof before payout.

## If GitHub is rate-limited

Intake still completes from `fixtures/github-issue.json`. Say it is a recorded public snapshot, not fake ledger rows.

## If using devnet on camera

Have `SOLANA_CLUSTER=devnet` and a funded payer ready. Open the explorer link after settle.

# Northbridge ProofForge — demo script

Audience: Colosseum Crypto World's Fair judges. Target: ~3 minutes. Operators on screen: **Avery** and **Morgan** of the Northbridge household. Never use personal names.

## Setup (before recording)

```bash
npm install
npm run demo:reset
npm run demo          # warm-up; shows the CLI receipt
npm run dev           # http://127.0.0.1:43173
```

Optional live beat: `npm run devnet:setup` with a funded devnet payer, so the **Solana devnet** settle target is enabled.

## Spoken beats

1. **Problem (15 s).** Agents are starting to spend — bounties, credits, payouts. Today the chain records *who got paid*, never *for what* or *who checked*.
2. **Product (15 s).** Northbridge ProofForge: proof before payout. Intake → bounded mission → Morgan's proof node → independent verifier → Proof Pack → Avery's accept gate → Solana settle.
3. **Intake (15 s).** Paste a public GitHub issue. Policy is local and evidence-only. Nothing is posted back.
4. **Morgan (30 s).** Run the proof node. Show the Run tab (commands, hashes) and Verifier tab (every check). Submit the pack. Point out Morgan cannot accept her own work — the buttons are Avery's.
5. **Avery (20 s).** Switch operator. Accept with a note. Credit hits the ledger.
6. **Settle (30 s).** Show the **Settle target** toggle — mock cluster vs live devnet, same web3.js transaction. Settle. Read the receipt: lamports, signature, slot, memo `northbridge:sha256:…`.
7. **Verify (30 s).** The on-chain checks run automatically: digest recomputed, tx found, signatures valid, memo commits to the digest, transfer treasury → Morgan, treasury signed. Open the public proof page: "Don't trust the badge — verify it." On devnet, open Solana Explorer.
8. **Close (15 s).** No custody. No self-grading. No accept, no settle. The payment points at the proof.

Shortcut for a tight cut: on a fresh mission, press **Autopilot: play the loop** and narrate steps 4–7 over it.

## If GitHub is rate-limited

Intake completes from the bundled `fixtures/github-issue.json` and labels it "offline fixture". Say it is a recorded public snapshot, not seeded ledger rows.

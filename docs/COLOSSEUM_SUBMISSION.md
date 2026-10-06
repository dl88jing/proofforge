# Colosseum submission field drafts — ProofForge

Copy/paste drafts for the Arena project form. Team-location and Telegram fields are intentionally left for the team to fill.

**What are you building, and who is it for?**
ProofForge is a proof-before-payout layer for agent-spend and bounty work on Solana. A runner (human or AI agent) turns a public GitHub issue or bounty into a bounded mission, produces hashed evidence, and an independent verifier seals it into a Proof Pack. Only a maintainer can accept the pack; only an accepted pack can be paid. The payout is a single Solana transaction — a transfer plus a Memo that commits to the pack's SHA-256 digest — and anyone can re-verify it from the public proof page. It is for open-source maintainers, bounty programs, and teams starting to let agents spend money who need a reviewable, on-chain receipt for every payout.

**Why did you decide to build this, and why build it now?**
Agents are beginning to hold budgets and pay for work, but today's payouts either skip human review or sit inside custodial marketplaces, and the chain only records that money moved — not what it paid for or who checked. As agent-spend scales, "proof before payout" needs to be a primitive, not a policy doc. Solana's fast, cheap transactions and native Memo program make a per-proof payout with an embedded commitment practical right now.

**What technologies are you using or integrating with?**
Solana (`@solana/web3.js`, System Program transfers, SPL Memo program, devnet RPC, Solana Explorer), Next.js 16 App Router, TypeScript, Tailwind v4, shadcn/ui, GitHub REST API (read-only), canonical-JSON SHA-256 hashing, a hash-linked event ledger, an in-process Solana JSON-RPC mock cluster for keyless demos, and Upstash Redis / Vercel for serverless deployment.

**How does your product use these chains?**
Settlement happens on Solana after a human accept gate: the maintainer's treasury signs one transaction containing `SystemProgram.transfer` (treasury → contributor) and a Memo instruction `northbridge:sha256:<Proof Pack digest>`, with the treasury listed as memo signer. The public proof page reads that transaction back (`getParsedTransaction`), recomputes the pack digest, and checks the memo, transfer amount, recipient, and signer — so the on-chain record points at verified work. The same web3.js path runs against live devnet or an in-process mock cluster for demos.

**Links**
- GitHub: https://github.com/dl88jing/proofforge
- Live demo: https://proofforge-push.vercel.app
- Demo video / pitch video: _fill after upload_

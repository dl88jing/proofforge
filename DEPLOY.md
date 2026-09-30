# Local Avery / Morgan settle demo

Node 22+. No GitHub OAuth, no paid RPC, and no secrets required for the mock path.

```bash
git clone https://github.com/dl88jing/proofforge.git
cd proofforge
npm install
cp .env.example .env.local
npm run db:init
npm run demo
npm run dev
```

`npm run demo` is the full household loop against the in-process Solana mock RPC:

1. Intake `https://github.com/solana-foundation/solana-web3.js/issues/1`
2. Morgan runs the proof node and verifier, seals a Proof Pack
3. Avery accepts (credit + reputation)
4. Settle signs a System Program transfer + Memo (`northbridge:<digest>`) and confirms it

The CLI prints the mock signature. Then open [http://127.0.0.1:43173](http://127.0.0.1:43173) and repeat in the UI:

1. **Intake** the same public issue (missions start empty unless you already ran `demo`)
2. Acting as **Morgan**, **Run proof node** → **Submit pack to Avery**
3. Switch to **Avery**, accept, then **Settle on Solana**
4. Check **Ledger** and `/proof/<packId>`

Do not commit `.env.local` or `data/keys/*.json`. To use real Solana devnet instead of mock, copy the commented values in `.env.example`, fund the payer, and set `SOLANA_CLUSTER=devnet`.

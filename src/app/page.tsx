import Link from "next/link";
import { IntakeForm } from "@/components/intake-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HOUSEHOLD } from "@/lib/household";

const STEPS = [
  {
    title: "Intake",
    body: "Paste a public GitHub issue or bounty URL. ProofForge reads it and bounds a local mission Morgan can actually finish.",
  },
  {
    title: "Proof node",
    body: "Morgan runs a constrained local node: inspect, policy scan, hash, artifact write. No GitHub writes. No mainnet.",
  },
  {
    title: "Verifier + Pack",
    body: "An independent verifier re-checks artifacts and hashes. Only then is a Proof Pack sealed for Avery.",
  },
  {
    title: "Accept gate",
    body: "Avery accepts or rejects. Credit and reputation move only on accept. Builders do not grade their own work.",
  },
  {
    title: "Solana settle",
    body: "After accept, Avery's treasury signs a System Program transfer + Memo of the pack digest — mock cluster or live Solana devnet.",
  },
];

const PILLARS = [
  {
    title: "Agents spend. Humans authorize.",
    body: "Morgan (the runner) can produce evidence all day. Only Avery's accept gate unlocks credit, and only an accepted pack can move lamports.",
  },
  {
    title: "The chain points at verified work.",
    body: "Every payout memo is northbridge:<sha256 of the Proof Pack>. Anyone can recompute the digest and read the tx back — the public proof page does it in one click.",
  },
  {
    title: "Serverless, keyless demo.",
    body: "No database to provision. The mock cluster uses the exact web3.js transaction path as devnet, so judges can play the whole loop in under a minute.",
  },
];

export default function HomePage() {
  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div className="space-y-4">
          <p className="text-xs uppercase tracking-[0.22em] text-primary">
            {HOUSEHOLD.name} household · Crypto World&apos;s Fair
          </p>
          <h1 className="font-heading text-4xl leading-tight sm:text-5xl">
            Proof before payout for agent-spend and bounty work.
          </h1>
          <p className="max-w-xl text-muted-foreground">
            {HOUSEHOLD.product} turns a GitHub issue into a bounded mission, a verified Proof Pack,
            and a human accept gate. Only then does the household settle on Solana. Avery maintains.
            Morgan runs. Neither one skips the pack.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button render={<Link href="/intake" />}>Start intake</Button>
            <Button variant="outline" render={<Link href="/missions" />}>
              Open missions
            </Button>
          </div>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Try the loop</CardTitle>
            <CardDescription>
              Bound the default Solana web3.js issue, then hit <strong>Autopilot</strong> on the mission
              page to watch Morgan → verifier → Avery → Solana settle → on-chain verify.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <IntakeForm compact />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {STEPS.map((step, index) => (
          <Card key={step.title} size="sm">
            <CardHeader>
              <CardDescription>0{index + 1}</CardDescription>
              <CardTitle>{step.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-muted-foreground">{step.body}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {PILLARS.map((pillar) => (
          <Card key={pillar.title}>
            <CardHeader>
              <CardTitle>{pillar.title}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">{pillar.body}</CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Morgan · runner</CardTitle>
            <CardDescription>{HOUSEHOLD.operators.morgan.blurb}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Proof node identity: {HOUSEHOLD.nodeId}. Local evidence only. The node can fail; it cannot
            accept its own work or move funds.
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Avery · maintainer</CardTitle>
            <CardDescription>{HOUSEHOLD.operators.avery.blurb}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Accept creates household credit and reputation. Settle builds a System Program transfer
            plus Memo instruction, signs it, and confirms it against mock or public Solana RPC.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

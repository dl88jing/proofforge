import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { publicPack } from "@/lib/pipeline";
import { HOUSEHOLD } from "@/lib/household";
import { OnchainVerify } from "@/components/onchain-verify";
import { hydrateStore } from "@/lib/store";
import { settlementForPack, toSettlementRecord } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicProofPage({
  params,
}: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await params;
  await hydrateStore();
  const proof = publicPack(packId);
  if (!proof) notFound();
  const settlementRow = settlementForPack(packId);
  const settlement = settlementRow ? toSettlementRecord(settlementRow) : null;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.16em] text-primary">Public proof</p>
        <h1 className="font-heading text-4xl">{proof.title}</h1>
        <p className="mt-2 text-muted-foreground">
          Sanitized pack from {HOUSEHOLD.name}. Raw logs and local paths stay private.
        </p>
      </div>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <Badge variant={proof.verifierPassed ? "default" : "destructive"}>
              {proof.verifierPassed ? "Verifier pass" : "Verifier fail"}
            </Badge>
            <Badge variant={proof.accepted ? "default" : "secondary"}>
              {proof.accepted ? "Accepted" : "Not accepted"}
            </Badge>
            <Badge variant={proof.settled ? "default" : "outline"}>
              {proof.settled ? "Settled" : "Unsettled"}
            </Badge>
          </div>
          <CardTitle className="mt-3">Digest</CardTitle>
          <CardDescription className="break-all font-mono">{proof.digest}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{proof.summary}</p>
          <p>
            Source:{" "}
            <a className="underline" href={proof.sourceUrl} target="_blank" rel="noreferrer">
              {proof.sourceUrl}
            </a>
          </p>
          {proof.credit != null ? <p>Household credit: {proof.credit}</p> : null}
          {proof.settlementSignature ? (
            <p className="break-all font-mono text-xs">
              {proof.cluster} signature {proof.settlementSignature}
            </p>
          ) : null}
          {settlement ? (
            <p className="break-all font-mono text-[11px] text-muted-foreground">
              memo {settlement.memo} · {settlement.lamports.toLocaleString()} lamports
            </p>
          ) : null}
          <p className="text-xs">
            <a className="underline" href={`/api/proof/${packId}`}>
              Public proof JSON
            </a>{" "}
            ·{" "}
            <a className="underline" href={`/api/proof/${packId}/verify`}>
              Verification JSON
            </a>
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Don&apos;t trust the badge — verify it</CardTitle>
          <CardDescription>
            Recomputes the canonical SHA-256 of the sealed pack, reads the settle transaction back
            from Solana, and checks that its memo commits to exactly this digest.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OnchainVerify packId={packId} autoRun={proof.settled} />
        </CardContent>
      </Card>
    </div>
  );
}

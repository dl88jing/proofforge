import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { publicPack } from "@/lib/pipeline";
import { HOUSEHOLD } from "@/lib/household";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PublicProofPage({
  params,
}: {
  params: Promise<{ packId: string }>;
}) {
  const { packId } = await params;
  const proof = publicPack(packId);
  if (!proof) notFound();

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
        </CardContent>
      </Card>
    </div>
  );
}

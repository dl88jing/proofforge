"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { OperatorSwitch, useOperator } from "@/components/operator-switch";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { HOUSEHOLD } from "@/lib/household";
import type { MissionStatus, ProofPack, PublicProof, SettlementRecord } from "@/lib/types";

type EventView = {
  seq: number;
  kind: string;
  hash: string;
  prev_hash: string;
  created_at: string;
  payload_json: string;
};

type MissionDetail = {
  mission: {
    id: string;
    title: string;
    objective: string;
    status: MissionStatus;
    source_url: string;
    reward_label: string | null;
    source: {
      url: string;
      owner: string | null;
      repo: string | null;
      number: number | null;
      labels: string[];
      body: string;
      offlineFallback: boolean;
    };
    bounds: { maxMinutes: number; execution: string; writes: string; humanGates: string[] };
    acceptance: string[];
    policy: { allowed: boolean; findings: { id: string; severity: string; message: string }[] };
  };
  run: {
    id: string;
    status: string;
    logs: string;
    commands_json: string;
    started_at: string;
    finished_at: string | null;
  } | null;
  pack: ProofPack | null;
  publicProof: PublicProof | null;
  review: { reviewer: string; decision: string; note: string | null; decided_at: string } | null;
  settlement: SettlementRecord | null;
  events: EventView[];
};

export function MissionWorkbench({ initial }: { initial: MissionDetail }) {
  const [detail, setDetail] = useState(initial);
  const [note, setNote] = useState("The work holds. Credit Morgan and settle on Solana.");
  const [pending, setPending] = useState<string | null>(null);
  const [operator] = useOperator();
  const status = detail.mission.status;

  async function act(path: string, body?: unknown) {
    setPending(path);
    try {
      const response = await fetch(path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : "{}",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Request failed");
      setDetail(data);
      toast.success("Mission updated.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setPending(null);
    }
  }

  const commands = useMemo(() => {
    if (!detail.run) return [];
    try {
      return JSON.parse(detail.run.commands_json) as { cmd: string; status: string; ms: number }[];
    } catch {
      return [];
    }
  }, [detail.run]);

  const explorer =
    detail.settlement?.status === "confirmed" &&
    detail.settlement.signature &&
    (detail.settlement.cluster === "devnet" || detail.settlement.cluster === "testnet")
      ? `https://explorer.solana.com/tx/${detail.settlement.signature}?cluster=${detail.settlement.cluster}`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Mission</p>
          <h1 className="font-heading text-3xl">{detail.mission.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            <a className="underline decoration-primary/40" href={detail.mission.source.url} target="_blank" rel="noreferrer">
              {detail.mission.source.url}
            </a>
            {detail.mission.source.offlineFallback ? " · offline fixture" : ""}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <PipelineStepper status={status} />
      <OperatorSwitch />

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <CardTitle>Bounded terms</CardTitle>
            <CardDescription>
              {detail.mission.bounds.execution} · {detail.mission.bounds.maxMinutes} min · writes{" "}
              {detail.mission.bounds.writes}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p>{detail.mission.objective}</p>
            <p className="text-sm text-muted-foreground">Reward: {detail.mission.reward_label}</p>
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {detail.mission.acceptance.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Human gate</CardTitle>
            <CardDescription>
              {operator === "morgan"
                ? HOUSEHOLD.operators.morgan.blurb
                : HOUSEHOLD.operators.avery.blurb}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {status === "bounded" || status === "failed" || status === "rejected" ? (
              <Button
                disabled={operator !== "morgan" || pending !== null}
                onClick={() => act(`/api/missions/${detail.mission.id}/run`)}
              >
                {pending ? "Running…" : "Run proof node"}
              </Button>
            ) : null}
            {status === "packed" ? (
              <Button
                disabled={operator !== "morgan" || pending !== null}
                onClick={() => act(`/api/missions/${detail.mission.id}/submit`)}
              >
                Submit pack to Avery
              </Button>
            ) : null}
            {status === "submitted" ? (
              <div className="space-y-2">
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={operator !== "avery" || pending !== null}
                    onClick={() =>
                      act(`/api/missions/${detail.mission.id}/review`, {
                        decision: "accept",
                        note,
                      })
                    }
                  >
                    Avery accepts
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={operator !== "avery" || pending !== null}
                    onClick={() =>
                      act(`/api/missions/${detail.mission.id}/review`, {
                        decision: "reject",
                        note,
                      })
                    }
                  >
                    Reject
                  </Button>
                </div>
                {operator !== "avery" ? (
                  <p className="text-xs text-muted-foreground">Switch to Avery to operate the accept gate.</p>
                ) : null}
              </div>
            ) : null}
            {status === "accepted" ? (
              <Button
                disabled={operator !== "avery" || pending !== null}
                onClick={() => act(`/api/missions/${detail.mission.id}/settle`)}
              >
                {pending ? "Settling…" : "Settle on Solana"}
              </Button>
            ) : null}
            {status === "settled" && detail.settlement?.signature ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium text-proof">Settled {detail.settlement.lamports} lamports</p>
                <p className="break-all font-mono text-xs">{detail.settlement.signature}</p>
                <p className="text-xs text-muted-foreground">
                  {detail.settlement.cluster} · {detail.settlement.payerPubkey.slice(0, 8)}… →{" "}
                  {detail.settlement.payeePubkey.slice(0, 8)}…
                </p>
              </div>
            ) : null}
            {detail.pack ? (
              <p className="text-xs">
                Public proof:{" "}
                <Link className="underline" href={`/proof/${detail.pack.packId}`}>
                  {detail.pack.packId}
                </Link>
              </p>
            ) : null}
            {operator === "morgan" && (status === "submitted" || status === "accepted") ? (
              <p className="text-xs text-muted-foreground">
                Morgan runs and submits. Avery accepts and settles.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="source">
        <TabsList>
          <TabsTrigger value="source">Source</TabsTrigger>
          <TabsTrigger value="run">Run</TabsTrigger>
          <TabsTrigger value="verifier">Verifier</TabsTrigger>
          <TabsTrigger value="pack">Pack</TabsTrigger>
          <TabsTrigger value="events">Events</TabsTrigger>
        </TabsList>
        <TabsContent value="source" className="mt-3">
          <Card>
            <CardContent className="space-y-2 pt-4">
              <p className="text-xs text-muted-foreground">
                Labels: {detail.mission.source.labels.join(", ") || "none"}
              </p>
              <pre className="max-h-80 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-3 text-xs">
                {detail.mission.source.body || "This source has an empty body. Bounds were derived from the title."}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="run" className="mt-3">
          <Card>
            <CardContent className="space-y-3 pt-4">
              {!detail.run ? (
                <p className="text-sm text-muted-foreground">No proof run yet. This table is currently empty.</p>
              ) : (
                <>
                  <ul className="space-y-1 text-sm">
                    {commands.map((command) => (
                      <li key={command.cmd} className="flex justify-between gap-4 font-mono text-xs">
                        <span>{command.cmd}</span>
                        <span>
                          {command.status} · {command.ms}ms
                        </span>
                      </li>
                    ))}
                  </ul>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-black/30 p-3 text-xs">
                    {detail.run.logs}
                  </pre>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="verifier" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              {!detail.pack ? (
                <p className="text-sm text-muted-foreground">No verifier report yet. This table is currently empty.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {detail.pack.verifier.checks.map((check) => (
                    <li key={check.id} className="flex items-start justify-between gap-4">
                      <span>
                        <span className="font-medium">{check.id}</span>
                        <span className="block text-xs text-muted-foreground">{check.detail}</span>
                      </span>
                      <span className={check.passed ? "text-proof" : "text-destructive"}>
                        {check.passed ? "pass" : "fail"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="pack" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              {!detail.pack ? (
                <p className="text-sm text-muted-foreground">No Proof Pack yet. This table is currently empty.</p>
              ) : (
                <pre className="max-h-96 overflow-auto rounded-md bg-black/30 p-3 text-xs">
                  {JSON.stringify(detail.pack, null, 2)}
                </pre>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="events" className="mt-3">
          <Card>
            <CardContent className="pt-4">
              {detail.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">Event chain is currently empty.</p>
              ) : (
                <ol className="space-y-2 text-xs">
                  {detail.events.map((event) => (
                    <li key={event.seq} className="rounded-md border border-border/70 p-2">
                      <div className="flex justify-between gap-3">
                        <span className="font-medium">
                          {event.seq}. {event.kind}
                        </span>
                        <span className="text-muted-foreground">{event.created_at}</span>
                      </div>
                      <p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">
                        {event.hash}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      {explorer ? (
        <p className="text-sm">
          Explorer:{" "}
          <a className="underline" href={explorer} target="_blank" rel="noreferrer">
            {explorer}
          </a>
        </p>
      ) : null}
    </div>
  );
}

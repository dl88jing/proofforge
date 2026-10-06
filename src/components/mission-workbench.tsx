"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Bot, Radio, Zap } from "lucide-react";
import { toast } from "sonner";
import { OnchainVerify } from "@/components/onchain-verify";
import { OperatorSwitch, useOperator } from "@/components/operator-switch";
import { PipelineStepper } from "@/components/pipeline-stepper";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { HOUSEHOLD } from "@/lib/household";
import type { MissionStatus, ProofPack, PublicProof, SettleMode, SettlementRecord } from "@/lib/types";
import { cn } from "@/lib/utils";

export type SettleOptionsView = {
  defaultMode: SettleMode;
  liveCluster: string;
  liveRpcUrl: string;
  liveReady: boolean;
  livePayer: string | null;
  mockPayer: string;
  payee: string;
  lamports: number;
};

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function MissionWorkbench({
  initial,
  settle,
}: {
  initial: MissionDetail;
  settle: SettleOptionsView;
}) {
  const [detail, setDetail] = useState(initial);
  const [note, setNote] = useState("The work holds. Credit Morgan and settle on Solana.");
  const [pending, setPending] = useState<string | null>(null);
  const [autopilot, setAutopilot] = useState<string | null>(null);
  const [mode, setMode] = useState<SettleMode>(
    settle.defaultMode === "live" && settle.liveReady ? "live" : "mock"
  );
  const [operator, setOperator] = useOperator();
  const status = detail.mission.status;

  async function act(path: string, body?: unknown, quiet = false): Promise<MissionDetail | null> {
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
      if (!quiet) toast.success(successMessage(data as MissionDetail));
      return data as MissionDetail;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
      return null;
    } finally {
      setPending(null);
    }
  }

  const base = `/api/missions/${detail.mission.id}`;

  /** One-click judge path: plays every remaining human/agent step with visible hand-offs. */
  async function runAutopilot() {
    let current: MissionDetail | null = detail;
    const step = async (label: string, who: "morgan" | "avery", path: string, body?: unknown) => {
      setAutopilot(label);
      setOperator(who);
      await sleep(700);
      current = await act(path, body, true);
      if (current) toast.success(label);
      await sleep(500);
    };
    try {
      if (current && ["bounded", "failed", "rejected"].includes(current.mission.status)) {
        await step("Morgan ran the proof node · verifier sealed the pack", "morgan", `${base}/run`);
      }
      if (current?.mission.status === "packed") {
        await step("Morgan submitted the Proof Pack to Avery", "morgan", `${base}/submit`);
      }
      if (current?.mission.status === "submitted") {
        await step("Avery accepted · credit granted", "avery", `${base}/review`, {
          decision: "accept",
          note,
        });
      }
      if (current?.mission.status === "accepted") {
        await step(
          mode === "live" ? `Avery settled on Solana ${settle.liveCluster}` : "Avery settled on the mock cluster",
          "avery",
          `${base}/settle`,
          { mode }
        );
      }
    } finally {
      setAutopilot(null);
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
    detail.settlement?.status === "confirmed" ? (detail.settlement.explorer ?? null) : null;
  const busy = pending !== null || autopilot !== null;

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
      <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/60 p-3 sm:flex-row sm:items-center sm:justify-between">
        <OperatorSwitch />
        {status !== "settled" ? (
          <div className="flex items-center gap-3">
            {autopilot ? <span className="text-xs text-muted-foreground">{autopilot}…</span> : null}
            <Button type="button" variant="secondary" size="sm" disabled={busy} onClick={runAutopilot}>
              <Bot className="size-3.5" />
              {autopilot ? "Autopilot running" : "Autopilot: play the loop"}
            </Button>
          </div>
        ) : null}
      </div>

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
                disabled={operator !== "morgan" || busy}
                onClick={() => act(`${base}/run`)}
              >
                {pending ? "Running…" : "Run proof node"}
              </Button>
            ) : null}
            {status === "packed" ? (
              <Button
                disabled={operator !== "morgan" || busy}
                onClick={() => act(`${base}/submit`)}
              >
                Submit pack to Avery
              </Button>
            ) : null}
            {status === "submitted" ? (
              <div className="space-y-2">
                <Textarea value={note} onChange={(event) => setNote(event.target.value)} />
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={operator !== "avery" || busy}
                    onClick={() =>
                      act(`${base}/review`, {
                        decision: "accept",
                        note,
                      })
                    }
                  >
                    Avery accepts
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={operator !== "avery" || busy}
                    onClick={() =>
                      act(`${base}/review`, {
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
            {status === "accepted" || status === "submitted" ? (
              <SettleModeToggle mode={mode} onChange={setMode} settle={settle} disabled={busy} />
            ) : null}
            {status === "accepted" ? (
              <Button
                disabled={operator !== "avery" || busy}
                onClick={() => act(`${base}/settle`, { mode })}
              >
                {mode === "live" ? <Radio className="size-3.5" /> : <Zap className="size-3.5" />}
                {pending
                  ? mode === "live"
                    ? `Confirming on ${settle.liveCluster}…`
                    : "Settling…"
                  : mode === "live"
                    ? `Settle on Solana ${settle.liveCluster}`
                    : "Settle on mock cluster"}
              </Button>
            ) : null}
            {detail.settlement?.status === "failed" && status === "accepted" ? (
              <p className="text-xs text-destructive">Last settle failed: {detail.settlement.error}</p>
            ) : null}
            {status === "settled" && detail.settlement?.signature ? (
              <div className="space-y-2 rounded-md border border-proof/40 bg-proof/5 p-3 text-sm">
                <p className="font-medium text-proof">
                  Settled {detail.settlement.lamports.toLocaleString()} lamports ·{" "}
                  {detail.settlement.cluster === "mock" ? "mock cluster" : `Solana ${detail.settlement.cluster}`}
                </p>
                <p className="break-all font-mono text-xs">{detail.settlement.signature}</p>
                <p className="text-xs text-muted-foreground">
                  Avery treasury {detail.settlement.payerPubkey.slice(0, 8)}… → Morgan{" "}
                  {detail.settlement.payeePubkey.slice(0, 8)}… · slot {detail.settlement.slot ?? "?"}
                </p>
                <p className="break-all font-mono text-[11px] text-muted-foreground">memo {detail.settlement.memo}</p>
                {explorer ? (
                  <a className="text-xs underline" href={explorer} target="_blank" rel="noreferrer">
                    Solana Explorer ↗
                  </a>
                ) : null}
                {detail.pack ? <OnchainVerify packId={detail.pack.packId} autoRun /> : null}
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
    </div>
  );
}

function successMessage(data: MissionDetail): string {
  switch (data.mission.status) {
    case "packed":
      return "Verifier passed. Proof Pack sealed.";
    case "failed":
      return "Verifier failed. No pack sealed.";
    case "submitted":
      return "Pack submitted. Waiting on Avery.";
    case "accepted":
      return "Avery accepted. Credit granted.";
    case "rejected":
      return "Avery rejected. No credit.";
    case "settled":
      return `Settled on ${data.settlement?.cluster === "mock" ? "the mock cluster" : `Solana ${data.settlement?.cluster}`}.`;
    default:
      return "Mission updated.";
  }
}

function SettleModeToggle({
  mode,
  onChange,
  settle,
  disabled,
}: {
  mode: SettleMode;
  onChange: (mode: SettleMode) => void;
  settle: SettleOptionsView;
  disabled: boolean;
}) {
  const options: { id: SettleMode; title: string; body: string; enabled: boolean }[] = [
    {
      id: "mock",
      title: "Mock cluster",
      body: "In-process JSON-RPC. Same web3.js tx, signatures verified, no network.",
      enabled: true,
    },
    {
      id: "live",
      title: `Solana ${settle.liveCluster}`,
      body: settle.liveReady
        ? `Live RPC · payer ${settle.livePayer?.slice(0, 6)}…`
        : "Set SOLANA_PAYER_SECRET (funded devnet key) to enable.",
      enabled: settle.liveReady,
    },
  ];
  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Settle target</p>
      <div className="grid grid-cols-2 gap-2" role="radiogroup">
        {options.map((option) => (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={mode === option.id}
            disabled={disabled || !option.enabled}
            onClick={() => onChange(option.id)}
            className={cn(
              "rounded-md border p-2 text-left text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
              mode === option.id
                ? "border-primary/60 bg-primary/10"
                : "border-border hover:bg-muted"
            )}
          >
            <span className="block font-medium text-foreground">{option.title}</span>
            <span className="block text-muted-foreground">{option.body}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

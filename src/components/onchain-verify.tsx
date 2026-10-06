"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

type Check = { id: string; passed: boolean; detail: string };
type Result = {
  verified: boolean;
  cluster: string | null;
  signature: string | null;
  explorer: string | null;
  checks: Check[];
  verifiedAt: string;
};

/** Anyone can re-derive the pack digest and read the Solana settle tx back. */
export function OnchainVerify({ packId, autoRun = false }: { packId: string; autoRun?: boolean }) {
  const [result, setResult] = useState<Result | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const response = await fetch(`/api/proof/${packId}/verify`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Verification failed");
      setResult(data as Result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Verification failed");
    } finally {
      setPending(false);
    }
  }, [packId]);

  useEffect(() => {
    if (!autoRun) return;
    const timer = setTimeout(() => void run(), 0);
    return () => clearTimeout(timer);
  }, [autoRun, run]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" disabled={pending} onClick={run}>
          <ShieldCheck className="size-3.5" />
          {pending ? "Reading Solana…" : result ? "Re-verify on-chain" : "Verify on-chain"}
        </Button>
        {result ? (
          <span className={result.verified ? "text-sm font-medium text-proof" : "text-sm text-destructive"}>
            {result.verified
              ? `Verified · ${result.cluster === "mock" ? "mock cluster" : `Solana ${result.cluster}`}`
              : "Not fully verified"}
          </span>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {result ? (
        <ul className="space-y-1.5 text-xs">
          {result.checks.map((check) => (
            <li key={check.id} className="flex items-start justify-between gap-4">
              <span>
                <span className="font-mono">{check.id}</span>
                <span className="block text-muted-foreground">{check.detail}</span>
              </span>
              <span className={check.passed ? "text-proof" : "text-destructive"}>
                {check.passed ? "✓" : "✗"}
              </span>
            </li>
          ))}
          {result.explorer ? (
            <li>
              <a className="underline" href={result.explorer} target="_blank" rel="noreferrer">
                Open in Solana Explorer ↗
              </a>
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}

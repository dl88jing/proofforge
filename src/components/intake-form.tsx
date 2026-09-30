"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const DEMO_URL = "https://github.com/solana-foundation/solana-web3.js/issues/1";

export function IntakeForm({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [url, setUrl] = useState(DEMO_URL);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    try {
      const response = await fetch("/api/missions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Intake failed");
      toast.success("Mission bounded. Morgan can run the proof node.");
      router.push(`/missions/${data.mission.id}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Intake failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="source-url">GitHub issue or bounty URL</Label>
        <Input
          id="source-url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={DEMO_URL}
          required
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Public GitHub only. ProofForge reads the issue, bounds a local mission, and never posts
        back. If GitHub is rate-limited, intake falls back to the recorded fixture.
      </p>
      <Button type="submit" disabled={pending} size={compact ? "default" : "lg"}>
        {pending ? "Bounding mission…" : "Bound mission"}
      </Button>
    </form>
  );
}

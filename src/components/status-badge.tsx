import { Badge } from "@/components/ui/badge";
import type { MissionStatus } from "@/lib/types";

const LABELS: Record<MissionStatus, string> = {
  bounded: "Bounded",
  running: "Running",
  verified: "Verified",
  packed: "Proof Pack",
  submitted: "Awaiting Avery",
  accepted: "Accepted",
  rejected: "Rejected",
  settled: "Settled",
  failed: "Failed",
};

export function StatusBadge({ status }: { status: MissionStatus }) {
  const variant =
    status === "failed" || status === "rejected"
      ? "destructive"
      : status === "settled" || status === "accepted"
        ? "default"
        : "secondary";
  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}

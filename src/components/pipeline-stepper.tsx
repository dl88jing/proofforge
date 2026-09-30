import { cn } from "@/lib/utils";
import type { MissionStatus } from "@/lib/types";

const STEPS = [
  { id: "intake", label: "Intake" },
  { id: "run", label: "Proof node" },
  { id: "pack", label: "Pack" },
  { id: "accept", label: "Accept" },
  { id: "settle", label: "Settle" },
] as const;

function stepIndex(status: MissionStatus): number {
  switch (status) {
    case "bounded":
      return 0;
    case "running":
    case "verified":
    case "failed":
      return 1;
    case "packed":
      return 2;
    case "submitted":
    case "rejected":
      return 3;
    case "accepted":
      return 3;
    case "settled":
      return 4;
    default:
      return 0;
  }
}

export function PipelineStepper({ status }: { status: MissionStatus }) {
  const current = stepIndex(status);
  const accepted = status === "accepted" || status === "settled";
  return (
    <ol className="grid grid-cols-5 gap-2">
      {STEPS.map((step, index) => {
        const done =
          index < current ||
          (index === current && (status === "settled" || (step.id === "accept" && accepted)));
        const active = index === current && status !== "settled";
        return (
          <li
            key={step.id}
            className={cn(
              "rounded-md border px-2 py-2 text-center text-xs",
              done && "border-primary/50 bg-primary/10 text-primary",
              active && !done && "border-ember/50 bg-ember/10 text-foreground",
              !done && !active && "border-border text-muted-foreground"
            )}
          >
            <span className="block font-medium">{step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ResetDemoButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={async () => {
        if (!window.confirm("Wipe all Northbridge missions, credits, and mock-cluster state?")) return;
        setPending(true);
        const response = await fetch("/api/demo/reset", { method: "POST" });
        setPending(false);
        if (!response.ok) {
          toast.error("Reset is disabled on this deployment.");
          return;
        }
        toast.success("Household state reset.");
        router.refresh();
      }}
    >
      Reset demo
    </Button>
  );
}

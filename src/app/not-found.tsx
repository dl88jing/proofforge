import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="space-y-4">
      <h1 className="font-heading text-3xl">Not in the forge</h1>
      <p className="text-muted-foreground">That mission or proof pack is not in the household ledger.</p>
      <Button render={<Link href="/missions" />}>Back to missions</Button>
    </div>
  );
}

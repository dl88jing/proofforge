import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { listMissionSummaries } from "@/lib/pipeline";

export const dynamic = "force-dynamic";

export default function MissionsPage() {
  const missions = listMissionSummaries();
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-primary">Workbench</p>
          <h1 className="font-heading text-4xl">Missions</h1>
          <p className="mt-2 text-muted-foreground">
            Each row is a bounded source. Run, pack, accept, then settle — in that order.
          </p>
        </div>
        <Button render={<Link href="/intake" />}>New intake</Button>
      </div>
      {missions.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No missions yet</CardTitle>
            <CardDescription>The missions table is currently empty.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Import a GitHub issue to bound the first mission. ProofForge does not seed demo rows.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {missions.map((mission) => (
            <Link key={mission.id} href={`/missions/${mission.id}`}>
              <Card className="transition-colors hover:border-primary/40">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle>{mission.title}</CardTitle>
                      <CardDescription>{mission.sourceUrl}</CardDescription>
                    </div>
                    <StatusBadge status={mission.status} />
                  </div>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">
                  {mission.rewardLabel} · updated {new Date(mission.updatedAt).toLocaleString()}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

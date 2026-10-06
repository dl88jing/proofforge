import { notFound } from "next/navigation";
import { MissionWorkbench } from "@/components/mission-workbench";
import { getMission } from "@/lib/db/queries";
import { assembleMission } from "@/lib/pipeline";
import { settleOptions } from "@/lib/solana/settle";
import { defaultSettleMode } from "@/lib/config";
import { hydrateStore } from "@/lib/store";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await hydrateStore();
  if (!getMission(id)) notFound();
  return (
    <MissionWorkbench
      initial={assembleMission(id)}
      settle={{ ...settleOptions(), defaultMode: defaultSettleMode() }}
    />
  );
}

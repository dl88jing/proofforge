import { notFound } from "next/navigation";
import { MissionWorkbench } from "@/components/mission-workbench";
import { getMission } from "@/lib/db/queries";
import { assembleMission } from "@/lib/pipeline";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!getMission(id)) notFound();
  return <MissionWorkbench initial={assembleMission(id)} />;
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { importAndBoundMission, listMissionSummaries } from "@/lib/pipeline";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ missions: await withStore(() => listMissionSummaries()) });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url?.trim()) {
      return NextResponse.json({ error: "A GitHub issue or bounty URL is required." }, { status: 400 });
    }
    const result = await withStore(() => importAndBoundMission(body.url!.trim()));
    revalidatePath("/missions");
    revalidatePath(`/missions/${result.mission.id}`);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

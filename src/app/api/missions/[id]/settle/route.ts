import { NextResponse } from "next/server";
import { settleMission } from "@/lib/pipeline";
import { withStore } from "@/lib/store";
import type { SettleMode } from "@/lib/types";

export const maxDuration = 60;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json().catch(() => ({}))) as { mode?: SettleMode };
    const mode = body.mode === "live" || body.mode === "mock" ? body.mode : undefined;
    return NextResponse.json(await withStore(() => settleMission(id, mode)));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

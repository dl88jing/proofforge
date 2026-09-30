import { NextResponse } from "next/server";
import { settleMission } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    return NextResponse.json(await settleMission(id));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

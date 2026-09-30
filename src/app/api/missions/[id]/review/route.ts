import { NextResponse } from "next/server";
import { reviewMission } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = (await request.json()) as {
      decision?: "accept" | "reject";
      note?: string;
    };
    if (body.decision !== "accept" && body.decision !== "reject") {
      return NextResponse.json({ error: "decision must be accept or reject" }, { status: 400 });
    }
    return NextResponse.json(reviewMission(id, body.decision, body.note ?? ""));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

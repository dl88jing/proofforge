import { NextResponse } from "next/server";
import { publicPack } from "@/lib/pipeline";
import { hydrateStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sanitized public proof JSON (northbridge.publicproof.v1). No raw logs or local paths. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packId: string }> }
) {
  const { packId } = await params;
  await hydrateStore();
  const proof = publicPack(packId);
  if (!proof) return NextResponse.json({ error: "Proof Pack not found." }, { status: 404 });
  return NextResponse.json(proof);
}

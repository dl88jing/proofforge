import { NextResponse } from "next/server";
import { verifyPackOnchain } from "@/lib/solana/verify-onchain";
import { hydrateStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** Public, read-only: recompute the pack digest and read the settle tx back from Solana. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ packId: string }> }
) {
  const { packId } = await params;
  await hydrateStore();
  const result = await verifyPackOnchain(packId);
  if (!result) return NextResponse.json({ error: "Proof Pack not found." }, { status: 404 });
  return NextResponse.json(result);
}

import { NextResponse } from "next/server";
import { ledgerSnapshot } from "@/lib/pipeline";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(ledgerSnapshot());
}

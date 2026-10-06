import { NextResponse } from "next/server";
import { ledgerSnapshot } from "@/lib/pipeline";
import { withStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await withStore(() => ledgerSnapshot()));
}

import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { flushStore, resetStore } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Demo-only: wipe household state. Disable with PROOFFORGE_ALLOW_RESET=0. */
export async function POST() {
  if (process.env.PROOFFORGE_ALLOW_RESET === "0") {
    return NextResponse.json({ error: "Reset disabled on this deployment." }, { status: 403 });
  }
  resetStore();
  await flushStore();
  revalidatePath("/missions");
  revalidatePath("/ledger");
  return NextResponse.json({ ok: true });
}

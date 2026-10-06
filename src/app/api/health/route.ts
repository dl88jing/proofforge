import { NextResponse } from "next/server";
import { HOUSEHOLD } from "@/lib/household";
import { defaultSettleMode } from "@/lib/config";
import { settleOptions } from "@/lib/solana/settle";
import { hydrateStore, storeInfo } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  await hydrateStore();
  const settle = settleOptions();
  return NextResponse.json({
    ok: true,
    product: HOUSEHOLD.product,
    household: HOUSEHOLD.name,
    nodeId: HOUSEHOLD.nodeId,
    settle: {
      defaultMode: defaultSettleMode(),
      liveCluster: settle.liveCluster,
      liveRpcUrl: settle.liveRpcUrl,
      liveReady: settle.liveReady,
      livePayer: settle.livePayer,
      payee: settle.payee,
      lamports: settle.lamports,
    },
    store: storeInfo(),
  });
}

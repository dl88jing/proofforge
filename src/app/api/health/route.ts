import { NextResponse } from "next/server";
import { HOUSEHOLD } from "@/lib/household";
import { solanaCluster, solanaRpcUrl } from "@/lib/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    product: HOUSEHOLD.product,
    household: HOUSEHOLD.name,
    nodeId: HOUSEHOLD.nodeId,
    cluster: solanaCluster(),
    rpcUrl: solanaRpcUrl(),
  });
}

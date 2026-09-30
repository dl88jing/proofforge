import { NextResponse } from "next/server";
import { handleSolanaRpc } from "@/lib/solana/mock-rpc";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(handleSolanaRpc(body));
}

export async function GET() {
  return NextResponse.json({
    jsonrpc: "2.0",
    result: "ok",
    cluster: "northbridge-mock",
    methods: [
      "getHealth",
      "getLatestBlockhash",
      "sendTransaction",
      "getSignatureStatuses",
      "getBalance",
      "requestAirdrop",
    ],
  });
}

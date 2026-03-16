import { NextResponse } from "next/server";
import { executeCommand } from "@/lib/agent";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const raw = await executeCommand({ type: "status" });
    const parsed = JSON.parse(raw);

    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 500 });
    }

    return NextResponse.json({
      setup: parsed.setup,
      userSmartAccount: parsed.userSmartAccount,
      agentSmartAccount: parsed.agentSmartAccount,
      spendingPolicy: parsed.spendingPolicy,
      enforcement: parsed.enforcement,
      chain: parsed.chain,
      reasoning: parsed.reasoning,
      execution: parsed.execution,
      identity: parsed.identity,
      txCount: parsed.txCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: message, setup: "error" },
      { status: 500 }
    );
  }
}

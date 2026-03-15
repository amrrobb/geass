import { NextResponse } from "next/server";
import { execSync } from "child_process";

export async function GET() {
  try {
    const raw = execSync("tsx agent/index.ts status", {
      encoding: "utf-8",
      timeout: 15_000,
      cwd: process.cwd(),
    }).trim();

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
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message, setup: "error" },
      { status: 500 }
    );
  }
}

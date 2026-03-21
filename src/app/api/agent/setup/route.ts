import { NextRequest, NextResponse } from "next/server";
import {
  createPublicClient,
  http,
  parseEther,
  formatEther,
  type Hex,
  type Address,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

/**
 * This route only generates an ephemeral key and returns it.
 * All delegation/signing happens client-side via the user's wallet.
 */
export async function POST(_req: NextRequest) {
  try {
    const agentPrivateKey = generatePrivateKey();
    const agentAccount = privateKeyToAccount(agentPrivateKey);

    return NextResponse.json({
      ok: true,
      agentPrivateKey,
      agentAddress: agentAccount.address,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Key generation failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

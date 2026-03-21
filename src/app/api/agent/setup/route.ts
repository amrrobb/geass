import { NextRequest, NextResponse } from "next/server";
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
  formatEther,
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  toMetaMaskSmartAccount,
  Implementation,
  getSmartAccountsEnvironment,
  createDelegation,
  ROOT_AUTHORITY,
} from "@metamask/smart-accounts-kit";

export const dynamic = "force-dynamic";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

export async function POST(req: NextRequest) {
  try {
    const { userAddress, maxEth = "0.01" } = await req.json();

    if (!userAddress) {
      return NextResponse.json({ ok: false, error: "userAddress required" }, { status: 400 });
    }

    // Generate ephemeral agent key on server, return to client
    const agentPrivateKey = generatePrivateKey();
    const agentAccount = privateKeyToAccount(agentPrivateKey);

    // Create smart account owned by the user
    const userKey = process.env.PRIVATE_KEY as Hex;
    if (!userKey) {
      return NextResponse.json({ ok: false, error: "Server PRIVATE_KEY not configured" }, { status: 500 });
    }

    const ownerAccount = privateKeyToAccount(userKey);
    const ownerWalletClient = createWalletClient({
      account: ownerAccount,
      chain: baseSepolia,
      transport: http(RPC_URL),
    });

    const salt = "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

    const smartAccount = await toMetaMaskSmartAccount({
      client: publicClient as any,
      implementation: Implementation.Hybrid,
      deployParams: [ownerAccount.address, [], [], []],
      deploySalt: salt,
      signer: ownerWalletClient as any,
    });

    // Deploy if needed
    const deployed = await smartAccount.isDeployed();
    if (!deployed) {
      const factoryArgs = await smartAccount.getFactoryArgs();
      if (factoryArgs) {
        const txHash = await ownerWalletClient.sendTransaction({
          to: factoryArgs.factory as Address,
          data: factoryArgs.factoryData as Hex,
          chain: baseSepolia,
        });
        await publicClient.waitForTransactionReceipt({ hash: txHash });
      }
    }

    // Create delegation: smart account → ephemeral agent key
    const env = getSmartAccountsEnvironment(baseSepolia.id);
    const delegation = createDelegation({
      environment: env,
      to: agentAccount.address,
      from: smartAccount.address,
      scope: {
        type: "nativeTokenTransferAmount" as const,
        maxAmount: parseEther(maxEth),
      },
      parentDelegation: ROOT_AUTHORITY,
    });

    const signature = await smartAccount.signDelegation({ delegation });
    const signedDelegation = { ...delegation, signature };

    // Fund ephemeral agent with gas
    const fundHash = await ownerWalletClient.sendTransaction({
      to: agentAccount.address,
      value: parseEther("0.001"),
      chain: baseSepolia,
    });
    await publicClient.waitForTransactionReceipt({ hash: fundHash });

    // Check SA balance
    const saBalance = await publicClient.getBalance({ address: smartAccount.address });
    const funded = saBalance > BigInt(0);

    return NextResponse.json({
      ok: true,
      action: "setup",
      message: "Delegation created. Agent key is ephemeral — exists only in your browser session.",
      agentPrivateKey, // Sent to client, stored in localStorage only
      agentAddress: agentAccount.address,
      userSmartAccount: smartAccount.address,
      delegation: signedDelegation,
      spendingPolicy: `${maxEth} ETH max per delegation`,
      enforcement: "On-chain via MetaMask Delegation Framework — NativeTokenTransferAmountEnforcer",
      smartAccountFunded: funded,
      saBalance: formatEther(saBalance),
      note: funded ? undefined : "Fund the smart account with Base Sepolia ETH to enable on-chain execution",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Setup failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

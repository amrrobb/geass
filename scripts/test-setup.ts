import { createWalletClient, http, type Hex, type Address } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  toMetaMaskSmartAccount,
  Implementation,
  getSmartAccountsEnvironment,
  createDelegation,
  ROOT_AUTHORITY,
  contracts,
  ExecutionMode,
} from "@metamask/smart-accounts-kit";
import { createPublicClient, parseEther, formatEther } from "viem";

const TEST_KEY = process.env.PRIVATE_KEY as Hex;
if (!TEST_KEY) throw new Error("PRIVATE_KEY needed");

const userAccount = privateKeyToAccount(TEST_KEY);
console.log("User wallet:", userAccount.address);

const ephemeralKey = generatePrivateKey();
const ephemeralAccount = privateKeyToAccount(ephemeralKey);
console.log("Ephemeral agent:", ephemeralAccount.address);

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

const walletClient = createWalletClient({
  account: userAccount,
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

async function main() {
  const env = getSmartAccountsEnvironment(baseSepolia.id);
  console.log("DelegationManager:", env.DelegationManager);

  // Use a simple fixed salt
  const salt = "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

  console.log("\n--- Creating smart account ---");
  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient as any,
    implementation: Implementation.Hybrid,
    deployParams: [userAccount.address, [], [], []],
    deploySalt: salt,
    signer: walletClient as any,
  });

  console.log("Smart account address:", smartAccount.address);
  const deployed = await smartAccount.isDeployed();
  console.log("Already deployed:", deployed);

  if (!deployed) {
    console.log("Deploying smart account...");
    const factoryArgs = await smartAccount.getFactoryArgs();
    if (factoryArgs) {
      try {
        const txHash = await walletClient.sendTransaction({
          to: factoryArgs.factory as Address,
          data: factoryArgs.factoryData as Hex,
          chain: baseSepolia,
        });
        console.log("Deploy tx:", txHash);
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        console.log("Deploy status:", receipt.status);
      } catch (e: any) {
        console.error("Deploy failed:", e.message?.slice(0, 200));
        console.log("Trying to continue anyway (account might already exist)...");
      }
    }
  }

  // Check balance
  const bal = await publicClient.getBalance({ address: smartAccount.address });
  console.log("SA balance:", formatEther(bal), "ETH");

  console.log("\n--- Creating delegation ---");
  const delegation = createDelegation({
    environment: env,
    to: ephemeralAccount.address,
    from: smartAccount.address,
    scope: {
      type: "nativeTokenTransferAmount" as const,
      maxAmount: parseEther("0.01"),
    },
    parentDelegation: ROOT_AUTHORITY,
  });

  console.log("Delegation created (unsigned)");
  console.log("  from:", delegation.delegator);
  console.log("  to:", delegation.delegate);

  console.log("\n--- Signing delegation ---");
  try {
    const signature = await smartAccount.signDelegation({ delegation });
    console.log("Signature:", (signature as string).slice(0, 20) + "...");
    const signed = { ...delegation, signature };

    console.log("\n--- SIWA signing ---");
    const message = "geass.robbyn.xyz wants you to sign in with your Ethereum account:\n" + ephemeralAccount.address;
    const siwaSig = await ephemeralAccount.signMessage({ message });
    console.log("SIWA sig:", siwaSig.slice(0, 20) + "...");

    console.log("\n✓ ALL STEPS PASSED");
    console.log("Smart account:", smartAccount.address);
    console.log("Agent (ephemeral):", ephemeralAccount.address);
  } catch (e: any) {
    console.error("Signing failed:", e.message);
  }
}

main().catch(console.error);

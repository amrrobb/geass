/**
 * Deploy SpendingPolicy to Status Network Sepolia (gasless) + execute one tx.
 * Usage: npx tsx --env-file=.env scripts/deploy-status.ts
 */

import { createPublicClient, createWalletClient, http, defineChain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import fs from "fs";

const statusSepolia = defineChain({
  id: 1660990954,
  name: "Status Network Testnet",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://public.sepolia.rpc.status.network"] } },
  blockExplorers: { default: { name: "Status Explorer", url: "https://sepoliascan.status.network" } },
});

const bytecode = fs.readFileSync("contracts/SpendingPolicy.bin", "utf-8").trim() as Hex;
const abi = JSON.parse(fs.readFileSync("contracts/SpendingPolicy.abi.json", "utf-8"));

async function main() {
  const key = process.env.PRIVATE_KEY as Hex;
  if (!key) throw new Error("Set PRIVATE_KEY in .env");

  const account = privateKeyToAccount(key);
  console.log("Deployer:", account.address);

  const publicClient = createPublicClient({ chain: statusSepolia, transport: http() });
  const walletClient = createWalletClient({ account, chain: statusSepolia, transport: http() });

  const balance = await publicClient.getBalance({ address: account.address });
  console.log("Balance:", balance.toString(), "wei (gas = 0 on Status Network)\n");

  // Deploy
  const maxWei = BigInt("10000000000000000"); // 0.01 ETH
  console.log("Deploying SpendingPolicy (agent:", account.address, "max: 0.01 ETH)...");

  const deployHash = await walletClient.deployContract({
    abi,
    bytecode,
    args: [account.address, maxWei],
    gasPrice: 0n,
  });

  console.log("Deploy tx:", deployHash);
  console.log("Explorer:", `https://sepoliascan.status.network/tx/${deployHash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  console.log("Contract:", receipt.contractAddress);
  console.log("Explorer:", `https://sepoliascan.status.network/address/${receipt.contractAddress}\n`);

  // Execute one gasless tx
  console.log("Evaluating 0.005 ETH spend (should pass)...");
  const evalHash = await walletClient.writeContract({
    address: receipt.contractAddress!,
    abi,
    functionName: "evaluate",
    args: [BigInt("5000000000000000")],
    gasPrice: 0n,
  });

  console.log("Evaluate tx:", evalHash);
  console.log("Explorer:", `https://sepoliascan.status.network/tx/${evalHash}`);

  const evalReceipt = await publicClient.waitForTransactionReceipt({ hash: evalHash });
  console.log("Status:", evalReceipt.status === "success" ? "success" : "failed");

  console.log("\n=== STATUS NETWORK BOUNTY PROOF ===");
  console.log("Chain ID: 1660990954");
  console.log("Contract:", receipt.contractAddress);
  console.log("Deploy tx:", deployHash);
  console.log("Gasless tx:", evalHash);
  console.log("Gas paid: 0");
}

main().catch(console.error);

/**
 * Full end-to-end demo test — simulates all 6 demo scenes.
 * Uses PRIVATE_KEY as the "user wallet" (same as what browser would do).
 * Tests every code path that the dashboard calls.
 */

import { createWalletClient, http, parseEther, type Hex, type Address } from "viem";
import { privateKeyToAccount, generatePrivateKey } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import {
  generateEphemeralKey,
  createUserSmartAccount,
  createSpendingDelegation,
  executeWithDelegation,
  checkPolicy,
  signSiwaMessage,
  getBalance,
  publicClient,
} from "../src/lib/delegation-client";

const TEST_KEY = process.env.PRIVATE_KEY as Hex;
if (!TEST_KEY) throw new Error("Set PRIVATE_KEY in .env");

const userAccount = privateKeyToAccount(TEST_KEY);
const walletClient = createWalletClient({
  account: userAccount,
  chain: baseSepolia,
  transport: http("https://sepolia.base.org"),
});

let passed = 0;
let failed = 0;

function ok(label: string) { passed++; console.log(`  ✓ ${label}`); }
function fail(label: string, err: string) { failed++; console.error(`  ✗ ${label}: ${err}`); }

async function main() {
  console.log("=== GEASS FULL DEMO TEST ===");
  console.log("User wallet:", userAccount.address);
  console.log("");

  // ── SCENE 1: Setup ────────────────────────────────────────────────
  console.log("--- Scene 1: Setup ---");

  let ephemeral: { privateKey: Hex; address: Address };
  let delegation: any;
  let userSmartAccount: Address;

  try {
    ephemeral = generateEphemeralKey();
    ok(`Ephemeral key generated: ${ephemeral.address}`);
  } catch (e: any) {
    fail("generateEphemeralKey", e.message);
    return;
  }

  try {
    const del = await createSpendingDelegation({
      walletClient,
      agentAddress: ephemeral.address,
      maxEth: "0.01",
    });
    delegation = del.delegation;
    userSmartAccount = del.userSmartAccount as Address;
    ok(`Smart account: ${userSmartAccount}`);
    ok(`Delegation signed to: ${del.agentAddress}`);
  } catch (e: any) {
    fail("createSpendingDelegation", e.message);
    return;
  }

  const saBalance = await getBalance(userSmartAccount);
  console.log(`  Smart account balance: ${saBalance} ETH`);
  if (parseFloat(saBalance) === 0) {
    console.log("  ⚠ Smart account has 0 ETH — send scene will fail on-chain but policy check will work");
  }

  // ── SCENE 2: Send within policy (APPROVED) ────────────────────────
  console.log("\n--- Scene 2: Send 0.005 ETH (within policy) ---");

  const policyCheck1 = checkPolicy("0.005", "0.01");
  if (policyCheck1.allowed) {
    ok(`Policy check passed: ${policyCheck1.reason}`);
  } else {
    fail("Policy check", policyCheck1.reason);
  }

  // Venice reasoning (via API)
  try {
    const veniceRes = await fetch("http://localhost:3001/api/venice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: "0.005", recipient: "0xd4c894e2209a5291ab6a4e0f72f6cb385e2a91ab", policy: "0.01" }),
    });
    const venice = await veniceRes.json();
    ok(`Venice reasoning: "${venice.reasoning}" (decision: ${venice.decision}, confidence: ${venice.confidence})`);
  } catch (e: any) {
    fail("Venice API", e.message);
  }

  // On-chain execution (only if SA has funds)
  if (parseFloat(saBalance) >= 0.005) {
    try {
      // Fund ephemeral key with gas first
      const fundHash = await walletClient.sendTransaction({
        to: ephemeral.address,
        value: parseEther("0.001"),
      });
      await publicClient.waitForTransactionReceipt({ hash: fundHash });
      ok("Agent funded with 0.001 ETH gas");

      const result = await executeWithDelegation({
        agentPrivateKey: ephemeral.privateKey,
        delegation,
        to: "0xd4c894e2209a5291ab6a4e0f72f6cb385e2a91ab" as Address,
        valueEth: "0.005",
      });
      ok(`Transaction executed! Hash: ${result.txHash}`);
    } catch (e: any) {
      fail("executeWithDelegation", e.message.slice(0, 150));
    }
  } else {
    console.log("  ⏭ Skipping on-chain execution (SA balance too low)");
  }

  // ── SCENE 3: Send over policy (REJECTED) ──────────────────────────
  console.log("\n--- Scene 3: Send 0.05 ETH (over policy — should reject) ---");

  const policyCheck2 = checkPolicy("0.05", "0.01");
  if (!policyCheck2.allowed) {
    ok(`Policy correctly rejected: ${policyCheck2.reason}`);
  } else {
    fail("Policy should have rejected 0.05 ETH", "but it approved");
  }

  // ── SCENE 4: SIWA Auth ────────────────────────────────────────────
  console.log("\n--- Scene 4: SIWA Authentication ---");

  try {
    const siwa = await signSiwaMessage(ephemeral.privateKey, ephemeral.address);
    ok(`SIWA message signed by agent: ${siwa.agentAddress}`);
    ok(`Signature: ${siwa.signature.slice(0, 20)}...`);
    ok(`Nonce: ${siwa.nonce}`);
    if (siwa.message.includes(ephemeral.address)) {
      ok("Message contains agent address (not user address)");
    } else {
      fail("SIWA message", "does not contain agent address");
    }
  } catch (e: any) {
    fail("signSiwaMessage", e.message);
  }

  // ── SCENE 5: Balance check ────────────────────────────────────────
  console.log("\n--- Scene 5: Balance check ---");

  try {
    const bal = await getBalance(userSmartAccount);
    ok(`Smart account balance: ${bal} ETH`);
    const walletBal = await getBalance(userAccount.address);
    ok(`User wallet balance: ${walletBal} ETH`);
  } catch (e: any) {
    fail("getBalance", e.message);
  }

  // ── SCENE 6: Status ───────────────────────────────────────────────
  console.log("\n--- Scene 6: Status ---");

  const status = {
    setup: "complete",
    userSmartAccount,
    agentAddress: ephemeral.address,
    agentKeyType: "ephemeral (browser-only)",
    spendingPolicy: "0.01 ETH max",
    enforcement: "MetaMask Delegation Framework — NativeTokenTransferAmountEnforcer",
    chain: "Base Sepolia (84532)",
    reasoning: "Venice.ai (private, no data stored)",
    identity: "SIWA (EIP-4361)",
  };

  ok("Status object constructed");
  for (const [k, v] of Object.entries(status)) {
    console.log(`    ${k}: ${v}`);
  }

  // ── Summary ───────────────────────────────────────────────────────
  console.log("\n=== RESULTS ===");
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  if (failed === 0) {
    console.log("\n🎉 ALL DEMO SCENES PASS — ready for video recording");
  } else {
    console.log("\n❌ Some tests failed — fix before recording");
  }
}

main().catch(console.error);

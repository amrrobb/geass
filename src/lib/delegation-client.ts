/**
 * Client-side delegation logic — no server private key needed.
 * The user's MetaMask signs the delegation.
 * The agent gets an ephemeral key generated in the browser.
 */

import {
  createDelegation,
  toMetaMaskSmartAccount,
  Implementation,
  ROOT_AUTHORITY,
  getSmartAccountsEnvironment,
  contracts,
  ExecutionMode,
} from "@metamask/smart-accounts-kit";
import {
  createPublicClient,
  createWalletClient,
  http,
  parseEther,
  formatEther,
  custom,
  type Hex,
  type Address,
  type WalletClient,
} from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function getEnv() {
  return getSmartAccountsEnvironment(baseSepolia.id);
}

// ── Ephemeral Agent Key ─────────────────────────────────────────────

export function generateEphemeralKey(): { privateKey: Hex; address: Address } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  return { privateKey, address: account.address };
}

export function getEphemeralWalletClient(privateKey: Hex) {
  const account = privateKeyToAccount(privateKey);
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

// ── Smart Account (user's MetaMask signs) ───────────────────────────

export async function createUserSmartAccount(walletClient: WalletClient) {
  const address = walletClient.account?.address;
  if (!address) throw new Error("Wallet not connected");

  const saltHex = "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient as any,
    implementation: Implementation.Hybrid,
    deployParams: [address, [], [], []],
    deploySalt: saltHex,
    signer: { walletClient: walletClient as any },
  });

  // Deploy if not already on-chain
  const deployed = await smartAccount.isDeployed();
  if (!deployed) {
    const factoryArgs = await smartAccount.getFactoryArgs();
    if (factoryArgs) {
      await walletClient.sendTransaction({
        account: walletClient.account!,
        to: factoryArgs.factory as Address,
        data: factoryArgs.factoryData as Hex,
        chain: baseSepolia,
      });
    }
  }

  return smartAccount;
}

// ── Delegation: user delegates to ephemeral agent key ───────────────

export async function createSpendingDelegation(opts: {
  walletClient: WalletClient;
  agentAddress: Address;
  maxEth: string;
}) {
  const smartAccount = await createUserSmartAccount(opts.walletClient);
  const env = getEnv();
  const maxWei = parseEther(opts.maxEth);

  const delegation = createDelegation({
    environment: env,
    to: opts.agentAddress,
    from: smartAccount.address,
    scope: {
      type: "nativeTokenTransferAmount" as const,
      maxAmount: maxWei,
    },
    parentDelegation: ROOT_AUTHORITY,
  });

  const signature = await smartAccount.signDelegation({ delegation });
  const signed = { ...delegation, signature };

  return {
    delegation: signed,
    userSmartAccount: smartAccount.address,
    agentAddress: opts.agentAddress,
    maxEth: opts.maxEth,
  };
}

// ── Fund ephemeral agent with gas ───────────────────────────────────

export async function fundAgentGas(opts: {
  walletClient: WalletClient;
  agentAddress: Address;
  amountEth?: string;
}) {
  const amount = opts.amountEth || "0.001"; // 0.001 ETH for gas
  const hash = await opts.walletClient.sendTransaction({
    account: opts.walletClient.account!,
    to: opts.agentAddress,
    value: parseEther(amount),
    chain: baseSepolia,
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

// ── Agent Execution (ephemeral key redeems delegation) ──────────────

export async function executeWithDelegation(opts: {
  agentPrivateKey: Hex;
  delegation: any;
  to: Address;
  valueEth: string;
}) {
  const env = getEnv();
  const walletClient = getEphemeralWalletClient(opts.agentPrivateKey);

  const txHash = await contracts.DelegationManager.execute.redeemDelegations({
    client: walletClient,
    delegationManagerAddress: env.DelegationManager as Address,
    delegations: [[opts.delegation]],
    modes: [ExecutionMode.SingleDefault],
    executions: [[{
      target: opts.to,
      value: parseEther(opts.valueEth),
      callData: "0x" as Hex,
    }]],
  });

  return { txHash, to: opts.to, valueEth: opts.valueEth };
}

// ── Policy Check ────────────────────────────────────────────────────

export function checkPolicy(
  valueEth: string,
  maxEth: string
): { allowed: boolean; reason: string } {
  const value = parseFloat(valueEth);
  const max = parseFloat(maxEth);

  if (value > max) {
    return {
      allowed: false,
      reason: `Transaction ${valueEth} ETH exceeds spending policy of ${maxEth} ETH`,
    };
  }

  return {
    allowed: true,
    reason: `Transaction ${valueEth} ETH within spending policy of ${maxEth} ETH`,
  };
}

// ── SIWA (ephemeral key signs) ──────────────────────────────────────

export async function signSiwaMessage(agentPrivateKey: Hex, agentAddress: Address) {
  const account = privateKeyToAccount(agentPrivateKey);
  const nonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const message = [
    `geass.robbyn.xyz wants you to sign in with your Ethereum account:`,
    agentAddress,
    "",
    "Sign in to GEASS as an autonomous agent. This signature proves agent identity without revealing the principal.",
    "",
    `URI: https://geass.robbyn.xyz`,
    `Version: 1`,
    `Chain ID: 84532`,
    `Nonce: ${nonce}`,
    `Issued At: ${new Date().toISOString()}`,
  ].join("\n");

  const signature = await account.signMessage({ message });

  return { message, signature, nonce, agentAddress };
}

// ── Utilities ───────────────────────────────────────────────────────

export async function getBalance(address: Address): Promise<string> {
  const balance = await publicClient.getBalance({ address });
  return formatEther(balance);
}

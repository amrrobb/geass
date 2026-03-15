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
  type Hex,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

// ── Clients ──────────────────────────────────────────────────────────

const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || "https://sepolia.base.org";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(RPC_URL),
});

function getPrivateKey(): Hex {
  const key = process.env.PRIVATE_KEY as Hex;
  if (!key) throw new Error("PRIVATE_KEY not set in .env");
  return key;
}

function getOwnerAccount() {
  return privateKeyToAccount(getPrivateKey());
}

export function getWalletClient() {
  const account = getOwnerAccount();
  return createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
}

// ── Environment ──────────────────────────────────────────────────────

function getEnv() {
  return getSmartAccountsEnvironment(baseSepolia.id);
}

// ── Smart Account Creation ───────────────────────────────────────────

export async function createSmartAccount(salt: string = "0x0") {
  const owner = getOwnerAccount();
  const walletClient = getWalletClient();

  const saltHex = ("0x" + Buffer.from(salt).toString("hex").padStart(64, "0")) as Hex;

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient as any,
    implementation: Implementation.Hybrid,
    deployParams: [owner.address, [], [], []],
    deploySalt: saltHex,
    signer: walletClient,
  });

  // Deploy if not already on-chain
  const deployed = await smartAccount.isDeployed();
  if (!deployed) {
    const factoryArgs = await smartAccount.getFactoryArgs();
    if (factoryArgs) {
      await walletClient.sendTransaction({
        to: factoryArgs.factory as Address,
        data: factoryArgs.factoryData as Hex,
        chain: baseSepolia,
      });
    }
  }

  return smartAccount;
}

// ── Delegation with Native ETH Spending Limit ────────────────────────

export async function createSpendingDelegation(opts: {
  agentAddress: Address;
  maxEth: string;
}) {
  const userAccount = await createSmartAccount("user-0x1");
  const env = getEnv();

  const maxWei = parseEther(opts.maxEth);

  const delegation = createDelegation({
    environment: env,
    to: opts.agentAddress,
    from: userAccount.address,
    scope: {
      type: "nativeTokenTransferAmount" as const,
      maxAmount: maxWei,
    },
    parentDelegation: ROOT_AUTHORITY,
  });

  // Sign via the smart account (ERC-1271 compatible)
  const signature = await userAccount.signDelegation({ delegation });
  const signed = { ...delegation, signature };

  return {
    delegation: signed,
    userAddress: userAccount.address,
    agentAddress: opts.agentAddress,
    maxEth: opts.maxEth,
  };
}

// ── Agent Execution (redeem delegation to send ETH) ──────────────────

export async function executeWithDelegation(opts: {
  delegation: any;
  to: Address;
  valueEth: string;
}) {
  const env = getEnv();
  const walletClient = getWalletClient();

  // Use the execute helper which handles simulate + write
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

  return {
    txHash,
    to: opts.to,
    valueEth: opts.valueEth,
    enforced: true,
  };
}

// ── Check policy: will this tx pass? ─────────────────────────────────

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

// ── Utilities ────────────────────────────────────────────────────────

export async function getBalance(address: Address): Promise<string> {
  const balance = await publicClient.getBalance({ address });
  return formatEther(balance);
}

export async function getOwnerAddress(): Promise<Address> {
  return getOwnerAccount().address;
}

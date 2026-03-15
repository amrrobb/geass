import { execSync } from "child_process";

export interface VeilStatus {
  walletKey: { found: boolean };
  veilKey: { found: boolean };
  depositKey: { found: boolean };
  rpcUrl: { found: boolean; url: string };
  registration: { checked: boolean; registered?: boolean };
  relay: { checked: boolean; healthy: boolean; status: string; network: string };
}

export interface VeilBalance {
  asset: string;
  queue: string;
  private: string;
}

function runVeil(args: string): string {
  try {
    return execSync(`veil ${args}`, {
      encoding: "utf-8",
      timeout: 30_000,
      env: {
        ...process.env,
        WALLET_KEY: process.env.PRIVATE_KEY,
        RPC_URL: process.env.BASE_RPC_URL || "https://mainnet.base.org",
      },
    }).trim();
  } catch (err: any) {
    throw new Error(`Veil CLI error: ${err.stderr || err.message}`);
  }
}

export function getStatus(): VeilStatus {
  const raw = runVeil("status");
  return JSON.parse(raw);
}

export function getBalance(asset?: "eth" | "usdc"): string {
  const flag = asset ? `--pool ${asset}` : "";
  return runVeil(`balance ${flag}`);
}

export function deposit(asset: "eth" | "usdc", amount: string): string {
  return runVeil(`deposit ${asset} ${amount}`);
}

export function withdraw(
  asset: "eth" | "usdc",
  amount: string,
  recipient: string
): string {
  return runVeil(`withdraw ${asset} ${amount} ${recipient}`);
}

export function transfer(
  asset: "eth" | "usdc",
  amount: string,
  recipient: string
): string {
  return runVeil(`transfer ${asset} ${amount} ${recipient}`);
}

export function initKeypair(): string {
  return runVeil("init");
}

export function getKeypair(): string {
  return runVeil("keypair");
}

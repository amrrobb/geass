import { execSync } from "child_process";

function runBankr(args: string): string {
  try {
    return execSync(`bankr ${args}`, {
      encoding: "utf-8",
      timeout: 30_000,
      env: {
        ...process.env,
        BANKR_API_KEY: process.env.BANKR_API_KEY,
      },
    }).trim();
  } catch (err: any) {
    throw new Error(`Bankr CLI error: ${err.stderr || err.message}`);
  }
}

export function getWalletAddress(): string {
  return runBankr("wallet address");
}

export function getBalance(): string {
  return runBankr("wallet balance");
}

export function sendTransaction(prompt: string): string {
  // Bankr accepts natural language prompts
  return runBankr(`prompt "${prompt.replace(/"/g, '\\"')}"`);
}

export function getPortfolio(): string {
  return runBankr("wallet portfolio");
}

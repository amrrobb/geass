import * as delegation from "./delegation";
import * as venice from "./venice";
import * as bankr from "./bankr";
import * as siwa from "./siwa";
import * as fs from "fs";
import * as path from "path";
import type { Address } from "viem";

const STATE_FILE = path.join(process.cwd(), ".agent-state.json");

interface AgentState {
  userSmartAccount?: string;
  agentSmartAccount?: string;
  spendingLimitEth: string;
  delegation?: any;
  transactions: Array<{
    to: string;
    amount: string;
    status: "approved" | "rejected";
    reason: string;
    txHash?: string;
    timestamp: number;
  }>;
}

export interface AgentStatusResponse {
  ok: boolean;
  action: string;
  setup: string;
  userSmartAccount: string | null;
  agentSmartAccount: string | null;
  spendingPolicy: string;
  enforcement: string;
  chain: string;
  reasoning: string;
  execution: string;
  identity: string;
  txCount: number;
}

function loadState(): AgentState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
  } catch {
    return { spendingLimitEth: "0.01", transactions: [] };
  }
}

function saveState(state: AgentState) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

export type AgentCommand =
  | { type: "setup" }
  | { type: "send"; amount: string; recipient: string }
  | { type: "check-balance" }
  | { type: "status" }
  | { type: "set-policy"; maxEth: string }
  | { type: "authenticate" }
  | { type: "history" }
  | { type: "help" };

export function parseCommand(input: string): AgentCommand {
  const lower = input.toLowerCase().trim();

  const sendMatch = lower.match(
    /send\s+([\d.]+)\s+(?:eth\s+)?to\s+(0x[a-f0-9]+)/i
  );
  if (sendMatch) {
    return { type: "send", amount: sendMatch[1], recipient: sendMatch[2] };
  }

  const policyMatch = lower.match(/(?:set-?policy|policy)\s+([\d.]+)/);
  if (policyMatch) {
    return { type: "set-policy", maxEth: policyMatch[1] };
  }

  if (lower.includes("setup") || lower.includes("create") || lower.includes("init")) {
    return { type: "setup" };
  }
  if (lower.includes("auth")) return { type: "authenticate" };
  if (lower.includes("balance")) return { type: "check-balance" };
  if (lower.includes("status")) return { type: "status" };
  if (lower.includes("history") || lower.includes("log")) return { type: "history" };

  return { type: "help" };
}

export async function executeCommand(cmd: AgentCommand): Promise<string> {
  const state = loadState();

  try {
    switch (cmd.type) {
      case "setup": {
        const ownerAddress = await delegation.getOwnerAddress();
        const userAccount = await delegation.createSmartAccount("user-0x1");

        state.userSmartAccount = userAccount.address;
        state.agentSmartAccount = ownerAddress;

        const saBalance = await delegation.getBalance(userAccount.address as Address);
        const funded = parseFloat(saBalance) > 0;

        const del = await delegation.createSpendingDelegation({
          agentAddress: ownerAddress as Address,
          maxEth: state.spendingLimitEth,
        });
        state.delegation = del.delegation;
        saveState(state);

        return JSON.stringify({
          ok: true,
          action: "setup",
          message: "Agent setup complete. Delegation created with on-chain spending policy.",
          owner: ownerAddress,
          userSmartAccount: userAccount.address,
          agentAddress: ownerAddress,
          spendingPolicy: `${state.spendingLimitEth} ETH max per delegation`,
          enforcement: "On-chain via MetaMask Delegation Framework caveat enforcers",
          smartAccountFunded: funded,
          note: funded ? undefined : "Fund the smart account with ETH to enable on-chain execution",
        });
      }

      case "send": {
        if (!state.agentSmartAccount || !state.delegation) {
          return JSON.stringify({ ok: false, error: "Run 'setup' first." });
        }

        // Step 1: Check policy locally (fast fail)
        const policyCheck = delegation.checkPolicy(cmd.amount, state.spendingLimitEth);

        // Short-circuit: if policy rejects, skip Venice (saves 1-3s)
        if (!policyCheck.allowed) {
          state.transactions.push({
            to: cmd.recipient,
            amount: cmd.amount,
            status: "rejected",
            reason: policyCheck.reason,
            timestamp: Date.now(),
          });
          saveState(state);

          return JSON.stringify({
            ok: false,
            action: "send",
            error: "REJECTED — spending policy violated",
            policy: { limit: state.spendingLimitEth, enforced: "on-chain" },
            policyCheck: policyCheck.reason,
            message: "The delegation caveat enforcer would revert this on-chain. Blocked locally to save gas.",
          });
        }

        // Step 2: Venice private reasoning (only if policy passes)
        const veniceResult = await venice.evaluateTransaction({
          action: "send",
          amount: cmd.amount,
          recipient: cmd.recipient,
          policy: state.spendingLimitEth,
        });

        if (veniceResult.decision === "reject") {
          state.transactions.push({
            to: cmd.recipient,
            amount: cmd.amount,
            status: "rejected",
            reason: `Venice: ${veniceResult.reasoning}`,
            timestamp: Date.now(),
          });
          saveState(state);

          return JSON.stringify({
            ok: false,
            action: "send",
            error: "REJECTED by private reasoning engine",
            veniceReasoning: veniceResult.reasoning,
            veniceConfidence: veniceResult.confidence,
          });
        }

        // Step 3: Execute via delegation (on-chain enforcement)
        const result = await delegation.executeWithDelegation({
          delegation: state.delegation,
          to: cmd.recipient as Address,
          valueEth: cmd.amount,
        });

        state.transactions.push({
          to: cmd.recipient,
          amount: cmd.amount,
          status: "approved",
          reason: policyCheck.reason,
          txHash: result.txHash,
          timestamp: Date.now(),
        });
        saveState(state);

        return JSON.stringify({
          ok: true,
          action: "send",
          message: `Transaction approved and executed. Policy enforced on-chain.`,
          txHash: result.txHash,
          recipient: cmd.recipient,
          amount: cmd.amount,
          policy: { limit: state.spendingLimitEth, enforced: "on-chain" },
          veniceReasoning: veniceResult.reasoning,
        });
      }

      case "check-balance": {
        const ownerAddress = await delegation.getOwnerAddress();

        const [userBal, agentBal, ownerBal] = await Promise.all([
          state.userSmartAccount
            ? delegation.getBalance(state.userSmartAccount as Address)
            : Promise.resolve("N/A"),
          state.agentSmartAccount
            ? delegation.getBalance(state.agentSmartAccount as Address)
            : Promise.resolve("N/A"),
          delegation.getBalance(ownerAddress),
        ]);

        const balances: Record<string, string> = {
          owner: ownerBal,
        };
        if (state.userSmartAccount) balances.userSmartAccount = userBal;
        if (state.agentSmartAccount) balances.agentSmartAccount = agentBal;

        let bankrBalance = "";
        try { bankrBalance = bankr.getBalance(); } catch { bankrBalance = "(Bankr not configured)"; }

        return JSON.stringify({
          ok: true,
          action: "balance",
          balances,
          bankr: bankrBalance,
        });
      }

      case "status": {
        return JSON.stringify({
          ok: true,
          action: "status",
          setup: state.userSmartAccount ? "complete" : "not initialized",
          userSmartAccount: state.userSmartAccount || null,
          agentSmartAccount: state.agentSmartAccount || null,
          spendingPolicy: `${state.spendingLimitEth} ETH max`,
          enforcement: "MetaMask Delegation Framework — NativeTokenTransferAmountEnforcer",
          chain: "Base Sepolia (84532)",
          reasoning: "Venice.ai (private, no data stored)",
          execution: "Bankr CLI",
          identity: "SIWA (EIP-4361)",
          txCount: state.transactions.length,
        });
      }

      case "set-policy": {
        state.spendingLimitEth = cmd.maxEth;

        if (state.agentSmartAccount) {
          const del = await delegation.createSpendingDelegation({
            agentAddress: state.agentSmartAccount as Address,
            maxEth: cmd.maxEth,
          });
          state.delegation = del.delegation;
        }

        saveState(state);
        return JSON.stringify({
          ok: true,
          action: "set-policy",
          message: `Spending policy updated. New delegation signed with ${cmd.maxEth} ETH limit.`,
          limit: cmd.maxEth,
          enforcement: "on-chain (caveat enforcer will revert if exceeded)",
        });
      }

      case "authenticate": {
        if (!state.agentSmartAccount) {
          return JSON.stringify({ ok: false, error: "Run 'setup' first." });
        }

        const nonce = siwa.generateNonce();
        const { message, params } = siwa.createSiwaMessage(
          state.agentSmartAccount as `0x${string}`,
          nonce
        );

        // Server-side sign: proves agent identity without user's wallet
        const signature = await siwa.signSiwaMessage(message);

        return JSON.stringify({
          ok: true,
          action: "authenticate",
          message: "SIWA message signed by agent. Identity proven without revealing principal.",
          siwa: {
            message,
            signature,
            nonce,
            agentAddress: state.agentSmartAccount,
            note: "The agent signed this message with its own key. The human owner's address is never exposed.",
          },
        });
      }

      case "history": {
        return JSON.stringify({
          ok: true,
          action: "history",
          transactions: state.transactions.slice(-10),
          total: state.transactions.length,
        });
      }

      case "help":
        return JSON.stringify({
          ok: true,
          action: "help",
          commands: [
            "setup — Create smart accounts + delegation with spending policy",
            "send <amount> to <address> — Send ETH via delegated authority (policy-enforced on-chain)",
            "set-policy <maxEth> — Update spending limit (re-signs delegation)",
            "balance — Check wallet balances",
            "status — Agent status + policy info",
            "auth — Generate + sign SIWA message (prove agent identity without revealing principal)",
            "history — Recent transaction log",
          ],
        });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown agent error";
    return JSON.stringify({ ok: false, error: message });
  }
}

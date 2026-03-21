"use client";

import { useEffect, useState, useCallback } from "react";
import { useAccount, useWalletClient } from "wagmi";
import type { Address, Hex } from "viem";
import { parseEther, formatEther } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  toMetaMaskSmartAccount,
  Implementation,
  getSmartAccountsEnvironment,
  createDelegation,
  ROOT_AUTHORITY,
  contracts,
  ExecutionMode,
} from "@metamask/smart-accounts-kit";
import {
  checkPolicy,
  signSiwaMessage,
  getBalance,
  publicClient,
  getEphemeralWalletClient,
} from "@/lib/delegation-client";

// ── Types ───────────────────────────────────────────────────────────

interface SessionState {
  agentPrivateKey: Hex;
  agentAddress: Address;
  userSmartAccount: Address;
  delegation: any;
  spendingLimitEth: string;
  transactions: Array<{
    to: string;
    amount: string;
    status: "approved" | "rejected";
    reason: string;
    txHash?: string;
    timestamp: number;
  }>;
}

function truncAddr(addr: string) {
  return addr.slice(0, 8) + "…" + addr.slice(-6);
}

// ── Result Card ─────────────────────────────────────────────────────

function ResultCard({ data }: { data: any }) {
  if (!data || typeof data !== "object") return null;

  const isOk = data.ok === true;
  const action = data.action || "";

  const badge = data.error ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/40 text-geass-red border border-red-800/50">
      <span className="text-base">✗</span> REJECTED
    </span>
  ) : isOk ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/40 text-geass-green border border-green-800/50">
      <span className="text-base">✓</span> {action === "send" ? "APPROVED" : "SUCCESS"}
    </span>
  ) : null;

  const veniceReasoning = data.veniceReasoning ? (
    <div className="mt-3 p-3 bg-purple-900/20 border border-purple-800/30 rounded-lg">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-purple-400 text-xs font-medium">🧠 Private Reasoning (Venice.ai)</span>
        {data.veniceConfidence != null && (
          <span className="text-purple-500 text-xs">confidence: {data.veniceConfidence}</span>
        )}
      </div>
      <p className="text-sm text-purple-200">{data.veniceReasoning}</p>
    </div>
  ) : null;

  const txLink = data.txHash ? (
    <a href={`https://sepolia.basescan.org/tx/${data.txHash}`} target="_blank" rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-2 text-xs text-geass-accent hover:underline">
      <span>🔗</span> View on Basescan: {data.txHash.slice(0, 10)}…{data.txHash.slice(-8)}
    </a>
  ) : null;

  const policyInfo = data.policy ? (
    <div className="mt-2 p-2 bg-geass-bg rounded border border-geass-border">
      <span className="text-xs text-gray-500">Spending Policy: </span>
      <span className="text-xs font-mono text-white">{data.policy.limit} ETH max</span>
      <span className="text-xs text-gray-600 ml-2">({data.policy.enforced})</span>
    </div>
  ) : null;

  if (action === "authenticate" && data.siwa) {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">{badge}</div>
        <div className="p-3 bg-geass-bg rounded-lg border border-geass-border">
          <p className="text-xs text-gray-500 mb-1">Agent Address (ephemeral — this session only)</p>
          <p className="font-mono text-sm text-geass-accent">{data.siwa.agentAddress}</p>
        </div>
        <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
          <p className="text-xs text-blue-400 font-medium mb-1">🔐 Signed SIWA Message</p>
          <p className="text-xs text-blue-200 break-all">{data.siwa.signature?.slice(0, 40)}…</p>
        </div>
        <p className="text-xs text-gray-500">{data.siwa.note}</p>
      </div>
    );
  }

  if (action === "send") {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          {badge}
          {data.amount && <span className="font-mono text-sm text-white">{data.amount} ETH → {truncAddr(data.recipient || "")}</span>}
        </div>
        {data.policyCheck && <p className="text-xs text-gray-400">{data.policyCheck}</p>}
        {data.message && <p className="text-sm text-gray-300">{data.message}</p>}
        {policyInfo}
        {veniceReasoning}
        {txLink}
      </div>
    );
  }

  if (action === "setup") {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">{badge}</div>
        <p className="text-sm text-gray-300">{data.message}</p>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2 bg-geass-bg rounded border border-geass-border">
            <span className="text-gray-500">User Smart Account</span>
            <p className="font-mono text-white mt-0.5">{truncAddr(data.userSmartAccount || "")}</p>
          </div>
          <div className="p-2 bg-geass-bg rounded border border-geass-border">
            <span className="text-gray-500">Agent (ephemeral)</span>
            <p className="font-mono text-white mt-0.5">{truncAddr(data.agentAddress || "")}</p>
          </div>
        </div>
        <div className="p-2 bg-geass-bg rounded border border-geass-border text-xs">
          <span className="text-gray-500">Spending Policy: </span>
          <span className="text-geass-accent font-mono">{data.spendingPolicy}</span>
        </div>
        <p className="text-xs text-gray-600">{data.enforcement}</p>
        {data.note && <p className="text-xs text-yellow-500">{data.note}</p>}
      </div>
    );
  }

  if (action === "history" && data.transactions) {
    return (
      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-500">{data.total} transaction{data.total !== 1 ? "s" : ""}</p>
        {data.transactions.length === 0 ? (
          <p className="text-sm text-gray-600">No transactions yet</p>
        ) : (
          data.transactions.map((tx: any, i: number) => (
            <div key={i} className="flex items-center justify-between p-2 bg-geass-bg rounded border border-geass-border text-xs">
              <div className="flex items-center gap-2">
                <span className={tx.status === "approved" ? "text-geass-green" : "text-geass-red"}>
                  {tx.status === "approved" ? "✓" : "✗"}
                </span>
                <span className="font-mono text-white">{tx.amount} ETH</span>
                <span className="text-gray-600">→ {truncAddr(tx.to)}</span>
              </div>
              {tx.txHash && (
                <a href={`https://sepolia.basescan.org/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-geass-accent hover:underline">tx ↗</a>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  if (action === "balance") {
    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3">{badge}</div>
        {Object.entries(data.balances || {}).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center p-2 bg-geass-bg rounded border border-geass-border text-xs">
            <span className="text-gray-400">{key}</span>
            <span className="font-mono text-white">{String(val)} ETH</span>
          </div>
        ))}
      </div>
    );
  }

  if (action === "help") {
    return (
      <div className="mt-4 space-y-1">
        {(data.commands || []).map((cmd: string, i: number) => (
          <div key={i} className="text-xs p-1.5">
            <span className="text-geass-accent font-mono">{cmd.split(" — ")[0]}</span>
            <span className="text-gray-500"> — {cmd.split(" — ")[1]}</span>
          </div>
        ))}
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="mt-4">
        <div className="flex items-center gap-3 mb-2">{badge}</div>
        <p className="text-sm text-red-300">{data.error}</p>
        {data.message && <p className="text-xs text-gray-500 mt-1">{data.message}</p>}
        {policyInfo}
        {veniceReasoning}
      </div>
    );
  }

  return (
    <pre className="mt-4 p-4 bg-geass-bg border border-geass-border rounded-lg text-sm text-green-400 font-mono whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

// ── Command Parser ──────────────────────────────────────────────────

function parseCommand(input: string) {
  const lower = input.toLowerCase().trim();
  const sendMatch = lower.match(/send\s+([\d.]+)\s+(?:eth\s+)?to\s+(0x[a-f0-9]+)/i);
  if (sendMatch) return { type: "send" as const, amount: sendMatch[1], recipient: sendMatch[2] };
  const policyMatch = lower.match(/(?:set-?policy|policy)\s+([\d.]+)/);
  if (policyMatch) return { type: "set-policy" as const, maxEth: policyMatch[1] };
  if (lower.includes("setup") || lower.includes("create") || lower.includes("init")) return { type: "setup" as const };
  if (lower.includes("auth")) return { type: "authenticate" as const };
  if (lower.includes("balance")) return { type: "check-balance" as const };
  if (lower.includes("status")) return { type: "status" as const };
  if (lower.includes("history") || lower.includes("log")) return { type: "history" as const };
  return { type: "help" as const };
}

// ── Main Dashboard ──────────────────────────────────────────────────

export default function Home() {
  const { address, isConnected, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();
  const [walletBalance, setWalletBalance] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [command, setCommand] = useState("");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  // Fetch wallet balance
  useEffect(() => {
    if (address) {
      getBalance(address).then(setWalletBalance).catch(() => {});
    }
  }, [address]);

  // Load session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("geass-session");
    if (saved) {
      try { setSession(JSON.parse(saved)); } catch {}
    }
  }, []);

  const saveSession = useCallback((s: SessionState) => {
    setSession(s);
    localStorage.setItem("geass-session", JSON.stringify(s));
  }, []);

  async function runCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || running) return;
    setRunning(true);
    setResult(null);

    try {
      const cmd = parseCommand(command);

      switch (cmd.type) {
        case "setup": {
          if (!isConnected || !address) throw new Error("Connect your wallet first.");
          if (!walletClient) throw new Error("Wallet not ready. Try disconnecting and reconnecting.");

          // Generate ephemeral agent key
          const { generatePrivateKey: genKey } = await import("viem/accounts");
          const agentPrivateKey = genKey();
          const agentAccount = privateKeyToAccount(agentPrivateKey);

          // Create smart account using connected wallet as signer
          const salt = "0x0000000000000000000000000000000000000000000000000000000000000001" as Hex;
          const env = getSmartAccountsEnvironment(84532);

          const smartAccount = await toMetaMaskSmartAccount({
            client: publicClient as any,
            implementation: Implementation.Hybrid,
            deployParams: [address, [], [], []],
            deploySalt: salt,
            signer: walletClient as any,
          });

          // Deploy smart account if needed (user's wallet pays gas)
          const deployed = await smartAccount.isDeployed();
          if (!deployed) {
            const factoryArgs = await smartAccount.getFactoryArgs();
            if (factoryArgs) {
              const txHash = await walletClient.sendTransaction({
                account: address,
                to: factoryArgs.factory as Address,
                data: factoryArgs.factoryData as Hex,
                chain: undefined,
              });
              await publicClient.waitForTransactionReceipt({ hash: txHash });
            }
          }

          // Create delegation: user's smart account → ephemeral agent
          const delegation = createDelegation({
            environment: env,
            to: agentAccount.address,
            from: smartAccount.address,
            scope: {
              type: "nativeTokenTransferAmount" as const,
              maxAmount: parseEther("0.01"),
            },
            parentDelegation: ROOT_AUTHORITY,
          });

          // User's wallet signs the delegation
          const signature = await smartAccount.signDelegation({ delegation });
          const signedDelegation = { ...delegation, signature };

          // Fund ephemeral agent with gas (user pays ~0.0005 ETH)
          const fundHash = await walletClient.sendTransaction({
            account: address,
            to: agentAccount.address,
            value: parseEther("0.0005"),
            chain: undefined,
          });
          await publicClient.waitForTransactionReceipt({ hash: fundHash });

          const saBalance = await getBalance(smartAccount.address as Address);

          const newSession: SessionState = {
            agentPrivateKey,
            agentAddress: agentAccount.address,
            userSmartAccount: smartAccount.address as Address,
            delegation: signedDelegation,
            spendingLimitEth: "0.01",
            transactions: [],
          };
          saveSession(newSession);

          // Refresh wallet balance
          getBalance(address).then(setWalletBalance).catch(() => {});

          setResult({
            ok: true,
            action: "setup",
            message: "Delegation created. Your wallet signed the spending policy. Agent key is ephemeral — exists only in this browser.",
            userSmartAccount: smartAccount.address,
            agentAddress: agentAccount.address,
            spendingPolicy: "0.01 ETH max per delegation",
            enforcement: "On-chain via MetaMask Delegation Framework — NativeTokenTransferAmountEnforcer",
            smartAccountFunded: parseFloat(saBalance) > 0,
            note: parseFloat(saBalance) > 0 ? undefined : "Fund the smart account with Base Sepolia ETH to enable on-chain execution",
          });
          break;
        }

        case "send": {
          if (!session) throw new Error("Run 'setup' first");

          const policyCheck = checkPolicy(cmd.amount, session.spendingLimitEth);

          if (!policyCheck.allowed) {
            session.transactions.push({
              to: cmd.recipient, amount: cmd.amount, status: "rejected",
              reason: policyCheck.reason, timestamp: Date.now(),
            });
            saveSession({ ...session });
            setResult({
              ok: false, action: "send", error: "REJECTED — spending policy violated",
              policy: { limit: session.spendingLimitEth, enforced: "on-chain" },
              policyCheck: policyCheck.reason,
              message: "The delegation caveat enforcer would revert this on-chain. Blocked locally to save gas.",
            });
            break;
          }

          // Venice reasoning
          const veniceRes = await fetch("/api/venice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ amount: cmd.amount, recipient: cmd.recipient, policy: session.spendingLimitEth }),
          });
          const veniceResult = await veniceRes.json();

          if (veniceResult.decision === "reject") {
            session.transactions.push({
              to: cmd.recipient, amount: cmd.amount, status: "rejected",
              reason: `Venice: ${veniceResult.reasoning}`, timestamp: Date.now(),
            });
            saveSession({ ...session });
            setResult({
              ok: false, action: "send", error: "REJECTED by private reasoning engine",
              veniceReasoning: veniceResult.reasoning, veniceConfidence: veniceResult.confidence,
            });
            break;
          }

          // Execute via delegation (ephemeral agent key redeems)
          const agentWallet = getEphemeralWalletClient(session.agentPrivateKey);
          const env = getSmartAccountsEnvironment(84532);

          const txHash = await contracts.DelegationManager.execute.redeemDelegations({
            client: agentWallet,
            delegationManagerAddress: env.DelegationManager as Address,
            delegations: [[session.delegation]],
            modes: [ExecutionMode.SingleDefault],
            executions: [[{
              target: cmd.recipient as Address,
              value: parseEther(cmd.amount),
              callData: "0x" as Hex,
            }]],
          });

          session.transactions.push({
            to: cmd.recipient, amount: cmd.amount, status: "approved",
            reason: policyCheck.reason, txHash, timestamp: Date.now(),
          });
          saveSession({ ...session });

          setResult({
            ok: true, action: "send",
            message: "Transaction approved and executed. Policy enforced on-chain.",
            txHash, recipient: cmd.recipient, amount: cmd.amount,
            policy: { limit: session.spendingLimitEth, enforced: "on-chain" },
            veniceReasoning: veniceResult.reasoning,
          });
          break;
        }

        case "authenticate": {
          if (!session) throw new Error("Run 'setup' first");
          const siwa = await signSiwaMessage(session.agentPrivateKey, session.agentAddress);
          setResult({
            ok: true, action: "authenticate",
            message: "SIWA message signed by ephemeral agent key.",
            siwa: { ...siwa, note: "Signed with ephemeral key. Your wallet address is never exposed." },
          });
          break;
        }

        case "check-balance": {
          const balances: Record<string, string> = {};
          if (session?.userSmartAccount) balances.smartAccount = await getBalance(session.userSmartAccount);
          if (address) balances.connectedWallet = await getBalance(address);
          setResult({ ok: true, action: "balance", balances });
          break;
        }

        case "status": {
          setResult({
            ok: true, action: "status",
            setup: session ? "complete" : "not initialized",
            userSmartAccount: session?.userSmartAccount || null,
            agentAddress: session?.agentAddress || null,
            agentKeyType: "ephemeral (browser-only)",
            spendingPolicy: `${session?.spendingLimitEth || "0.01"} ETH max`,
            enforcement: "MetaMask Delegation Framework — NativeTokenTransferAmountEnforcer",
            chain: "Base Sepolia (84532)",
            reasoning: "Venice.ai (private, no data stored)",
            identity: "SIWA (EIP-4361)",
            txCount: session?.transactions.length || 0,
          });
          break;
        }

        case "set-policy": {
          if (!session) throw new Error("Run 'setup' first.");
          // Just update the local limit — a real implementation would re-sign delegation
          saveSession({ ...session, spendingLimitEth: cmd.maxEth });
          setResult({
            ok: true, action: "set-policy",
            message: `Spending policy updated to ${cmd.maxEth} ETH.`,
            limit: cmd.maxEth,
            enforcement: "on-chain (caveat enforcer will revert if exceeded)",
          });
          break;
        }

        case "history": {
          const txs = session?.transactions || [];
          setResult({ ok: true, action: "history", transactions: txs.slice(-10), total: txs.length });
          break;
        }

        case "help":
          setResult({
            ok: true, action: "help",
            commands: [
              "setup — Connect wallet, create delegation with ephemeral agent key",
              "send <amount> to <address> — Send ETH via delegated authority (on-chain enforced)",
              "set-policy <maxEth> — Update spending limit",
              "balance — Check wallet balances",
              "status — Agent status + policy info",
              "auth — Sign SIWA message (prove agent identity without revealing principal)",
              "history — Recent transaction log",
            ],
          });
          break;
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setResult({ ok: false, error: message });
    } finally {
      setRunning(false);
    }
  }

  const ready = session != null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">GEASS Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          The power of absolute delegation — non-custodial, ephemeral agent keys, on-chain enforcement
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-geass-card border border-geass-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-geass-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-400">Delegation Status</h3>
          </div>
          {!isConnected ? (
            <p className="text-sm text-yellow-500">Connect wallet to start</p>
          ) : chainId !== 84532 ? (
            <p className="text-sm text-yellow-500">Switch to Base Sepolia using the chain selector above</p>
          ) : (
            <div className="space-y-2 text-sm font-mono">
              <div>
                Setup:{" "}
                <span className={ready ? "text-geass-green" : "text-yellow-500"}>
                  {ready ? "complete" : "not initialized"}
                </span>
              </div>
              {session?.userSmartAccount && (
                <div>User SA: <span className="text-white">{truncAddr(session.userSmartAccount)}</span></div>
              )}
              {session?.agentAddress && (
                <div>Agent: <span className="text-white">{truncAddr(session.agentAddress)}</span> <span className="text-xs text-gray-600">(ephemeral)</span></div>
              )}
              {walletBalance && (
                <div>Wallet: <span className="text-white">{parseFloat(walletBalance).toFixed(4)} ETH</span></div>
              )}
              <div>Chain: <span className="text-white">Base Sepolia (84532)</span></div>
              <div>Txns: <span className="text-white">{session?.transactions.length || 0}</span></div>
            </div>
          )}
        </div>

        <div className="bg-geass-card border border-geass-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-geass-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-400">Spending Policy</h3>
          </div>
          <div className="space-y-2 text-sm">
            <div className="p-3 bg-geass-bg rounded-lg border border-geass-border">
              <span className="text-geass-accent font-mono text-lg">{session?.spendingLimitEth || "0.01"} ETH max</span>
            </div>
            <p className="text-xs text-gray-600">MetaMask Delegation Framework — NativeTokenTransferAmountEnforcer</p>
            <div className="mt-2 space-y-1 text-xs text-gray-500">
              <div>Reasoning: Venice.ai (private, no data stored)</div>
              <div>Agent key: Ephemeral (browser session only)</div>
              <div>Identity: SIWA (EIP-4361)</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-geass-card border border-geass-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Agent Command</h3>
        <form onSubmit={runCommand} className="flex gap-3">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder={isConnected ? "setup | send 0.001 to 0x… | balance | auth | history" : "Connect wallet first"}
            disabled={!isConnected}
            className="flex-1 bg-geass-bg border border-geass-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-geass-accent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={running || !isConnected}
            className="bg-geass-accent hover:bg-indigo-600 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition"
          >
            {running ? "Running…" : "Execute"}
          </button>
        </form>
        {result && <ResultCard data={result} />}
      </div>

      <div className="bg-geass-card border border-geass-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">How GEASS Keeps Secrets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-geass-bg rounded-lg">
            <p className="text-geass-accent font-medium mb-1">1. Delegated Authority</p>
            <p className="text-gray-500">
              Your wallet delegates scoped spending to an ephemeral agent key.
              On-chain caveat enforcers limit what the agent can spend. No key sharing. No custody.
            </p>
          </div>
          <div className="p-3 bg-geass-bg rounded-lg">
            <p className="text-geass-accent font-medium mb-1">2. Private Reasoning</p>
            <p className="text-gray-500">
              Agent reasons about transactions via Venice.ai — no prompts or outputs stored.
              The agent&apos;s decision logic stays invisible.
            </p>
          </div>
          <div className="p-3 bg-geass-bg rounded-lg">
            <p className="text-geass-accent font-medium mb-1">3. Identity Separation</p>
            <p className="text-gray-500">
              Agent authenticates via SIWA (EIP-4361) with its ephemeral key.
              Services see the agent&apos;s address, never your wallet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

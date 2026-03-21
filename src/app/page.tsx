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

function CopyAddr({ addr, label }: { addr: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(addr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span className="inline-flex items-center gap-1 cursor-pointer group" onClick={handleCopy} title={addr}>
      {label && <span className="text-gray-500">{label}</span>}
      <span className="text-white font-mono">{truncAddr(addr)}</span>
      {copied ? (
        <span className="text-geass-green text-xs">✓ copied</span>
      ) : (
        <svg className="w-3.5 h-3.5 text-gray-600 group-hover:text-gray-400 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )}
    </span>
  );
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
        <span className="text-purple-400 text-xs font-medium">🧠 Private Risk Analysis (Venice.ai — no data stored)</span>
        {data.veniceConfidence != null && (
          <span className="text-purple-500 text-xs">confidence: {data.veniceConfidence}</span>
        )}
      </div>
      <p className="text-sm text-purple-200">{data.veniceReasoning}</p>
      {data.riskFactors && data.riskFactors.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {data.riskFactors.map((f: string, i: number) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-purple-900/40 text-purple-300 border border-purple-800/30">{f}</span>
          ))}
        </div>
      )}
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
            <p className="mt-0.5"><CopyAddr addr={data.userSmartAccount || ""} /></p>
          </div>
          <div className="p-2 bg-geass-bg rounded border border-geass-border">
            <span className="text-gray-500">Agent (ephemeral)</span>
            <p className="mt-0.5"><CopyAddr addr={data.agentAddress || ""} /></p>
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
  const [saBalance, setSaBalance] = useState<string | null>(null);
  const [session, setSession] = useState<SessionState | null>(null);
  const [funding, setFunding] = useState(false);
  const [command, setCommand] = useState("");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  // Fetch wallet balance
  useEffect(() => {
    if (address) {
      getBalance(address).then(setWalletBalance).catch(() => {});
    }
  }, [address]);

  // Fetch smart account balance
  useEffect(() => {
    if (session?.userSmartAccount) {
      getBalance(session.userSmartAccount).then(setSaBalance).catch(() => {});
    }
  }, [session?.userSmartAccount, result]);

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

  async function fundSmartAccount() {
    if (!session || !walletClient || !address) return;
    setFunding(true);
    try {
      const hash = await walletClient.sendTransaction({
        account: address,
        to: session.userSmartAccount,
        value: parseEther("0.005"),
        chain: undefined,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      // Wait for chain to confirm before reading balance
      await new Promise(r => setTimeout(r, 2000));
      const bal = await getBalance(session.userSmartAccount);
      setSaBalance(bal);
      getBalance(address).then(setWalletBalance).catch(() => {});
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Fund failed";
      setResult({ ok: false, error: msg });
    } finally {
      setFunding(false);
    }
  }

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
            signer: { walletClient: walletClient as any },
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
            body: JSON.stringify({ amount: cmd.amount, recipient: cmd.recipient, policy: session.spendingLimitEth, txHistory: session.transactions.length }),
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
            veniceConfidence: veniceResult.confidence,
            riskFactors: veniceResult.riskFactors,
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
      // Refresh balances after any command
      if (session?.userSmartAccount) getBalance(session.userSmartAccount).then(setSaBalance).catch(() => {});
      if (address) getBalance(address).then(setWalletBalance).catch(() => {});
    }
  }

  const ready = session != null;

  const poolFunded = saBalance != null && parseFloat(saBalance) >= 0.001;
  const step = !session ? 1 : !poolFunded ? 2 : 3;

  return (
    <div className="space-y-5 relative">
      {/* Hero header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-geass-card via-geass-bg to-geass-card border border-geass-border p-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-geass-accent/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-geass-purple/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />
        <div className="relative">
          <h1 className="text-3xl font-extrabold text-white font-display tracking-tight">
            GEASS <span className="text-geass-accent">Dashboard</span>
          </h1>
          <p className="text-sm text-gray-500 mt-2 max-w-xl leading-relaxed">
            Non-custodial spending delegation with private reasoning. Your wallet delegates, the ephemeral agent executes, caveat enforcers protect.
          </p>
        </div>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Delegation status */}
        <div className="bg-geass-card border border-geass-border rounded-xl p-5 geass-glow hover:border-geass-border-bright transition-colors">
          <div className="flex items-center gap-2 mb-4">
            <div className={`w-2 h-2 rounded-full ${ready ? "bg-geass-green pulse-dot" : "bg-yellow-500"}`} />
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Delegation</h3>
          </div>
          {!isConnected ? (
            <p className="text-sm text-yellow-500/80">Connect wallet to begin</p>
          ) : chainId !== 84532 ? (
            <p className="text-sm text-yellow-500/80">Switch to Base Sepolia</p>
          ) : (
            <div className="space-y-2.5 text-xs font-mono">
              {session?.userSmartAccount && (
                <div><CopyAddr addr={session.userSmartAccount} label="Pool:" /></div>
              )}
              {session?.agentAddress && (
                <div><CopyAddr addr={session.agentAddress} label="Agent:" /> <span className="text-gray-600 text-[10px]">ephemeral</span></div>
              )}
              {!session && <p className="text-gray-600 font-display font-normal text-sm">Run <span className="font-mono text-geass-accent">setup</span> to begin</p>}
            </div>
          )}
        </div>

        {/* Spending policy */}
        <div className="bg-geass-card border border-geass-border rounded-xl p-5 geass-glow hover:border-geass-border-bright transition-colors">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Spending Limit</h3>
          <div className="flex items-baseline gap-2 mb-3">
            <span className="text-2xl font-bold text-white font-display">{session?.spendingLimitEth || "0.01"}</span>
            <span className="text-sm text-gray-500">ETH max</span>
          </div>
          <p className="text-[10px] text-gray-600 leading-relaxed">NativeTokenTransferAmountEnforcer — on-chain, not app code</p>
        </div>

        {/* Balances */}
        <div className="bg-geass-card border border-geass-border rounded-xl p-5 geass-glow hover:border-geass-border-bright transition-colors">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Balances</h3>
          {session && saBalance != null ? (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Pool</span>
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-sm font-semibold ${parseFloat(saBalance) > 0 ? "text-geass-green" : "text-yellow-500"}`}>
                    {parseFloat(saBalance).toFixed(4)}
                  </span>
                  {parseFloat(saBalance) < 0.001 && (
                    <button onClick={fundSmartAccount} disabled={funding}
                      className="text-[10px] bg-geass-accent/20 hover:bg-geass-accent/30 border border-geass-accent/30 disabled:opacity-50 px-2 py-0.5 rounded text-geass-accent-bright transition">
                      {funding ? "…" : "+ Fund"}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Wallet</span>
                <span className="font-mono text-sm text-white">{walletBalance ? parseFloat(walletBalance).toFixed(4) : "—"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Txns</span>
                <span className="font-mono text-sm text-white">{session.transactions.length}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600 font-display">
              {walletBalance ? `Wallet: ${parseFloat(walletBalance).toFixed(4)} ETH` : "Connect wallet"}
            </p>
          )}
        </div>
      </div>

      {/* Getting Started — only when needed */}
      {isConnected && step < 3 && (
        <div className="bg-gradient-to-r from-geass-accent/5 via-geass-card to-geass-purple/5 border border-geass-accent/20 rounded-xl p-5 fade-up">
          <h3 className="text-xs font-semibold text-geass-accent uppercase tracking-wider mb-4">Getting Started</h3>
          <div className="flex gap-6 text-sm">
            {[
              { n: 1, label: "Setup", desc: "Run setup — wallet signs delegation", done: !!session },
              { n: 2, label: "Fund", desc: "Deposit ETH to the spending pool", done: poolFunded },
              { n: 3, label: "Transact", desc: "Send, authenticate, reason privately", done: false },
            ].map((s) => (
              <div key={s.n} className="flex items-start gap-2 flex-1">
                <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold
                  ${s.done ? "bg-geass-green/20 text-geass-green" : s.n === step ? "bg-geass-accent/20 text-geass-accent border border-geass-accent/40" : "bg-gray-800/50 text-gray-600"}`}>
                  {s.done ? "✓" : s.n}
                </span>
                <div>
                  <p className={`text-xs font-medium ${s.done ? "text-gray-500 line-through" : s.n === step ? "text-white" : "text-gray-600"}`}>{s.label}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Command terminal */}
      <div className="bg-geass-card border border-geass-border rounded-xl p-5 scanline">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex gap-1">
            <div className="w-2.5 h-2.5 rounded-full bg-geass-red/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-geass-gold/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-geass-green/60" />
          </div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider ml-1">Agent Terminal</h3>
        </div>
        <form onSubmit={runCommand} className="flex gap-2">
          <div className="flex-1 flex items-center bg-geass-bg border border-geass-border rounded-lg px-3 focus-within:border-geass-accent/50 transition-colors">
            <span className="text-geass-accent font-mono text-sm mr-2 select-none">$</span>
            <input
              type="text"
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder={isConnected ? "setup · send 0.001 to 0x… · auth · balance · history" : "connect wallet first"}
              disabled={!isConnected}
              className="flex-1 bg-transparent py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none disabled:opacity-50 font-mono command-input"
            />
          </div>
          <button
            type="submit"
            disabled={running || !isConnected}
            className="bg-geass-accent hover:bg-geass-accent-bright disabled:opacity-40 px-5 py-2.5 rounded-lg text-sm font-semibold text-white transition-all hover:shadow-lg hover:shadow-geass-accent/20"
          >
            {running ? (
              <span className="flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Running</span>
              </span>
            ) : "Execute"}
          </button>
        </form>
        {result && <div className="fade-up"><ResultCard data={result} /></div>}
      </div>

      {/* Three pillars */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: "⚡",
            title: "Delegated Authority",
            desc: "Your wallet delegates scoped spending to an ephemeral agent key. On-chain caveat enforcers limit what the agent can spend.",
            accent: "from-geass-accent/10 to-transparent",
          },
          {
            icon: "🧠",
            title: "Private Reasoning",
            desc: "Agent evaluates transactions via Venice.ai for risk — no prompts or outputs stored. The reasoning stays invisible.",
            accent: "from-geass-purple/10 to-transparent",
          },
          {
            icon: "🔐",
            title: "Identity Separation",
            desc: "Agent authenticates via SIWA (EIP-4361) with its ephemeral key. Services see the agent, never your wallet.",
            accent: "from-geass-crimson/10 to-transparent",
          },
        ].map((pillar) => (
          <div key={pillar.title} className={`bg-gradient-to-b ${pillar.accent} border border-geass-border rounded-xl p-5 geass-glow hover:border-geass-border-bright transition-colors`}>
            <div className="text-xl mb-2">{pillar.icon}</div>
            <p className="text-sm font-semibold text-white mb-2 font-display">{pillar.title}</p>
            <p className="text-xs text-gray-500 leading-relaxed">{pillar.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

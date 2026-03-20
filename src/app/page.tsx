"use client";

import { useEffect, useState } from "react";

interface AgentStatus {
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

function truncAddr(addr: string) {
  return addr.slice(0, 8) + "…" + addr.slice(-6);
}

function ResultCard({ data }: { data: any }) {
  if (!data || typeof data !== "object") return null;

  const isOk = data.ok === true;
  const action = data.action || "";

  // Status badge
  const badge = data.error ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-red-900/40 text-geass-red border border-red-800/50">
      <span className="text-base">✗</span> REJECTED
    </span>
  ) : isOk ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-900/40 text-geass-green border border-green-800/50">
      <span className="text-base">✓</span> {action === "send" ? "APPROVED" : "SUCCESS"}
    </span>
  ) : null;

  // Venice reasoning card
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

  // Tx hash link
  const txLink = data.txHash ? (
    <a
      href={`https://sepolia.basescan.org/tx/${data.txHash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 mt-2 text-xs text-geass-accent hover:underline"
    >
      <span>🔗</span> View on Basescan: {data.txHash.slice(0, 10)}…{data.txHash.slice(-8)}
    </a>
  ) : null;

  // Policy info
  const policyInfo = data.policy ? (
    <div className="mt-2 p-2 bg-geass-bg rounded border border-geass-border">
      <span className="text-xs text-gray-500">Spending Policy: </span>
      <span className="text-xs font-mono text-white">{data.policy.limit} ETH max</span>
      <span className="text-xs text-gray-600 ml-2">({data.policy.enforced})</span>
    </div>
  ) : null;

  // SIWA auth result
  if (action === "authenticate" && data.siwa) {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center gap-3">{badge}</div>
        <div className="p-3 bg-geass-bg rounded-lg border border-geass-border">
          <p className="text-xs text-gray-500 mb-1">Agent Address (SIWA identity)</p>
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

  // Send result (approved or rejected)
  if (action === "send") {
    return (
      <div className="mt-4 space-y-3">
        <div className="flex items-center justify-between">
          {badge}
          {data.amount && (
            <span className="font-mono text-sm text-white">{data.amount} ETH → {truncAddr(data.recipient || "")}</span>
          )}
        </div>
        {data.policyCheck && (
          <p className="text-xs text-gray-400">{data.policyCheck}</p>
        )}
        {data.message && (
          <p className="text-sm text-gray-300">{data.message}</p>
        )}
        {policyInfo}
        {veniceReasoning}
        {txLink}
      </div>
    );
  }

  // Setup result
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
            <span className="text-gray-500">Agent</span>
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

  // Balance result
  if (action === "balance" && data.balances) {
    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3">{badge}</div>
        {Object.entries(data.balances).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center p-2 bg-geass-bg rounded border border-geass-border text-xs">
            <span className="text-gray-400">{key}</span>
            <span className="font-mono text-white">{String(val)} ETH</span>
          </div>
        ))}
      </div>
    );
  }

  // History result
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
                <a href={`https://sepolia.basescan.org/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className="text-geass-accent hover:underline">
                  tx ↗
                </a>
              )}
            </div>
          ))
        )}
      </div>
    );
  }

  // Help result
  if (action === "help" && data.commands) {
    return (
      <div className="mt-4 space-y-1">
        {data.commands.map((cmd: string, i: number) => (
          <div key={i} className="text-xs p-1.5 rounded">
            <span className="text-geass-accent font-mono">{cmd.split(" — ")[0]}</span>
            <span className="text-gray-500"> — {cmd.split(" — ")[1]}</span>
          </div>
        ))}
      </div>
    );
  }

  // Status result
  if (action === "status") {
    return (
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-3">{badge}</div>
        {Object.entries(data).filter(([k]) => !["ok", "action"].includes(k)).map(([key, val]) => (
          <div key={key} className="flex justify-between items-center text-xs py-1 border-b border-geass-border/50">
            <span className="text-gray-500">{key}</span>
            <span className="font-mono text-white">{String(val)}</span>
          </div>
        ))}
      </div>
    );
  }

  // Error fallback
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

  // Generic fallback — pretty JSON
  return (
    <pre className="mt-4 p-4 bg-geass-bg border border-geass-border rounded-lg text-sm text-green-400 font-mono whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}

export default function Home() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [result, setResult] = useState<any>(null);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    fetch("/api/agent/status")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setStatus(data);
      })
      .catch(() => setError("Agent unreachable"));
  }, []);

  async function runCommand(e: React.FormEvent) {
    e.preventDefault();
    if (!command.trim() || running) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const json = await res.json();
      setResult(json);
      fetch("/api/agent/status").then((r) => r.json()).then(setStatus).catch(() => {});
    } catch (err: any) {
      setResult({ ok: false, error: err.message });
    } finally {
      setRunning(false);
    }
  }

  const ready = status?.setup === "complete";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">GEASS Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          The power of absolute delegation — scoped spending via MetaMask Delegation Framework
        </p>
      </div>

      {/* Status cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Delegation card */}
        <div className="bg-geass-card border border-geass-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-geass-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-400">Delegation Status</h3>
          </div>
          {error ? (
            <p className="text-sm text-red-400">{error}</p>
          ) : status ? (
            <div className="space-y-2 text-sm font-mono">
              <div>
                Setup:{" "}
                <span className={ready ? "text-geass-green" : "text-yellow-500"}>
                  {status.setup}
                </span>
              </div>
              {status.userSmartAccount && (
                <div>
                  User SA: <span className="text-white">{truncAddr(status.userSmartAccount)}</span>
                </div>
              )}
              {status.agentSmartAccount && (
                <div>
                  Agent: <span className="text-white">{truncAddr(status.agentSmartAccount)}</span>
                </div>
              )}
              <div>
                Chain: <span className="text-white">{status.chain}</span>
              </div>
              <div>
                Txns: <span className="text-white">{status.txCount}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Loading…</p>
          )}
        </div>

        {/* Spending policy card */}
        <div className="bg-geass-card border border-geass-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-5 h-5 text-geass-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <h3 className="text-sm font-medium text-gray-400">Spending Policy</h3>
          </div>
          {status ? (
            <div className="space-y-2 text-sm">
              <div className="p-3 bg-geass-bg rounded-lg border border-geass-border">
                <span className="text-geass-accent font-mono text-lg">{status.spendingPolicy}</span>
              </div>
              <p className="text-xs text-gray-600">{status.enforcement}</p>
              <div className="mt-2 space-y-1 text-xs text-gray-500">
                <div>Reasoning: {status.reasoning}</div>
                <div>Execution: {status.execution}</div>
                <div>Identity: {status.identity}</div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-600">Loading…</p>
          )}
        </div>
      </div>

      {/* Command input */}
      <div className="bg-geass-card border border-geass-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Agent Command</h3>
        <form onSubmit={runCommand} className="flex gap-3">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder="setup | send 0.005 to 0x… | balance | auth | history"
            className="flex-1 bg-geass-bg border border-geass-border rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-geass-accent"
          />
          <button
            type="submit"
            disabled={running}
            className="bg-geass-accent hover:bg-indigo-600 disabled:opacity-50 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition"
          >
            {running ? "Running…" : "Execute"}
          </button>
        </form>

        {result && <ResultCard data={result} />}
      </div>

      {/* How it works */}
      <div className="bg-geass-card border border-geass-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">How GEASS Keeps Secrets</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="p-3 bg-geass-bg rounded-lg">
            <p className="text-geass-accent font-medium mb-1">1. Delegated Authority</p>
            <p className="text-gray-500">
              User delegates scoped spending to the agent via MetaMask Delegation Framework.
              On-chain caveat enforcers limit what the agent can spend.
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
              Agent authenticates via SIWA (EIP-4361). Services see the agent&apos;s address,
              never the human principal&apos;s.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

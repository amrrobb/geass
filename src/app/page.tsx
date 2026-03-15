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

export default function Home() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [command, setCommand] = useState("");
  const [output, setOutput] = useState("");
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
    setOutput("");
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const json = await res.json();
      setOutput(JSON.stringify(json, null, 2));
      fetch("/api/agent/status").then((r) => r.json()).then(setStatus).catch(() => {});
    } catch (err: any) {
      setOutput(`Error: ${err.message}`);
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

        {output && (
          <pre className="mt-4 p-4 bg-geass-bg border border-geass-border rounded-lg text-sm text-green-400 font-mono whitespace-pre-wrap overflow-x-auto max-h-64 overflow-y-auto">
            {output}
          </pre>
        )}
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

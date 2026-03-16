"use client";

import { useAccount } from "wagmi";
import { useState, useEffect } from "react";

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

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [policyInput, setPolicyInput] = useState("");
  const [policyMsg, setPolicyMsg] = useState("");

  useEffect(() => {
    fetch("/api/agent/status")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setAgentStatus(data);
      })
      .catch(() => {});
  }, []);

  async function updatePolicy() {
    if (!policyInput) return;
    const res = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: `set-policy ${policyInput}` }),
    });
    const json = await res.json();
    setPolicyMsg(json.ok ? `Policy updated to ${policyInput} ETH` : json.error);
    fetch("/api/agent/status")
      .then((r) => r.json())
      .then((data) => { if (!data.error) setAgentStatus(data); })
      .catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Delegation info, spending policy, and agent identity</p>
      </div>

      {/* Connected Wallet */}
      <div className="bg-geass-card border border-geass-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Connected Wallet</h3>
        {isConnected ? (
          <p className="font-mono text-sm text-white">{address}</p>
        ) : (
          <p className="text-sm text-gray-600">No wallet connected</p>
        )}
      </div>

      {/* Delegation Info */}
      <div className="bg-geass-card border border-geass-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Delegation Info</h3>
        <p className="text-xs text-gray-600 mb-4">
          Spending authority delegated via MetaMask Delegation Framework with on-chain caveat enforcers.
        </p>
        {agentStatus ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Setup</span>
              <p className={`font-mono ${agentStatus.setup === "complete" ? "text-geass-green" : "text-yellow-500"}`}>
                {agentStatus.setup}
              </p>
            </div>
            <div>
              <span className="text-gray-500">Chain</span>
              <p className="font-mono text-white">{agentStatus.chain}</p>
            </div>
            {agentStatus.userSmartAccount && (
              <div>
                <span className="text-gray-500">User Smart Account</span>
                <p className="font-mono text-white text-xs">{truncAddr(agentStatus.userSmartAccount)}</p>
              </div>
            )}
            {agentStatus.agentSmartAccount && (
              <div>
                <span className="text-gray-500">Agent Address</span>
                <p className="font-mono text-white text-xs">{truncAddr(agentStatus.agentSmartAccount)}</p>
              </div>
            )}
            <div className="col-span-2">
              <span className="text-gray-500">Enforcement</span>
              <p className="font-mono text-white text-xs">{agentStatus.enforcement}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Loading agent status…</p>
        )}
      </div>

      {/* Spending Policy */}
      <div className="bg-geass-card border border-geass-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Spending Policy</h3>
        <p className="text-xs text-gray-600 mb-4">
          Enforced on-chain via MetaMask Delegation Framework — NativeTokenTransferAmountEnforcer.
          The caveat enforcer reverts any transaction exceeding the limit.
        </p>
        {agentStatus && (
          <p className="text-sm text-white mb-3">
            Current: <span className="text-geass-accent font-mono">{agentStatus.spendingPolicy}</span>
          </p>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={policyInput}
            onChange={(e) => setPolicyInput(e.target.value)}
            placeholder="0.05"
            className="bg-geass-bg border border-geass-border rounded-lg px-3 py-2 text-sm text-white w-32 focus:outline-none focus:border-geass-accent"
          />
          <button
            onClick={updatePolicy}
            className="bg-geass-accent hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm text-white transition"
          >
            Update Limit
          </button>
        </div>
        {policyMsg && <p className="text-xs text-geass-green mt-2">{policyMsg}</p>}
      </div>

      {/* Agent Identity */}
      <div className="bg-geass-card border border-geass-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Agent Identity (SIWA)</h3>
        <p className="text-xs text-gray-600 mb-4">
          The agent authenticates via SIWA (EIP-4361) using its own key — the human principal is never revealed.
          Use the <span className="text-geass-accent font-mono">auth</span> command from the Dashboard to demonstrate.
        </p>
        {agentStatus && (
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-gray-500">Reasoning: </span>
              <span className="text-white">{agentStatus.reasoning}</span>
            </div>
            <div>
              <span className="text-gray-500">Execution: </span>
              <span className="text-white">{agentStatus.execution}</span>
            </div>
            <div>
              <span className="text-gray-500">Identity: </span>
              <span className="text-white">{agentStatus.identity}</span>
            </div>
            <div>
              <span className="text-gray-500">Transactions: </span>
              <span className="text-white">{agentStatus.txCount}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

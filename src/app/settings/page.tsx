"use client";

import { useAccount, useSignMessage } from "wagmi";
import { useState, useEffect } from "react";
import { createSiwaMessage, generateNonce } from "@/lib/siwa";

export default function SettingsPage() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [siwaStatus, setSiwaStatus] = useState<"idle" | "signing" | "verified" | "failed">("idle");
  const [agentStatus, setAgentStatus] = useState<any>(null);
  const [policyInput, setPolicyInput] = useState("");
  const [policyMsg, setPolicyMsg] = useState("");

  useEffect(() => {
    fetch("/api/agent/status")
      .then((r) => r.json())
      .then(setAgentStatus)
      .catch(() => {});
  }, []);

  async function handleSiwaSignIn() {
    if (!address) return;
    setSiwaStatus("signing");
    try {
      const nonce = generateNonce();
      const { message } = createSiwaMessage(address, nonce);
      const signature = await signMessageAsync({ message });

      const res = await fetch("/api/auth/siwa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, signature, address }),
      });
      const json = await res.json();
      setSiwaStatus(json.valid ? "verified" : "failed");
    } catch {
      setSiwaStatus("failed");
    }
  }

  async function updatePolicy() {
    if (!policyInput) return;
    const res = await fetch("/api/agent/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ command: `set-policy ${policyInput}` }),
    });
    const json = await res.json();
    setPolicyMsg(json.ok ? `Policy updated to ${policyInput} ETH` : json.error);
    fetch("/api/agent/status").then((r) => r.json()).then(setAgentStatus).catch(() => {});
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Agent identity, authentication, and spending policy</p>
      </div>

      {/* Wallet */}
      <div className="bg-aegis-card border border-aegis-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Connected Wallet</h3>
        {isConnected ? (
          <p className="font-mono text-sm text-white">{address}</p>
        ) : (
          <p className="text-sm text-gray-600">No wallet connected</p>
        )}
      </div>

      {/* SIWA */}
      <div className="bg-aegis-card border border-aegis-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Sign-In With Agent (SIWA)</h3>
        <p className="text-xs text-gray-600 mb-4">
          EIP-4361 authentication — proves agent identity without revealing the principal.
        </p>
        {siwaStatus === "verified" ? (
          <div className="flex items-center gap-2 text-aegis-green text-sm">
            <span>&#10003;</span> Agent authenticated
          </div>
        ) : (
          <button
            onClick={handleSiwaSignIn}
            disabled={!isConnected || siwaStatus === "signing"}
            className="bg-aegis-accent hover:bg-indigo-600 disabled:opacity-50 px-4 py-2 rounded-lg text-sm text-white transition"
          >
            {siwaStatus === "signing" ? "Signing..." : "Sign In as Agent"}
          </button>
        )}
        {siwaStatus === "failed" && (
          <p className="text-xs text-aegis-red mt-2">Verification failed. Try again.</p>
        )}
      </div>

      {/* Spending Policy */}
      <div className="bg-aegis-card border border-aegis-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Spending Policy</h3>
        <p className="text-xs text-gray-600 mb-4">
          Enforced inside Lit TEE — the PKP key only signs transactions within this limit.
        </p>
        {agentStatus && (
          <p className="text-sm text-white mb-3">
            Current: <span className="text-aegis-accent font-mono">{agentStatus.spendingPolicy}</span>
          </p>
        )}
        <div className="flex gap-3">
          <input
            type="text"
            value={policyInput}
            onChange={(e) => setPolicyInput(e.target.value)}
            placeholder="0.05"
            className="bg-aegis-bg border border-aegis-border rounded-lg px-3 py-2 text-sm text-white w-32 focus:outline-none focus:border-aegis-accent"
          />
          <button
            onClick={updatePolicy}
            className="bg-aegis-accent hover:bg-indigo-600 px-4 py-2 rounded-lg text-sm text-white transition"
          >
            Update Limit
          </button>
        </div>
        {policyMsg && <p className="text-xs text-aegis-green mt-2">{policyMsg}</p>}
      </div>

      {/* Agent Identity (ERC-8004) */}
      <div className="bg-aegis-card border border-aegis-border rounded-xl p-6">
        <h3 className="text-sm font-medium text-gray-400 mb-3">Agent Identity (ERC-8004)</h3>
        <p className="text-xs text-gray-600 mb-4">
          The agent carries its own on-chain identity via PKP. The human principal is never linked.
        </p>
        {agentStatus ? (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">PKP Wallet</span>
              <p className="font-mono text-white">{agentStatus.pkpWallet}</p>
            </div>
            <div>
              <span className="text-gray-500">Lit Network</span>
              <p className="font-mono text-white">{agentStatus.litNetwork}</p>
            </div>
            <div>
              <span className="text-gray-500">Chain</span>
              <p className="font-mono text-white">{agentStatus.chain}</p>
            </div>
            <div>
              <span className="text-gray-500">Key Isolation</span>
              <p className="font-mono text-white text-xs">{agentStatus.keyIsolation}</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-600">Loading agent status...</p>
        )}
      </div>
    </div>
  );
}

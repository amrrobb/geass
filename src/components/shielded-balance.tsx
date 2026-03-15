"use client";

import { useEffect, useState } from "react";

interface BalanceData {
  balance: string;
  error?: string;
}

export function ShieldedBalance() {
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  async function fetchBalance() {
    try {
      const res = await fetch("/api/agent/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: "balance" }),
      });
      const json = await res.json();
      setData({ balance: json.result || "N/A" });
    } catch {
      setData({ balance: "N/A", error: "Failed to fetch" });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchBalance();
    const interval = setInterval(fetchBalance, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-geass-card border border-geass-border rounded-xl p-6">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-5 h-5 text-geass-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <h3 className="text-sm font-medium text-gray-400">Shielded Balance</h3>
      </div>
      {loading ? (
        <div className="animate-pulse h-8 bg-geass-border rounded w-32" />
      ) : (
        <pre className="text-sm text-white whitespace-pre-wrap font-mono">
          {data?.balance}
        </pre>
      )}
      {data?.error && (
        <p className="text-xs text-geass-red mt-2">{data.error}</p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

interface Transaction {
  to: string;
  amount: string;
  status: "approved" | "rejected";
  reason: string;
  txHash?: string;
  timestamp: number;
}

function truncAddr(addr: string) {
  return addr.slice(0, 8) + "…" + addr.slice(-6);
}

export default function TransactionsPage() {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("geass-session");
      if (saved) {
        const session = JSON.parse(saved);
        setTxs(session.transactions || []);
        setTotal(session.transactions?.length || 0);
      }
    } catch {}
    setLoading(false);
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Policy-Enforced Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every transaction is enforced on-chain via MetaMask Delegation Framework caveat enforcers
        </p>
      </div>

      {loading ? (
        <p className="text-sm text-gray-600">Loading…</p>
      ) : txs.length === 0 ? (
        <div className="bg-geass-card border border-geass-border rounded-xl p-6 text-center">
          <p className="text-sm text-gray-500">No transactions yet — run a command from the Dashboard</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-gray-600">{total} total transaction{total !== 1 ? "s" : ""}</p>
          {txs.map((tx, i) => (
            <div
              key={`${tx.timestamp}-${i}`}
              className="bg-geass-card border border-geass-border rounded-xl p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm text-gray-500">
                  {new Date(tx.timestamp).toLocaleString()}
                </span>
                <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                  tx.status === "approved"
                    ? "bg-green-900/30 text-geass-green"
                    : "bg-red-900/30 text-geass-red"
                }`}>
                  {tx.status === "approved" ? "Approved" : "Rejected"}
                </span>
              </div>

              <div className="grid grid-cols-3 items-center gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Amount</p>
                  <p className="font-mono text-sm text-white">{tx.amount} ETH</p>
                </div>

                <div className="flex flex-col items-center">
                  {tx.status === "approved" ? (
                    <>
                      <div className="text-geass-green text-2xl font-bold">&#10003;</div>
                      <p className="text-xs text-geass-green font-medium">Policy Passed</p>
                    </>
                  ) : (
                    <>
                      <div className="text-geass-red text-2xl font-bold">&#10007;</div>
                      <p className="text-xs text-geass-red font-medium">Policy Blocked</p>
                    </>
                  )}
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500 mb-1">Recipient</p>
                  <p className="font-mono text-sm text-white">{truncAddr(tx.to)}</p>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-geass-border text-xs text-gray-600">
                <p>{tx.reason}</p>
                {tx.txHash && (
                  <a
                    href={`https://sepolia.basescan.org/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-geass-accent hover:underline mt-1 inline-block"
                  >
                    View on Basescan →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

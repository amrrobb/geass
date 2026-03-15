"use client";

import { useState } from "react";

interface PolicyTx {
  id: string;
  recipient: string;
  amount: string;
  policyResult: "approved" | "rejected";
  policyLimit: string;
  timestamp: string;
  keySource: string;
}

const DEMO_TXS: PolicyTx[] = [
  {
    id: "1",
    recipient: "0xd4c8...91ab",
    amount: "0.005",
    policyResult: "approved",
    policyLimit: "0.01",
    timestamp: new Date().toISOString(),
    keySource: "Lit TEE (MPC-split)",
  },
  {
    id: "2",
    recipient: "0x7a25...3f1e",
    amount: "0.05",
    policyResult: "rejected",
    policyLimit: "0.01",
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    keySource: "Lit TEE (MPC-split)",
  },
];

export default function TransactionsPage() {
  const [txs] = useState<PolicyTx[]>(DEMO_TXS);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Policy-Enforced Transactions</h1>
        <p className="text-sm text-gray-500 mt-1">
          Every transaction is signed inside Lit TEE only if it passes the spending policy
        </p>
      </div>

      <div className="space-y-4">
        {txs.map((tx) => (
          <div
            key={tx.id}
            className="bg-geass-card border border-geass-border rounded-xl p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-500">
                {new Date(tx.timestamp).toLocaleString()}
              </span>
              <span className={`text-sm font-medium px-2 py-0.5 rounded ${
                tx.policyResult === "approved"
                  ? "bg-green-900/30 text-geass-green"
                  : "bg-red-900/30 text-geass-red"
              }`}>
                {tx.policyResult === "approved" ? "Signed" : "Rejected"}
              </span>
            </div>

            <div className="grid grid-cols-3 items-center gap-4">
              {/* Amount */}
              <div>
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="font-mono text-sm text-white">{tx.amount} ETH</p>
              </div>

              {/* Policy check */}
              <div className="flex flex-col items-center">
                {tx.policyResult === "approved" ? (
                  <>
                    <div className="text-geass-green text-2xl font-bold">&#10003;</div>
                    <p className="text-xs text-geass-green font-medium">Within Policy</p>
                  </>
                ) : (
                  <>
                    <div className="text-geass-red text-2xl font-bold">&#10007;</div>
                    <p className="text-xs text-geass-red font-medium">Exceeds Limit</p>
                  </>
                )}
                <p className="text-[10px] text-gray-600 mt-1">
                  Limit: {tx.policyLimit} ETH
                </p>
              </div>

              {/* Recipient */}
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Recipient</p>
                <p className="font-mono text-sm text-white">{tx.recipient}</p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-geass-border flex items-center gap-2">
              <svg className="w-4 h-4 text-geass-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <span className="text-xs text-gray-600">
                Key source: {tx.keySource} — private key never exists in one place
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

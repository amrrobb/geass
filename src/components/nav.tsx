"use client";

import Link from "next/link";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function Nav() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav className="border-b border-aegis-border bg-aegis-card/50 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold text-white tracking-tight">
            Aegis
          </Link>
          <div className="flex gap-4 text-sm text-gray-400">
            <Link href="/" className="hover:text-white transition">Dashboard</Link>
            <Link href="/transactions" className="hover:text-white transition">Transactions</Link>
            <Link href="/settings" className="hover:text-white transition">Settings</Link>
          </div>
        </div>
        <div>
          {isConnected ? (
            <button
              onClick={() => disconnect()}
              className="text-sm bg-aegis-border hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="text-sm bg-aegis-accent hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition text-white"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

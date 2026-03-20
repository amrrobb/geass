"use client";

import Link from "next/link";
import Image from "next/image";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";

export function Nav() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  return (
    <nav className="border-b border-geass-border bg-geass-card/50 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold text-white tracking-tight">
            <Image src="/logo.png" alt="GEASS" width={28} height={28} className="rounded-sm" />
            GEASS
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
              className="text-sm bg-geass-border hover:bg-gray-700 px-3 py-1.5 rounded-lg transition"
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </button>
          ) : (
            <button
              onClick={() => connect({ connector: injected() })}
              className="text-sm bg-geass-accent hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition text-white"
            >
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}

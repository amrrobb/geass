"use client";

import Link from "next/link";
import Image from "next/image";
import { ConnectButton } from "@rainbow-me/rainbowkit";

export function Nav() {
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
        <ConnectButton chainStatus="icon" showBalance={false} accountStatus="address" />
      </div>
    </nav>
  );
}

---
title: "feat: Aegis — Financial Privacy Agent on Base"
type: feat
status: active
date: 2026-03-12
---

## Overview

**Pitch**: "Every other agent project shows what the agent DID. Aegis shows what it DIDN'T reveal."

Aegis is a financial privacy agent on Base. You instruct it to pay, DCA, or send funds — it executes via Veil Cash ZK proofs so the human's on-chain identity is never linked to the output transaction. The agent carries its own ERC-8004 identity and authenticates via SIWA, but the principal stays invisible.

**Hackathon**: Synthesis — deadline **Mar 22, 2026** | Mid-feedback: Mar 18 (must have deployed demo)

## Problem Statement

Agents leak metadata. Every on-chain action an agent takes — payments, swaps, subscriptions — is publicly attributable to the human who funded it. Spending patterns, contact lists, preferences, and financial habits are all exposed. Existing privacy tools require manual workflow; agents have no native privacy primitive.

## Proposed Solution

Three tools, one clean narrative:
1. **Veil Cash** — ZK proofs break the on-chain sender↔receiver link (ETH + USDC pools on Base mainnet)
2. **Bankr** — agent wallet provisioning + DeFi execution
3. **SIWA** — agent authenticates to services without leaking its principal's identity

The agent holds its own ERC-8004 identity. The human is never on-chain.

## Risk Analysis

| Risk | Severity | Mitigation |
|---|---|---|
| Veil is mainnet-only | High | Real ETH needed for demo — budget 0.05 ETH minimum |
| Veil SDK install broken | High | Use Veil CLI (`veil` binary) via `child_process.exec`, not npm package |
| Veil compliance queue for deposits | Medium | Test deposit early (Day 1) — queue can delay 10–30 min |
| Bankr OAuth flow requires interactive browser | Medium | Complete `bankr login` manually on Day 1, store API key in .env |
| Relay goes down | Low | Check `veil status` daily; relay was healthy Mar 12 |

**Pivot if Veil fails**: "Agents that pay" — Bankr wallet + Ampersend spending limits. Agent executes payments with enforced budget caps. Less novel, still demo-able.

## Veil Contracts (Base Mainnet)

- Veil Entry: `0xc2535c547B64b997A4BD9202E1663deaF11c78a5`
- ETH Pool: `0x293dCda114533FF8f477271c5cA517209FFDEEe7`
- USDC Pool: `0x5c50d58E49C59d112680c187De2Bf989d2a91242`

---

## Phase 1: Agent Core (Days 1–3)

### 1.1 — Fund wallet + Veil init
```bash
veil init        # generates Veil keypair → ~/.veil/
veil register    # registers on-chain (costs gas, Base mainnet)
veil status      # acceptance: registered: true, relay healthy
```
**Acceptance**: `veil status` shows registered keypair and healthy relay.

### 1.2 — Test Veil deposit + withdraw
```bash
veil deposit 0.01
veil balance                              # ~0.01 ETH shielded
veil withdraw 0.005 --to <fresh_address>  # no on-chain link
```
**Acceptance**: Withdrawal address has no link to deposit address on basescan.org.

### 1.3 — Install Bankr + get API key
```bash
npm i -g @bankr/cli && bankr login && bankr whoami
```
Add `BANKR_API_KEY` to `.env`. **Acceptance**: `bankr whoami` returns authenticated user.

### 1.4 — Wire SIWA auth (`src/lib/siwa.ts`)
- `createSiwaMessage(address, nonce)` — EIP-4361 message
- `verifySiwaSignature(message, signature)` → `{ address, valid }`

**Acceptance**: Unit test signs + verifies → `valid: true`.

### 1.5 — Smoke test agent commands
```bash
npx tsx agent/index.ts status
npx tsx agent/index.ts deposit 0.001
npx tsx agent/index.ts balance
npx tsx agent/index.ts withdraw 0.0005 --to <address>
```
**Acceptance**: All four return structured JSON, no unhandled errors.

---

## Phase 2: Dashboard (Days 4–6)

### 2.1 — Next.js setup
Install `wagmi viem @tanstack/react-query`. Add `WagmiProvider` + `QueryClientProvider` in `layout.tsx`. Base mainnet config in `src/lib/wagmi.ts`.
**Acceptance**: `npm run dev` starts without errors.

### 2.2 — Home page (`src/app/page.tsx`)
1. Agent status card — `GET /api/agent/status` → relay health + registered address
2. Command input — `POST /api/agent/run { command }` → streams result
3. Wagmi connect wallet button

### 2.3 — API routes (`src/app/api/`)
- **`/api/agent/status`**: runs `agent/index.ts status`, returns `{ relay, address, registered }`
- **`/api/agent/run`**: validates allowlist `[status, deposit, withdraw, balance, history]`, spawns agent, returns stdout
- **`/api/auth/siwa`**: verifies signature, sets session cookie

**Acceptance**: `curl localhost:3000/api/agent/status` returns valid JSON.

### 2.4 — Transactions page (`src/app/transactions/page.tsx`)
Two columns: "From" address | red ✗ "No on-chain link" | "To" address. Link each tx to basescan.org.

### 2.5 — Settings page (`src/app/settings/page.tsx`)
Connected wallet, Veil registered address, Bankr user ID, SIWA sign-in button + session.

### 2.6 — Shielded balance card
Calls `veil balance` via `/api/agent/run`, displays with lock icon, refreshes every 30s.

---

## Phase 3: Polish + Submit (Days 7–10)

### 3.1 — Error handling: wrap all `exec` calls, return `{ error }` on failure, user-friendly dashboard messages.
### 3.2 — ERC-8004 identity display in Settings. "Register Identity" CTA if unregistered.
### 3.3 — README: 1-sentence hook, problem/solution/how-it-works, ASCII arch diagram, 5-command quickstart.
### 3.4 — Demo video (2 min): deposit from A → `withdraw --to B` on dashboard → basescan shows no A↔B link → SIWA auth in settings.
### 3.5 — Submit: public GitHub repo, form with title/description/repo/video/stack. **Deadline: Mar 22, 2026**.

---

## File Map

```
aegis/
├── agent/index.ts                     # command parser
├── src/
│   ├── lib/
│   │   ├── veil.ts                    # Veil CLI wrapper
│   │   ├── bankr.ts                   # Bankr CLI wrapper
│   │   ├── siwa.ts                    # SIWA auth helpers (Phase 1.4)
│   │   └── wagmi.ts                   # wagmi Base mainnet config (Phase 2.1)
│   └── app/
│       ├── layout.tsx                 # wagmi providers
│       ├── page.tsx                   # Home: status + command input
│       ├── transactions/page.tsx      # TX history with privacy visual
│       ├── settings/page.tsx          # Wallet + SIWA + ERC-8004
│       └── api/
│           ├── agent/status/route.ts
│           ├── agent/run/route.ts
│           └── auth/siwa/route.ts
├── .env                               # secrets (never commit)
└── docs/BUILD_PLAN.md
```

## Environment Variables

```bash
PRIVATE_KEY=              # Base mainnet wallet private key
WALLET_ADDRESS=           # derived address
BANKR_API_KEY=            # from `bankr login`
NEXT_PUBLIC_RPC_URL=      # e.g. https://mainnet.base.org
NEXT_PUBLIC_CHAIN_ID=8453
SYNTHESIS_API_KEY=        # hackathon API key
```

# GEASS — The Power of Absolute Delegation

> "Every other agent project shows you what the agent DID. GEASS shows you what the agent DIDN'T reveal."

**Live demo:** [geass.robbyn.xyz](https://geass.robbyn.xyz)

## Problem

**Meet Alice.** She wants an AI agent to manage her DeFi portfolio. Three things keep her up at night:

1. **No spending boundary** — She gives the agent her private key. The agent has full access to her wallet. One bug, one exploit, and everything is gone.
2. **No private thinking** — The agent calls an LLM to reason about her transactions. The LLM provider logs every prompt. Now her financial strategy is in someone else's database.
3. **No identity separation** — Every service the agent authenticates to sees Alice's wallet address. Her on-chain identity is fully exposed to every counterparty.

**With GEASS:**
- **Scoped delegation** — Alice delegates only what she approves (e.g., 0.01 ETH max) to an ephemeral agent key. The key is generated in her browser, never leaves it, and is gone when she closes the tab.
- **Private reasoning** — Venice.ai runs inference without storing prompts or outputs. The agent thinks, but nobody else sees what it thought.
- **Identity separation** — SIWA authenticates the agent to services using the ephemeral key. Services see the agent, never Alice.

## Solution

GEASS is a financial privacy agent on Base Sepolia. Spending authority is **delegated via MetaMask Delegation Framework** with on-chain caveat enforcers that limit what the agent can spend. The agent reasons privately via **Venice.ai** (no data stored), executes DeFi via **Bankr**, and authenticates via **SIWA (EIP-4361)** without leaking its principal's identity.

**Three secrets the agent keeps:**
1. **What it thinks** — Venice.ai reasoning is private (no prompts/outputs stored)
2. **Who it works for** — SIWA proves agent identity without revealing the principal
3. **What it can't do** — on-chain caveat enforcers silently block unauthorized transactions

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Dashboard                  │
│       (Next.js — command + policy UI)       │
└────────────────────┬────────────────────────┘
                     │ API (direct import, async)
┌────────────────────▼────────────────────────┐
│               GEASS Agent                   │
│  (command parser + policy-enforced execution)│
└───┬──────────┬──────────┬──────────┬────────┘
    │          │          │          │
┌───▼────┐ ┌──▼───┐ ┌───▼────┐ ┌──▼──────┐
│MetaMask│ │Venice│ │ Bankr  │ │  SIWA   │
│Deleg.  │ │ .ai  │ │ (DeFi) │ │  Auth   │
│Framework│ │(LLM) │ │        │ │(EIP4361)│
└───┬────┘ └──────┘ └───┬────┘ └─────────┘
    │                    │
    ▼                    ▼
┌─────────────────────────────────────────────┐
│            Base Sepolia (84532)              │
│  Smart Accounts + Delegation Enforcers      │
└─────────────────────────────────────────────┘
```

## How It Works

1. User connects **MetaMask** and delegates scoped spending to an **ephemeral agent key generated in the browser**
2. **NativeTokenTransferAmountEnforcer** limits ETH per delegation on-chain
3. Agent checks policy locally (fast fail), then reasons via **Venice.ai** privately (server only proxies the API call)
4. If approved, the **ephemeral key redeems the delegation client-side** — enforced on-chain
5. If rejected, the caveat enforcer **reverts** — no transaction, no gas wasted
6. Agent authenticates via **SIWA** using the ephemeral key — proves identity without revealing the principal

## Non-Custodial by Design

GEASS never holds your keys. The architecture is deliberately zero-custody:

- **Agent key is ephemeral** — generated per-session in the browser via `crypto.getRandomValues()`. It never touches a server.
- **User signs delegation with MetaMask** — the user's wallet authorizes scoped spending to the ephemeral key. No server-side `PRIVATE_KEY`.
- **Delegation redemption is client-side** — the ephemeral key signs and submits transactions directly from the browser.
- **SIWA is signed with the ephemeral key** — authentication happens in the browser, never leaves it.
- **Venice reasoning is the only server-side call** — the Next.js API route proxies the Venice API key so it isn't exposed to the browser.
- **State lives in localStorage** — delegation details, transaction history, session data. No server filesystem.
- **Close the tab, the agent key is gone** — zero residual trust. No key to steal, no session to hijack, no cleanup needed.

## Demo Script (2 minutes)

```bash
# 1. Setup — create smart accounts + delegation
> setup

# 2. Send within policy — APPROVED
> send 0.005 to 0xd4c8...91ab

# 3. Send over policy — REJECTED by caveat enforcer
> send 0.05 to 0xd4c8...91ab

# 4. Show Venice reasoning (private — no data stored)
# (reasoning appears in send output)

# 5. Show SIWA auth — agent signs, not the user
> auth

# 6. "Where is the spending authority?"
# → On-chain. Auditable. Revocable.
> status
```

## Quickstart

```bash
git clone https://github.com/amrrobb/geass && cd geass
cp .env.example .env    # fill in VENICE_API_KEY (no private key needed)
npm install
npm run dev             # http://localhost:3000
```

## Agent CLI

```bash
npm run agent -- setup                    # create smart accounts + delegation
npm run agent -- status                   # check delegation + policy info
npm run agent -- send 0.005 to 0xABC      # send within policy (approved)
npm run agent -- send 0.05 to 0xABC       # REJECTED — exceeds policy
npm run agent -- set-policy 0.02          # update spending limit
npm run agent -- auth                     # generate + sign SIWA message
npm run agent -- balance                  # check wallet balances
npm run agent -- history                  # recent transaction log
```

## Tech Stack

| Tool | Role |
|------|------|
| **MetaMask Delegation Framework** | Scoped spending delegation with on-chain caveat enforcers |
| **Venice.ai** | Private reasoning engine — no prompts/outputs stored |
| **Bankr** | Agent wallet + DeFi execution |
| **SIWA (EIP-4361)** | Agent authentication without revealing principal |
| **viem** | All chain interaction |
| **Next.js 14** | Dashboard + API routes |
| **Base Sepolia** | Testnet deployment (chain 84532) |

## What Makes This Different

- **Non-custodial**: No server holds user keys or agent keys. The agent key is ephemeral, browser-only, and gone when you close the tab.
- **No key sharing**: The user never gives the agent a private key. MetaMask signs a delegation; the agent gets scoped authority, not key access.
- **On-chain policy enforcement**: Spending limits enforced by smart contract caveat enforcers, not app code
- **Private cognition**: Venice.ai runs inference without storing prompts or outputs
- **Identity separation**: The agent authenticates via SIWA with the ephemeral key — services see the agent's address, never the principal's
- **Not a wrapper**: The agent reasons about transactions privately, then executes via delegated authority with on-chain enforcement

## Key Addresses (Base Sepolia)

| Contract | Address |
|----------|---------|
| User Smart Account | `0x58f5b2fBd6442480448D05d555F4E30959cb7e48` |
| Agent Smart Account | `0x8deFc5Ab971023D4be5be430B660EAafbbc07EC5` |
| DelegationManager | `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3` |
| NativeTokenTransferAmountEnforcer | `0xF71af580b9c3078fbc2BBF16FbB8EEd82b330320` |

## Project Structure

```
geass/
├── agent/index.ts              # CLI entry point (re-exports from src/lib/agent)
├── src/
│   ├── lib/
│   │   ├── agent.ts            # Agent core — command parser + executor
│   │   ├── delegation.ts       # MetaMask Delegation Framework wrapper
│   │   ├── venice.ts           # Venice.ai private reasoning
│   │   ├── bankr.ts            # Bankr CLI wrapper
│   │   ├── siwa.ts             # SIWA auth (EIP-4361) + server-side signing
│   │   └── wagmi.ts            # Wagmi config (Base Sepolia)
│   ├── components/
│   │   └── nav.tsx             # Navigation + wallet connect
│   └── app/
│       ├── page.tsx            # Dashboard — status + command input
│       ├── transactions/       # Real transaction history (policy-enforced)
│       ├── settings/           # Delegation info + spending policy
│       └── api/                # Agent status, run, auth routes
├── Dockerfile                  # Multi-stage build for Coolify/Docker
└── docs/                       # Plans + build docs
```

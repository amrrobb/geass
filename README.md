# GEASS — The Power of Absolute Delegation

Every other agent project shows what the agent DID. GEASS shows what it DIDN'T reveal.

## Problem

Agents leak metadata. Every on-chain action — payments, swaps, subscriptions — is publicly attributable to the human who funded the agent. The agent's private key sits in a `.env` file that the developer controls. Spending patterns, contact lists, and financial habits are all exposed. No privacy primitive exists for agents.

## Solution

GEASS is a financial privacy agent on Base Sepolia. The agent's wallet key is **MPC-split across Lit Protocol TEE nodes** — nobody can extract it, not even the developer. Spending policies are enforced **inside the TEE** before any signature is produced. The agent authenticates via **SIWA (EIP-4361)** without leaking its principal's identity.

**The secret the agent keeps: its own private key.** No single party ever holds it.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Dashboard                  │
│       (Next.js — command + policy UI)       │
└────────────────────┬────────────────────────┘
                     │ API
┌────────────────────▼────────────────────────┐
│               GEASS Agent                   │
│    (command parser + policy enforcement)    │
└───┬──────────────┬─────────────────┬────────┘
    │              │                 │
┌───▼───┐    ┌────▼────┐     ┌─────▼─────┐
│  Lit  │    │  Bankr  │     │   SIWA    │
│  PKP  │    │ Wallet  │     │   Auth    │
│ (TEE) │    │  (DeFi) │     │ (EIP4361) │
└───┬───┘    └────┬────┘     └───────────┘
    │             │
    ▼             ▼
┌─────────────────────────────────────────────┐
│            Base Sepolia (Testnet)            │
│     Agent PKP wallet on-chain identity      │
│         ERC-8004 agent registry             │
└─────────────────────────────────────────────┘
```

## How It Works

1. Agent mints a **Lit PKP** — private key is MPC-split across TEE nodes
2. Human sets a **spending policy** (e.g., max 0.01 ETH per tx)
3. When the agent sends funds, the Lit Action checks the policy **inside the TEE**
4. If the tx exceeds the limit, the key **refuses to sign** — no signature is produced
5. Agent authenticates via **SIWA** — proves identity without revealing the principal
6. The human's identity is never on-chain — only the agent's PKP address appears

## Quickstart

```bash
git clone <repo> && cd aegis
cp .env.example .env         # fill in PRIVATE_KEY (for Chronicle Yellowstone faucet)
npm install
npm run dev                  # http://localhost:3000
```

## Agent CLI

```bash
npm run agent -- create wallet          # mint PKP (key split across Lit TEE)
npm run agent -- status                 # check PKP + policy + key isolation
npm run agent -- send 0.005 to 0xABC    # send within policy
npm run agent -- send 0.05 to 0xABC     # REJECTED — exceeds policy
npm run agent -- set-policy 0.1         # update spending limit
```

## Tech Stack

| Tool | Role |
|------|------|
| **Lit Protocol** | PKP wallet — MPC key split across TEE nodes, unextractable |
| **Lit Actions** | Spending policy enforced inside TEE before signing |
| **Bankr** | Agent wallet provisioning + DeFi execution |
| **SIWA** | Sign-In With Agent — EIP-4361 auth without leaking principal |
| **ERC-8004** | On-chain agent identity (Base Sepolia) |
| **Next.js 14** | Dashboard + API routes |
| **Base Sepolia** | Testnet deployment |

## What Makes This Different

- **Key isolation**: The agent's private key is never in a `.env` file. It's MPC-split across Lit TEE nodes.
- **Policy enforcement in TEE**: Spending limits aren't checked by app code (which can be modified). They're enforced inside sealed enclaves.
- **Identity separation**: The agent has its own on-chain identity (ERC-8004). The human principal never appears on-chain.
- **Not a wrapper**: The agent makes autonomous decisions about policy compliance. It refuses to sign unauthorized transactions.

## Project Structure

```
aegis/
├── agent/index.ts              # Command parser + executor
├── src/
│   ├── lib/
│   │   ├── lit.ts              # Lit PKP + spending policy actions
│   │   ├── bankr.ts            # Bankr CLI wrapper
│   │   ├── siwa.ts             # SIWA auth (EIP-4361)
│   │   └── wagmi.ts            # Wagmi config (Base Sepolia)
│   ├── components/
│   │   └── nav.tsx             # Navigation + wallet connect
│   └── app/
│       ├── page.tsx            # Dashboard — status + command input
│       ├── transactions/       # Policy-enforced TX visualization
│       ├── settings/           # SIWA + spending policy + PKP identity
│       └── api/                # Agent status, run, auth
└── docs/                       # Plans + build docs
```

---
topic: GEASS Programmable Anti-Hack Wallet
date: 2026-03-16
status: decided
hackathon: Synthesis
deadline: 2026-03-22
---

# GEASS — Programmable Anti-Hack Wallet

## What We're Building

A **programmable security stack for AI agent wallets**. Every integration serves ONE purpose — protecting user assets when an AI agent has spending authority.

**Pitch:** "Every other agent project shows you what the agent DID. GEASS shows you what the agent DIDN'T reveal — AND what it BLOCKED before it could hurt you."

## The Security Stack

| Layer | Tool | Question It Answers |
|---|---|---|
| **Enforcement** | MetaMask Delegation (4+ enforcers) | What CAN the agent do? (on-chain rules) |
| **Intelligence** | GoPlus + Etherscan (from SERPENS) | SHOULD it do this specific thing? (threat data) |
| **Reasoning** | Venice.ai (private) | WHY should it be allowed or blocked? (AI analysis) |
| **Identity** | Self Protocol (ZK) | WHO is this agent? (without revealing owner) |
| **Use Case** | Lido stETH yield | WHERE does value come from? (agent manages yield, not principal) |

This is NOT a checklist — it's a layered security architecture. Each layer is load-bearing.

## Why This Approach

1. **Judges penalize checklists** — but a security stack where each layer serves the same purpose is coherent
2. **MetaMask "dream tier"** requires ZK + delegations — Self Protocol's ZK identity qualifies
3. **Venice bounty** requires private reasoning — threat analysis IS private reasoning about sensitive financial data
4. **Lido bounty** (Track C) needs vault monitoring — our security pipeline monitors positions naturally
5. **Every integration deepens the same product** — not bolted-on features

## Key Decisions

### Narrative: Security Stack ✅
Every integration protects assets. Not a privacy agent, not a DeFi autopilot — a security layer.

### Bankr: Conditional Skip ⚠️
Bankr requires real on-chain DeFi execution + self-sustaining economics. Current integration is a CLI wrapper. Skip unless we can wire it as the execution layer under delegation control. $7.6K is tempting but risks becoming a checklist item.

### Lido: Include ✅
Agent manages stETH yield. GEASS enforces: agent can only spend yield, never touch principal. Perfect demo: agent tries to spend principal → BLOCKED by enforcer. Agent spends yield → APPROVED. Venice explains privately.

### Self Protocol: Light Integration ✅
Register Self Agent ID via SDK. Show ZK identity exists. Don't build deep ZK flows — $1K winner-takes-all isn't worth heavy lift. But it satisfies "Agents that Keep Secrets" theme and adds to MetaMask "dream tier" (ZK + delegations).

### Status Network: Free Money ✅
Deploy 1 contract + 1 gasless tx on Status Sepolia. $50 guaranteed. Takes 30 minutes.

### March 18 Target: Both Features
Multi-enforcer delegation + GoPlus threat blocking. Ambitious for 2 days but covers both top bounties (MetaMask $5K + Venice $11.5K).

## Bounty Targets

| Bounty | Prize | Confidence | What We Do |
|---|---|---|---|
| MetaMask | $5,000 | HIGH | 4+ stacked enforcers, AllowedTargets + spending limit + timestamp + limitedCalls |
| Venice | $11,500 VVV | HIGH | Private threat reasoning — Venice analyzes GoPlus + Etherscan data before execution |
| Lido Track C | $1,500 | MEDIUM | Vault position monitor with alerts, agent manages yield |
| Self Protocol | $1,000 | LOW-MEDIUM | Light ZK identity registration for agent |
| Status Network | $50 | GUARANTEED | Deploy + gasless tx |
| Slice ERC-8128 | $750 | LOW | If SIWA overlaps with their auth primitive |
| Open Track | share of $14,558 | AUTO | Entered by submitting |
| **Total realistic** | **~$19,800+** | | |

## Implementation Priority

### By March 18 (mid-hackathon feedback):
1. Clean stale code (remove Lit/Veil refs, fix DEMO_TXS)
2. GoPlus + Etherscan threat detection services (port from SERPENS to TypeScript)
3. Security pipeline (parallel pre-flight: GoPlus + Etherscan + Venice)
4. Multi-enforcer delegation (AllowedTargets + ERC20PeriodTransfer + Timestamp)
5. Wire pipeline into agent flow (block malicious tx before execution)

### By March 20:
6. Lido stETH yield integration (agent spends yield, GEASS protects principal)
7. Self Protocol light integration (register agent ID)
8. Dashboard polish (real tx history, security verdicts, policy editor)

### By March 22:
9. Status Network deployment ($50)
10. Demo video + submission
11. Deploy to Vercel (frontend) + VPS (agent)

## SERPENS Cross-Pollination

Port from Python to TypeScript:
- GoPlus API calls → `src/services/goplus.ts` (identical API, just fetch instead of requests)
- Etherscan V2 API → `src/services/etherscan.ts` (same endpoints, already have API key)
- Risk scoring logic → same algorithm, TypeScript types
- DeFiLlama price API → `src/services/defillama.ts` (if needed for Lido yield calculations)

**Do NOT port:** web3.py patterns (use viem instead), Hermes tool registry (different architecture), SOUL.md/skills (GEASS is not Hermes-based)

## Demo Script

```
1. Setup: "Create wallet. Set policy: only verified contracts, max 0.01 ETH, expires 24h"
   → MetaMask delegation created with 4 stacked enforcers

2. Safe tx: "Send 0.005 ETH to [verified contract]"
   → Pre-flight: GoPlus clean ✅, Etherscan verified ✅, Venice approves ✅
   → Delegation enforcer: within limits ✅
   → APPROVED

3. Malicious tx: "Send 0.005 ETH to [GoPlus-flagged address]"
   → Pre-flight: GoPlus flags MALICIOUS 🛑
   → Venice explains privately: "This address is associated with phishing"
   → BLOCKED before hitting the chain

4. Over-limit tx: "Send 0.05 ETH"
   → Pre-flight: passes (address is clean)
   → Delegation enforcer: REVERTS on-chain (0.05 > 0.01 limit)
   → BLOCKED by on-chain enforcement

5. Yield demo: "Stake 1 stETH via Lido"
   → Agent earns yield
   → Agent tries to spend principal → BLOCKED
   → Agent spends yield → APPROVED

6. Identity: "Who is this agent?"
   → Self Protocol ZK ID shown — proves authorization without revealing owner
   → "Where is the reasoning?" → Venice (private, no data stored)
   → "Where are the rules?" → On-chain delegation enforcers
```

## Open Questions

None — all key decisions made. Ready for planning update.

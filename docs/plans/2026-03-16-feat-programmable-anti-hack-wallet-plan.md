---
title: "feat: Programmable Anti-Hack Wallet with AI Transaction Screening"
type: feat
status: active
date: 2026-03-16
hackathon: Synthesis
deadline: 2026-03-22
mid-feedback: 2026-03-18
---

# Programmable Anti-Hack Wallet with AI Transaction Screening

Evolve GEASS from "privacy agent with single spending cap" to "programmable anti-hack wallet" — an AI agent that privately screens every transaction against on-chain threat intelligence before executing within composable on-chain delegation rules.

## Overview

**The pitch evolution:**
- Before: "Every other agent project shows you what the agent DID. GEASS shows you what the agent DIDN'T reveal."
- Now: "GEASS shows you what the agent DIDN'T reveal — AND what it BLOCKED before it could hurt you."

**What changes:**
1. Expand from 1 enforcer (NativeTokenTransferAmount) → 4+ stacked enforcers
2. Add AI-powered threat detection (GoPlus + Etherscan + Venice reasoning)
3. User defines security policies in natural language → mapped to on-chain enforcers
4. Agent blocks malicious transactions before they execute, privately explains why

## Problem Statement

Current agent wallets are dangerous:
- They approve unlimited token spending because the agent says so
- No real-time threat detection — if the agent interacts with a scam contract, funds are gone
- Security rules are hardcoded or nonexistent
- Users can't customize what their agent is allowed to do

GEASS solves this by making the wallet itself programmable — security rules enforced ON-CHAIN via MetaMask delegation caveats, verified by AI BEFORE execution.

## Proposed Solution

### Architecture

```
User defines security policy (natural language)
    ↓
GEASS maps to MetaMask delegation with stacked enforcers:
  - AllowedTargetsEnforcer (whitelist contracts)
  - ERC20PeriodTransferEnforcer (daily spending limit)
  - TimestampEnforcer (session expiry)
  - LimitedCallsEnforcer (max N transactions)
    ↓
Agent receives action request
    ↓
Pre-flight security check (PARALLEL):
  ├── GoPlus API → address risk + token security
  ├── Etherscan v2 → contract verification + recent tx patterns
  └── Venice.ai → private AI reasoning about risk
    ↓
If ALL checks pass → execute via delegation within enforcer bounds
If ANY check fails → block + Venice explains why (privately)
    ↓
Dashboard shows: what was blocked, why, and the security policy state
```

### What's Already Built (reuse)

| Component | File | Status |
|---|---|---|
| MetaMask Delegation | `src/lib/delegation.ts` | WORKING — smart accounts + NativeTokenTransferAmountEnforcer |
| Venice.ai reasoning | `src/lib/venice.ts` | WORKING — OpenAI-compatible, llama-3.3-70b |
| Agent CLI | `agent/index.ts` | WORKING — setup, send, balance, status, set-policy, auth, history |
| SIWA auth | `src/lib/siwa.ts` | WORKING — EIP-4361 |
| Dashboard | `src/app/page.tsx` | WORKING — status cards + command input |
| Bankr | `src/lib/bankr.ts` | SUPERFICIAL — only getBalance, no DeFi execution |

### What We're Adding

| Component | File | Priority |
|---|---|---|
| GoPlus threat detection | `src/services/goplus.ts` | P0 |
| Etherscan contract checker | `src/services/etherscan.ts` | P0 |
| Pre-flight security pipeline | `src/services/security-pipeline.ts` | P0 |
| Multi-enforcer delegation | update `src/lib/delegation.ts` | P0 |
| Enhanced Venice prompts | update `src/lib/venice.ts` | P1 |
| Security policy UI | update `src/app/page.tsx` | P1 |
| Transaction history (real data) | fix `src/app/transactions/page.tsx` | P1 |
| Clean up stale Lit/Veil refs | multiple files | P2 |

## Technical Approach

### Phase 1: Threat Detection Services (Day 1 — March 16-17)

**Must deploy by March 18 (mid-hackathon feedback)**

#### Task 1.1: GoPlus Integration
**File:** `src/services/goplus.ts`

```typescript
// Key functions:
checkTokenSecurity(chainId, contractAddress) → risk score + flags
checkAddressRisk(chainId, address) → malicious/clean
calculateRiskScore(data) → 0-100 score
```

- GoPlus API: `https://api.gopluslabs.io/api/v1` (free, no key)
- Chain ID: 8453 (Base mainnet for risk data) — Base Sepolia may not be indexed
- Reuse SERPENS risk scoring logic (proven working)

#### Task 1.2: Etherscan V2 Integration
**File:** `src/services/etherscan.ts`

```typescript
// Key functions:
getTransactionHistory(address) → recent txs
getContractSource(address) → verification status
isContractVerified(address) → boolean
```

- Etherscan V2 API: `https://api.etherscan.io/v2/api?chainid=84532`
- API key: `38TJ38NE3GYC4JC4BZEC984TUE927KY1QZ` (already have)
- Base Sepolia chain ID: 84532

#### Task 1.3: Security Pipeline
**File:** `src/services/security-pipeline.ts`

Orchestrates parallel checks before any transaction:

```typescript
async function preflightCheck(params: {
  to: string;
  value: string;
  data: string;
  walletAddress: string;
}): Promise<{
  approved: boolean;
  riskLevel: "safe" | "caution" | "danger" | "critical";
  reasoning: string;
  flags: string[];
  goPlusScore: number | null;
  isVerified: boolean | null;
}> {
  const [addressRisk, tokenSecurity, contractVerified, recentTxs] = await Promise.all([
    checkAddressRisk(8453, params.to),
    checkTokenSecurity(8453, params.to).catch(() => null),
    isContractVerified(params.to).catch(() => null),
    getTransactionHistory(params.walletAddress).catch(() => []),
  ]);

  // Hard blocks (no AI needed)
  if (addressRisk?.is_malicious_address === "1") {
    return { approved: false, riskLevel: "critical", reasoning: "GoPlus flagged as malicious", flags: ["MALICIOUS_ADDRESS"], goPlusScore: 100, isVerified: false };
  }

  const goPlusScore = tokenSecurity ? calculateRiskScore(tokenSecurity) : null;

  // AI reasoning via Venice (private)
  const analysis = await analyzeTransaction({
    to: params.to,
    value: params.value,
    data: params.data,
    goPlusRisk: goPlusScore,
    recentTxCount: recentTxs.filter(tx => parseInt(tx.timeStamp) > Date.now()/1000 - 3600).length,
  });

  return {
    approved: !analysis.shouldBlock && (goPlusScore === null || goPlusScore < 50),
    riskLevel: analysis.riskLevel,
    reasoning: analysis.reasoning,
    flags: analysis.flags,
    goPlusScore,
    isVerified: contractVerified,
  };
}
```

### Phase 2: Multi-Enforcer Delegation (Day 2 — March 17-18)

#### Task 2.1: Expand delegation.ts

Update `createDelegation` to support stacked enforcers:

```typescript
export async function createSecurityDelegation(
  userAccount: SmartAccount,
  agentAccount: SmartAccount,
  policy: SecurityPolicy
): Promise<SignedDelegation> {
  const now = Math.floor(Date.now() / 1000);

  const delegation = createDelegation({
    from: userAccount.address,
    to: agentAccount.address,
    environment: userAccount.environment,
    scope: {
      type: "nativeTokenTransferAmount",
      maxAmount: parseEther(String(policy.maxEthPerTx)),
    },
    caveats: [
      // Only interact with whitelisted contracts
      ...(policy.allowedTargets.length > 0 ? [{
        type: "allowedTargets" as const,
        targets: policy.allowedTargets,
      }] : []),
      // Session expiry
      {
        type: "timestamp" as const,
        afterThreshold: now,
        beforeThreshold: now + policy.sessionDurationHours * 3600,
      },
      // Max total transactions
      {
        type: "limitedCalls" as const,
        limit: policy.maxTransactions,
      },
    ],
  });

  const signature = await userAccount.signDelegation({ delegation });
  return { ...delegation, signature };
}

interface SecurityPolicy {
  maxEthPerTx: number;
  allowedTargets: `0x${string}`[];
  sessionDurationHours: number;
  maxTransactions: number;
}
```

#### Task 2.2: Wire Pipeline into Agent

Update `agent/index.ts` to run pre-flight before execution:

```typescript
// In the "send" command handler:
// 1. Local policy check (existing)
// 2. Pre-flight security check (NEW)
const security = await preflightCheck({ to, value, data: "0x", walletAddress });
if (!security.approved) {
  return {
    status: "BLOCKED",
    reason: security.reasoning,
    riskLevel: security.riskLevel,
    flags: security.flags,
  };
}
// 3. Venice reasoning (existing — now enhanced with security context)
// 4. Execute via delegation (existing)
```

### Phase 3: Dashboard & Demo Polish (Day 3-4 — March 18-20)

#### Task 3.1: Fix Transactions Page
- Replace `DEMO_TXS` with real data from `.agent-state.json`
- Show security pipeline results (risk level, flags, GoPlus score)
- Remove stale Lit TEE references

#### Task 3.2: Security Policy UI
Add to dashboard:
- Policy editor: set allowed targets, spending limits, session duration
- Visual security status: green/yellow/red based on current delegation
- Blocked transaction log with Venice reasoning

#### Task 3.3: Clean Up Stale References
- Remove Lit/Veil from `layout.tsx` metadata
- Remove `src/lib/lit.ts` and `src/lib/veil.ts`
- Remove Lit dependencies from `package.json`
- Update settings page to show delegation info, not PKP/Lit

### Phase 4: Demo & Submission (Day 5-6 — March 20-22)

#### Task 4.1: Demo Script
```
1. Setup: Create smart account, set security policy
   "Only interact with verified contracts. Max 0.01 ETH per tx. Expires in 24h."

2. Safe transaction: Send 0.005 ETH to a verified contract
   → Pre-flight: GoPlus clean, Etherscan verified, Venice approves
   → Delegation enforcer: within limits
   → APPROVED ✅

3. Malicious transaction: Send to a flagged contract
   → Pre-flight: GoPlus flags as malicious
   → Venice explains: "This address is associated with phishing activity"
   → BLOCKED 🛑 (before it ever hits the chain)

4. Over-limit transaction: Send 0.05 ETH
   → Pre-flight: passes security
   → Delegation enforcer: REVERTS on-chain (0.05 > 0.01 limit)
   → BLOCKED 🛑 (on-chain enforcement)

5. Show Venice reasoning: all analysis happened privately
   "Where is the security logic? On-chain. Where is the reasoning? Private."
```

#### Task 4.2: Demo Video (2-3 min)
#### Task 4.3: Deploy to Vercel + VPS
#### Task 4.4: Submit

## Target Bounties

| Bounty | Prize | How We Hit It |
|---|---|---|
| Synthesis Open Track | $16,000 | "Agents that keep secrets" — security policies are secrets, threat reasoning is private |
| MetaMask Delegations | $5,000 | 4+ stacked enforcers, composable security rules, deep framework usage |
| Venice.ai | $11,500 | Private transaction analysis, threat reasoning, behavioral anomaly detection |
| Bankr | $1,750 | DeFi execution layer (wire real integration) |

**Total potential: $34,250**

## Dependencies & Risks

| Risk | Impact | Mitigation |
|---|---|---|
| GoPlus doesn't index Base Sepolia | Token security returns empty | Use Base mainnet (8453) for risk data, deploy contracts on Sepolia |
| MetaMask SDK breaking changes (beta) | Delegation creation fails | Pin to v0.4.0-beta.1, test early |
| Venice rate limits | Slow pre-flight | Cache recent analyses, timeout + approve on Venice failure |
| Too many enforcers = confusing demo | Judges don't follow | Keep demo to 3 enforcer types max |
| Stale code confuses AI judges | Lower score on March 18 feedback | Clean up Lit/Veil refs in Phase 3 |

## Acceptance Criteria

### Functional
- [ ] GoPlus API returns risk data for any Ethereum address
- [ ] Etherscan V2 returns contract verification status on Base Sepolia
- [ ] Venice.ai privately reasons about transaction risk and returns JSON analysis
- [ ] Security pipeline runs all 3 checks in parallel, returns approve/block decision
- [ ] Delegation uses 3+ stacked enforcers (spending limit + allowed targets + timestamp)
- [ ] Agent blocks malicious transactions with Venice reasoning
- [ ] Agent approves safe transactions within enforcer bounds
- [ ] Dashboard shows real transaction history with security verdicts

### Non-Functional
- [ ] Pre-flight check completes in < 5 seconds
- [ ] No Lit/Veil references in submitted code
- [ ] No hardcoded demo data in submitted code
- [ ] Transactions page reads from agent state, not DEMO_TXS
- [ ] All API calls have timeout + error handling

### Demo
- [ ] Video shows: policy setup → safe tx approved → malicious tx blocked → Venice reasoning
- [ ] The on-chain enforcer reverts shown explicitly
- [ ] "Where is the security logic? On-chain. Where is the reasoning? Private."

## Parallelization Map

```
Phase 1 (Threat Detection) ──── PARALLEL (2 workers, Day 1)
├── Task 1.1: GoPlus integration (Worker A)
├── Task 1.2: Etherscan V2 integration (Worker A)
└── Task 1.3: Security pipeline (Worker B, after 1.1+1.2)

Phase 2 (Multi-Enforcer) ────── SEQUENTIAL (Day 2)
├── Task 2.1: Expand delegation.ts
└── Task 2.2: Wire pipeline into agent

Phase 3 (Dashboard) ─────────── PARALLEL (2 workers, Day 3-4)
├── Task 3.1: Fix transactions page (Worker A)
├── Task 3.2: Security policy UI (Worker B)
└── Task 3.3: Clean stale refs (Worker A, after 3.1)

Phase 4 (Submit) ─────────────── SEQUENTIAL (Day 5-6)
├── Task 4.1: Demo script
├── Task 4.2: Demo video
├── Task 4.3: Deploy
└── Task 4.4: Submit
```

## EIP Standards Referenced

| EIP | Usage |
|---|---|
| ERC-4337 | Account Abstraction foundation (MetaMask smart accounts) |
| ERC-7710 | Delegation with caveats (core mechanism) |
| ERC-7715 | Permission grants (JSON-RPC interface for dApps) |
| ERC-7579 | Modular smart account concepts (enforcer = module) |
| ERC-7746 | Composable security layers (conceptual alignment with our beforeHook/afterHook pattern) |
| EIP-4361 | SIWA authentication (existing) |

## References

### Internal
- Current delegation: `src/lib/delegation.ts`
- Current Venice: `src/lib/venice.ts`
- Agent core: `agent/index.ts`
- Agent state: `agent/.agent-state.json`
- Dashboard: `src/app/page.tsx`

### External
- [MetaMask Delegation Framework](https://github.com/MetaMask/delegation-framework) — 37 enforcers
- [MetaMask Smart Accounts Kit docs](https://docs.metamask.io/smart-accounts-kit/concepts/delegation/)
- [Caveats reference (full enforcer list)](https://docs.metamask.io/smart-accounts-kit/reference/delegation/caveats/)
- [GoPlus API](https://docs.gopluslabs.io/reference/api-overview) — free, no key
- [Etherscan V2 API](https://docs.etherscan.io/etherscan-v2) — unified multi-chain
- [Venice.ai API](https://docs.venice.ai/) — OpenAI-compatible, private inference
- [ERC-7746 spec](https://eips.ethereum.org/EIPS/eip-7746) — composable security middleware
- [MetaMask: Self-custody in the era of agents](https://metamask.io/news/self-custody-in-the-era-of-agents)

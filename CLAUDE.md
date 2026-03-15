# Aegis

## Overview
Aegis is a financial privacy agent on Base Sepolia. Spending authority is delegated via MetaMask Delegation Framework with on-chain caveat enforcers. The agent reasons privately via Venice.ai, executes DeFi via Bankr, and authenticates via SIWA (EIP-4361) without leaking its principal's identity.

## Hackathon
- **Event**: Synthesis (synthesis.md)
- **Deadline**: March 22, 2026
- **Theme**: **Agents that keep secrets** (primary)
- **Kickoff**: March 13, 2026
- **Mid-hackathon AI feedback**: March 18 (MUST have something deployed)

## The Pitch
"Every other agent project shows you what the agent DID. Aegis shows you what the agent DIDN'T reveal."

## Tech Stack
- TypeScript, Next.js 14, Base Sepolia (testnet)
- MetaMask Delegation Framework (`@metamask/smart-accounts-kit`) — scoped spending delegation with on-chain policy enforcement
- Venice.ai — private reasoning engine (no data stored)
- Bankr CLI (`@bankr/cli`) — agent wallet + DeFi execution
- SIWA (EIP-4361) — Sign-In With Agent authentication
- viem — all chain interaction (no ethers except Lit legacy)

## Core Architecture
1. **MetaMask Delegation** — THE centerpiece. User creates a smart account, delegates scoped spending authority to agent smart account. NativeTokenTransferAmountEnforcer limits ETH per delegation. On-chain, auditable, revocable.
2. **Venice.ai** — Agent reasons privately about transactions before executing. Venice runs inference without storing prompts/outputs. "Private cognition."
3. **Bankr** — DeFi execution layer. Swaps, transfers, portfolio via natural language.
4. **SIWA** — Agent authenticates to services without leaking its principal's identity.

## MetaMask Delegation Integration
- SDK: `@metamask/smart-accounts-kit` v0.4.0-beta
- Contracts pre-deployed on Base Sepolia (chain 84532)
- DelegationManager: `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3`
- NativeTokenTransferAmountEnforcer: `0xF71af580b9c3078fbc2BBF16FbB8EEd82b330320`
- User smart account: `0x58f5b2fBd6442480448D05d555F4E30959cb7e48`
- Agent smart account: `0x8deFc5Ab971023D4be5be430B660EAafbbc07EC5`
- Owner EOA: `0xa8B5C601ca3BA8742Fe8Ec7bA07C7C687cEEa90A`

## Demo Script (2 minutes)
1. Setup — create smart accounts + delegation with 0.01 ETH spending policy
2. Send 0.005 ETH — APPROVED, policy check passes, executed on-chain
3. Send 0.05 ETH — REJECTED, caveat enforcer blocks it
4. Show Venice reasoning — agent evaluated transaction privately
5. Show SIWA auth — agent identity without revealing principal
6. "Where is the spending authority?" — on-chain, auditable, revocable

## Judging (AI judges)
- "Solve a problem, not a checklist"
- "A working demo of one well-scoped idea beats an ambitious architecture diagram"
- "Integrating five tools that don't add up isn't a project"
- Depth > breadth. One agent, one capability, one clean demo.

## Target Bounties
- **Synthesis Open Track** ($16k) — "Agents that keep secrets" — primary
- **MetaMask Delegations** ($5k) — core integration, NativeTokenTransferAmountEnforcer
- **Venice.ai** ($11.5k) — private reasoning engine
- **Bankr** ($1.75k) — DeFi execution layer
- **Status Network** ($50 guaranteed) — easy deploy for free money

## Anti-Patterns (DO NOT)
- No fake integrations — every call must hit real endpoints
- No TODOs left in submitted code
- No copy-paste boilerplate
- Do NOT add more tools unless they genuinely add depth
- Use viem everywhere except where Lit legacy forces ethers

## Key Files
- Agent core: `agent/index.ts`
- Delegation wrapper: `src/lib/delegation.ts`
- Venice reasoning: `src/lib/venice.ts`
- Bankr wrapper: `src/lib/bankr.ts`
- SIWA auth: `src/lib/siwa.ts`
- Dashboard: `src/app/page.tsx`
- Lit (legacy, kept for reference): `src/lib/lit.ts`

## Repo Structure
```
aegis/
├── agent/          # Agent logic — command parsing, policy-enforced execution
├── src/
│   ├── app/        # Next.js pages (dashboard, transactions, settings)
│   ├── components/ # React components (nav)
│   └── lib/        # Delegation, Venice, Bankr, SIWA wrappers
└── docs/           # Plans + build docs
```

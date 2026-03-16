---
title: "fix: GEASS demo readiness patches"
type: fix
status: active
date: 2026-03-16
deepened: 2026-03-16
---

# fix: GEASS Demo Readiness Patches

## Enhancement Summary

**Deepened on:** 2026-03-16
**Review agents used:** 11 (TypeScript, Security, Performance, Architecture, Agent-Native, Pattern Recognition, Frontend Races, Code Simplicity, Deployment Verification, Best Practices Research, Framework Docs Research)

### Key Improvements from Research

1. **NEW P0-0: Kill `execSync`, import agent directly** — unanimous across 6 agents. Eliminates 2-5s latency, event loop blocking, command injection vulnerability, and env var loading issues. Replaces P0-4 entirely.
2. **CRITICAL SECURITY: Command injection in API route** — `execSync(\`tsx agent/index.ts ${command}\`)` allows shell metacharacters. Must fix before any deployment.
3. **Venice API: Add `include_venice_system_prompt: false`** — prevents JSON parse failures from Venice's default system prompt pollution.
4. **Venice: Move call after policy check** — currently wastes 1-3s on transactions that will be rejected anyway.
5. **SIWA: Use `viem/siwe` built-ins** — `createSiweMessage` + `verifySiweMessage` for spec compliance and ERC-1271 smart account support.
6. **Simplicity: Cut scope from 12 items to 8** — delete > build. Remove SIWA button from Settings, don't build formatted output for March 18.

### New Risks Discovered

- **Command injection** (CRITICAL) — shell metacharacters in user input bypass the allowlist
- **Double-spend risk** — `execSync` blocking + no server-side deduplication means second tab can fire duplicate sends
- **Venice fail-open** — defaults to `approve` when API is down, should default to `reject`
- **State file `__dirname` resolution** — will break when switching to direct imports; must use `process.cwd()`

---

## Overview

The GEASS agent core works — delegation, Venice reasoning, SIWA, and Bankr are all wired and functional. But the UI layer has stale Lit Protocol/Veil Cash references, hardcoded data, broken fields, and identity confusion that will actively undermine credibility with judges. Two out of three pages contradict the actual architecture.

This plan covers the minimal patches to go from "agent works in CLI" to "judge can click through the demo and believe it."

## Problem Statement

A judge visiting the app today will see:

1. **Dashboard** — functional, correct (already updated)
2. **Transactions page** — hardcoded fake data referencing "Lit TEE (MPC-split)" that doesn't exist in the project
3. **Settings page** — renders `pkpWallet`, `litNetwork`, `keyIsolation` fields that the API never returns → permanently blank. Text says "Enforced inside Lit TEE"
4. **Layout metadata** — says "via Veil Cash"
5. **README** — describes Lit Protocol TEE architecture
6. **Dead code** — `lit.ts` (206 lines), `veil.ts` (70 lines), `shielded-balance.tsx` in the tree. 6 `@lit-protocol/*` packages + `ethers` in deps
7. **SIWA identity confusion** — Settings flow authenticates the USER's wallet (reveals principal), opposite of what demo claims
8. **Env mismatch** — `.env.example` says `NEXT_PUBLIC_BASE_RPC_URL`, code reads `NEXT_PUBLIC_RPC_URL`
9. **API route architecture** — `execSync` blocks event loop, has command injection vulnerability, adds 2-5s cold start per request

## Proposed Solution

### P0 — Demo Blockers (must fix before March 18)

#### P0-0: Replace `execSync` with direct agent import (NEW — highest priority)

**Files:** `src/app/api/agent/run/route.ts`, `src/app/api/agent/status/route.ts`, `agent/index.ts`

**Why:** Unanimous recommendation from 6/11 review agents. This single change:
- **Fixes CRITICAL command injection** — `execSync(\`tsx agent/index.ts ${command}\`)` allows `; rm -rf /` via shell metacharacters. The allowlist only checks the first word.
- **Eliminates 2-5s cold start** — no tsx process spawn per request
- **Unblocks the event loop** — `await executeCommand()` instead of blocking `execSync`
- **Fixes env var loading** — no child process, so `process.env` is always available. Replaces P0-4 entirely.
- **Eliminates double-spend risk** — async execution means the server stays responsive during long operations

**Implementation:**

1. Move `parseCommand` and `executeCommand` from `agent/index.ts` into `src/lib/agent.ts`
2. Re-export from `agent/index.ts` for CLI usage (keep CLI working)
3. Update `STATE_FILE` path from `path.join(__dirname, ...)` to `path.join(process.cwd(), '.agent-state.json')` — critical, `__dirname` resolves differently when imported vs executed
4. In route handlers, `import { parseCommand, executeCommand } from '@/lib/agent'` and `await` directly
5. Add `export const dynamic = 'force-dynamic'` to both routes

**Security note:** If keeping `execSync` for any reason (e.g., Bankr CLI), use `execFileSync` with argument arrays, never string interpolation:
```typescript
// NEVER: execSync(`tsx agent/index.ts ${command}`)
// SAFE: execFileSync("tsx", ["agent/index.ts", ...args])
```

#### P0-1: Fix `/transactions` page

**File:** `src/app/transactions/page.tsx`

- Remove hardcoded `DEMO_TXS` array
- Fetch real transaction history from the agent's `executeCommand({ type: "history" })` (via API route)
- Show actual approved/rejected transactions with amounts, addresses, timestamps
- Empty state: "No transactions yet — run a command from the Dashboard"
- Remove ALL Lit TEE references ("signed inside Lit TEE", "Lit TEE (MPC-split)" as keySource)

### Research Insights

**Simplicity reviewer:** Consider deleting the page entirely — the dashboard already shows command output. The `history` command works from the command input. A separate page adds zero demo value. If keeping it, make it a thin wrapper: fetch + `<pre>` + empty state. 15 lines max.

**Frontend races reviewer:** Add `AbortController` to the fetch in `useEffect`. React StrictMode double-mounts, causing two fetches. Also, no cleanup on unmount means stale `setState` calls.

#### P0-2: Fix `/settings` page

**File:** `src/app/settings/page.tsx`

- Delete the entire "Agent Identity (ERC-8004)" section (renders `pkpWallet`, `litNetwork`, `keyIsolation` — all undefined)
- Replace with "Delegation Info" section showing `userSmartAccount`, `agentSmartAccount`, `enforcement` from actual status response
- Update spending policy description: "Enforced inside Lit TEE" → "Enforced on-chain via MetaMask Delegation Framework — NativeTokenTransferAmountEnforcer"
- **Remove the SIWA sign-in button entirely** — it signs with the USER's wallet (reveals principal), opposite of the claim. Replace with a note: "Use the `auth` command from the Dashboard to demonstrate agent identity."
- Remove `useSignMessage` wagmi import (dead after button removal)
- Fix the `any` type on `agentStatus` — define `AgentStatusResponse` interface matching the status command output

### Research Insights

**TypeScript reviewer:** Define a shared `AgentStatusResponse` type that matches `agent/index.ts` status output fields: `setup`, `userSmartAccount`, `agentSmartAccount`, `spendingPolicy`, `enforcement`, `chain`, `reasoning`, `execution`, `identity`, `txCount`. Use this in both the route handler and the settings page.

**Pattern reviewer:** Error handling is inconsistent — dashboard validates `data.error`, settings silently swallows with `.catch(() => {})`. Standardize to the dashboard pattern.

#### P0-3: Fix SIWA auth command (server-side signing)

**Files:** `src/lib/siwa.ts`, `agent/index.ts` (authenticate case)

The `auth` command generates a SIWA message but never signs it. Add 3 lines to sign server-side.

**Implementation:**
1. In `siwa.ts`, add `signSiwaMessage(privateKey: Hex, message: string): Promise<Hex>` using `privateKeyToAccount(key).signMessage({ message })`
2. Keep `siwa.ts` side-effect-free — pass the key as parameter, do NOT read `process.env` inside it
3. In the `authenticate` case of `agent/index.ts`, call `signSiwaMessage` and return `{ message, signature, agentAddress }`
4. Optionally self-verify with `verifySiwaSignature` to prove the round-trip works

### Research Insights

**Best practices researcher:** Use `createSiweMessage` from `viem/siwe` instead of hand-rolling EIP-4361 format. Guarantees spec compliance. Also use `verifySiweMessage` instead of `verifyMessage` — handles ERC-1271 smart account signatures automatically.

**Framework docs researcher:** viem's `verifySiweMessage` also handles ERC-6492 wrapped signatures for undeployed smart accounts. Your current `verifyMessage` only does EOA ecrecover.

**Simplicity reviewer:** The simplest path is to NOT build UI for this. The `auth` CLI command from the dashboard is sufficient for the demo. Just add the 3 lines of signing code to `agent/index.ts`.

#### P0-4: Fix Venice API call ordering + config

**Files:** `agent/index.ts`, `src/lib/venice.ts`

Two fixes:

1. **Move Venice call after policy check** (agent/index.ts lines 120-130): Currently Venice is called before checking `policyCheck.allowed`. A rejected transaction still waits 1-3s for an LLM response it discards. Short-circuit: if `!policyCheck.allowed`, return immediately, skip Venice.

2. **Add `include_venice_system_prompt: false`** (venice.ts request body): Venice prepends its own system prompt by default, which can cause the model to return non-JSON output. Add:
```typescript
body: JSON.stringify({
  model: VENICE_MODEL,
  messages: [...],
  venice_parameters: { include_venice_system_prompt: false },
})
```

3. **Change fail-open to fail-closed**: When Venice is unavailable, default to `decision: "reject"` instead of `"approve"`. A privacy agent should not silently approve everything when its reasoning engine is down.

#### P0-5: Fix `.env.example`

**File:** `.env.example`

- `NEXT_PUBLIC_BASE_RPC_URL` → `NEXT_PUBLIC_RPC_URL` (match what code reads)
- Remove `LIT_API_KEY` (dead)
- Remove `SYNTHESIS_API_KEY` (unused)
- Keep `PRIVATE_KEY`, `VENICE_API_KEY`, `BANKR_API_KEY`, `NEXT_PUBLIC_RPC_URL`

### P1 — Credibility Fixes (same session as P0)

#### P1-1: Fix layout metadata

**File:** `src/app/layout.tsx`

- Update description from "via Veil Cash" to "The power of absolute delegation — scoped spending via MetaMask Delegation Framework"

#### P1-2: Remove dead files

- Delete `src/lib/lit.ts` (206 lines, zero imports)
- Delete `src/lib/veil.ts` (70 lines, zero imports)
- Delete `src/components/shielded-balance.tsx` (never rendered)

#### P1-3: Remove dead dependencies

**File:** `package.json`

Remove: `@lit-protocol/auth-helpers`, `@lit-protocol/constants`, `@lit-protocol/contracts-sdk`, `@lit-protocol/lit-auth-client`, `@lit-protocol/lit-node-client`, `@lit-protocol/pkp-ethers`, `ethers`

Run `npm install` after to regenerate lockfile. Saves ~100MB node_modules + 30-60s install time.

**Verify first:** `grep -r "ethers" src/ agent/ --include="*.ts" -l` to confirm only `lit.ts` imports it.

#### P1-4: Update README (defer to March 20-21)

**File:** `README.md` — defer this to after the demo works. Judges see the demo first. README matters for async judging after submission.

### P2 — Polish (March 20-22)

#### P2-1: Parallelize balance fetches

**File:** `agent/index.ts` (check-balance case)

Lines 199-220 make 3 sequential RPC calls. Use `Promise.all` to parallelize:
```typescript
const [userBal, agentBal, ownerBal] = await Promise.all([
  state.userSmartAccount ? delegation.getBalance(state.userSmartAccount as Address) : "N/A",
  state.agentSmartAccount ? delegation.getBalance(state.agentSmartAccount as Address) : "N/A",
  delegation.getBalance(ownerAddress),
]);
```
Reduces 300-900ms → 100-300ms.

#### P2-2: Add Basescan links in output

For any `txHash`, link to `https://sepolia.basescan.org/tx/{hash}`. Quick win, 5 minutes.

#### P2-3: Update README for submission

Full rewrite to match MetaMask Delegation architecture. Do this last.

#### P2-4: Deployment (Coolify on VPS)

**Deployment target:** Contabo VPS via Coolify

Key requirements from deployment review:
- Need Dockerfile with `tsx` available at runtime (move to `dependencies` or install all deps)
- Volume mount for `/app/agent/` to persist `.agent-state.json`
- Env vars in Coolify: `PRIVATE_KEY`, `VENICE_API_KEY`, `NEXT_PUBLIC_RPC_URL`
- If P0-0 is done (direct import), `tsx` is only needed for CLI usage, not API routes — simplifies deployment significantly
- Domain: `geass.robbyn.xyz`

## Acceptance Criteria

### P0 (March 18 deadline)

- [ ] API routes import agent directly — no `execSync`, no command injection
- [ ] `/transactions` shows real agent history, no hardcoded data
- [ ] `/settings` shows delegation info, no PKP/Lit fields, no SIWA button
- [ ] SIWA `auth` command returns server-signed message proving agent identity
- [ ] Venice called only after policy check passes; `include_venice_system_prompt: false` set
- [ ] Venice fails closed (reject) not open (approve)
- [ ] `.env.example` matches actual code variable names
- [ ] Zero references to "Lit TEE", "PKP", "MPC-split", or "Veil Cash" in any rendered UI

### P1 (March 18)

- [ ] `lit.ts`, `veil.ts`, `shielded-balance.tsx` deleted
- [ ] All `@lit-protocol/*` and `ethers` removed from package.json
- [ ] Layout metadata is accurate

### P2 (March 22 stretch)

- [ ] Balance fetches parallelized
- [ ] Basescan links for transaction hashes
- [ ] README updated for submission
- [ ] Deployed to `geass.robbyn.xyz` via Coolify

## Execution Order (optimized)

Total estimated time: ~3 hours for P0+P1

1. **Delete dead files + deps** (10 min) — `rm` lit.ts, veil.ts, shielded-balance.tsx. `npm uninstall` 7 packages. Fix `.env.example`. Fix layout metadata. Pure deletion, instant credibility gain.
2. **P0-0: Replace execSync with direct import** (30 min) — move parseCommand/executeCommand to `src/lib/agent.ts`, update routes, fix STATE_FILE path. This fixes security, performance, and env var loading in one shot.
3. **P0-4: Fix Venice** (10 min) — move call after policy check, add `include_venice_system_prompt: false`, change fail-open to fail-closed.
4. **P0-2: Fix Settings page** (30 min) — delete Lit/PKP sections, add delegation info, remove SIWA button, fix types.
5. **P0-1: Fix Transactions page** (20 min) — replace hardcoded data with history fetch.
6. **P0-3: Fix SIWA auth command** (15 min) — add server-side signing with viem, self-verify.
7. **Verify + commit** (15 min)

## Dependencies & Risks

- **Risk:** `__dirname` → `process.cwd()` change for state file is critical when switching to direct imports. Without this, the agent loses all state silently.
- **Risk:** Removing `ethers` — verify no remaining imports first with grep.
- **Risk:** SIWA server-side signing must use `privateKeyToAccount().signMessage()`, not expose key to client.
- **Risk:** Venice `response_format: { type: "json_object" }` may not be supported — test before relying on it. The `include_venice_system_prompt: false` fix is more reliable.
- **Bankr CLI** — runtime dependency not in npm. Graceful degradation exists. Acceptable for demo. Note: if targeting Bankr bounty ($1.75k), need to integrate Bankr into the send flow, not just balance check.
- **Deployment:** If P0-0 is done, `tsx` is no longer needed at runtime for API routes, only for CLI. Simplifies Dockerfile.

## References

- Agent core: `agent/index.ts`
- Delegation: `src/lib/delegation.ts` — confirmed matching official SDK patterns
- Venice: `src/lib/venice.ts` — add `venice_parameters` config
- SIWA: `src/lib/siwa.ts` — use `viem/siwe` builtins
- Dashboard: `src/app/page.tsx`
- Transactions: `src/app/transactions/page.tsx`
- Settings: `src/app/settings/page.tsx`
- Layout: `src/app/layout.tsx`
- [MetaMask Smart Accounts Kit docs](https://docs.metamask.io/smart-accounts-kit/)
- [viem createSiweMessage](https://viem.sh/docs/siwe/utilities/createSiweMessage)
- [viem verifySiweMessage](https://viem.sh/docs/siwe/actions/verifySiweMessage)
- [Venice API Reference](https://docs.venice.ai/api-reference/api-spec)
- Known addresses: see `CLAUDE.md` for deployed contract addresses on Base Sepolia

# AGENTS.md

## GEASS

Financial privacy agent — delegated spending with private reasoning and identity separation.

**Live**: https://geass.robbyn.xyz
**GitHub**: https://github.com/amrrobb/geass

---

## Commands

| Command | Syntax | Description |
|---------|--------|-------------|
| Setup | `setup` | Create smart accounts + delegation with spending policy |
| Send | `send 0.005 to 0x1234...` | Transfer ETH within delegated policy limits |
| Set Policy | `set-policy 0.01` | Set max ETH spending limit (caveat enforcer) |
| Balance | `balance` | Check agent smart account balance |
| Status | `status` | Show delegation status, policy, and account info |
| Auth | `auth` | Authenticate via SIWA without revealing principal |
| History | `history` | View past transactions and reasoning logs |
| Help | `help` | List available commands |

---

## Three Secrets

1. **What it thinks** — Venice.ai runs inference privately. No prompts or outputs are stored. The agent's reasoning is invisible.
2. **Who it works for** — SIWA (EIP-4361) authenticates the agent to services without leaking its principal's identity.
3. **What it can't do** — On-chain caveat enforcers (NativeTokenTransferAmountEnforcer) hard-limit spending. The agent cannot exceed its delegated authority.

---

## Architecture

```
User MetaMask → Delegation (on-chain) → Ephemeral Agent Key (browser) → Venice.ai (server proxy) → On-chain execution → SIWA auth (browser)
```

**Non-custodial: no server holds user keys or agent keys.**

The agent key is **ephemeral** — generated per-session in the browser and never sent to a server. The user's MetaMask wallet signs a scoped delegation to this ephemeral key. The agent redeems the delegation client-side. The server's only role is proxying Venice.ai API calls (to keep the API key out of the browser). State is stored in localStorage. When you close the tab, the agent key is gone — zero residual trust.

---

## On-Chain Contracts

### Base Sepolia (Chain 84532)

| Contract | Address |
|----------|---------|
| DelegationManager | `0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3` |
| NativeTokenTransferAmountEnforcer | `0xF71af580b9c3078fbc2BBF16FbB8EEd82b330320` |
| User Smart Account | `0x58f5b2fBd6442480448D05d555F4E30959cb7e48` |
| Agent Smart Account | `0x8deFc5Ab971023D4be5be430B660EAafbbc07EC5` |

### Status Network (Chain 1660990954)

| Contract | Address |
|----------|---------|
| Deployed Contract | `0xf95c11c7acfea0d63a621195a7004fe3b8c7884b` |
| Gasless Tx Proof | `0x1d60e1e4a4b646f00ea68b99ed9e1b09cac41b3108d47aa7b04496ae2e3343b2` |

---

## How to Test

1. **Setup** — Run `setup` to create smart accounts and delegation with spending policy
2. **Send (approved)** — Run `send 0.005 to 0x...` — within policy, executes on-chain
3. **Send (rejected)** — Run `send 0.05 to 0x...` — exceeds policy, caveat enforcer blocks it
4. **Auth** — Run `auth` — agent authenticates via SIWA without revealing principal
5. **History** — Run `history` — view transaction log with Venice reasoning summaries
6. **Status** — Run `status` — confirm delegation is active, policy limits, balances

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/agent/run` | Execute an agent command (body: `{ "command": "..." }`) |
| GET | `/api/agent/status` | Get current agent status, delegation info, balances |

---

## Tech Stack

TypeScript, Next.js 14, viem, MetaMask Smart Accounts Kit (`@metamask/smart-accounts-kit`), Venice.ai API, SIWA (EIP-4361), Base Sepolia

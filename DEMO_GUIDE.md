# GEASS Demo Guide

## Pre-Demo Checklist

- [ ] Live site is up: https://geass.robbyn.xyz
- [ ] Owner EOA has Base Sepolia ETH for gas (need ~0.005 ETH minimum)
  - Address: `0xa8B5C601ca3BA8742Fe8Ec7bA07C7C687cEEa90A`
  - Faucet: https://www.alchemy.com/faucets/base-sepolia or https://faucet.quicknode.com/base/sepolia
- [ ] User smart account is funded (currently 0.044 ETH — enough)
  - Address: `0x58f5b2fBd6442480448D05d555F4E30959cb7e48`
- [ ] Venice API key is valid (check https://venice.ai/dashboard)
- [ ] Test: `curl -s https://geass.robbyn.xyz/api/agent/run -X POST -H "Content-Type: application/json" -d '{"command":"status"}'` returns `ok: true`

## Quick Test (CLI — run locally)

```bash
cd ~/Documents/Web3/hackathons/aegis
npm run agent -- status        # should show "not initialized" or "complete"
npm run agent -- help           # shows all commands
```

## Demo Flow (2 minutes)

Open https://geass.robbyn.xyz in browser. All commands go in the "Agent Command" input on the Dashboard.

---

### Step 1: Setup (~15-20 seconds)

**Type:** `setup`

**What happens:**
- Creates smart accounts on Base Sepolia
- Creates delegation with 0.01 ETH spending policy
- NativeTokenTransferAmountEnforcer deployed on-chain

**What to say:**
> "First, the user delegates scoped spending authority to the agent. The MetaMask Delegation Framework creates a delegation with a 0.01 ETH limit, enforced on-chain by a caveat enforcer — not by app code."

**Expected output:** JSON with `ok: true`, shows owner address, user smart account, agent address, spending policy.

**If it says "Fund the smart account":** The smart account needs Base Sepolia ETH. Send some to the address shown.

---

### Step 2: Send Within Policy — APPROVED (~10-15 seconds)

**Type:** `send 0.005 to 0xd4c894e2209a5291ab6a4e0f72f6cb385e2a91ab`

**What happens:**
1. Policy check passes (0.005 < 0.01 limit)
2. Venice.ai reasons about the transaction privately
3. Delegation redemption executes on-chain

**What to say:**
> "The agent sends 0.005 ETH. Policy check passes. Venice.ai reasons about it privately — no prompts or outputs stored. Then the delegation is redeemed on-chain. The caveat enforcer verifies the amount."

**Expected output:** JSON with `ok: true`, `txHash`, `veniceReasoning`.

**Pro tip:** Copy the `txHash` and show it on https://sepolia.basescan.org/tx/{hash} — proves it's real.

---

### Step 3: Send Over Policy — REJECTED (instant)

**Type:** `send 0.05 to 0xd4c894e2209a5291ab6a4e0f72f6cb385e2a91ab`

**What happens:**
1. Policy check fails (0.05 > 0.01 limit)
2. Venice is NOT called (saves time and money)
3. Blocked locally — "the caveat enforcer would revert this on-chain"

**What to say:**
> "Now 0.05 ETH — five times the limit. Instantly rejected. The agent doesn't even bother calling Venice or submitting on-chain. It knows the caveat enforcer would revert, so it saves gas by blocking locally. This is the agent keeping a secret — it knows what it CAN'T do."

**Expected output:** JSON with `ok: false`, `error: "REJECTED — spending policy violated"`.

---

### Step 4: Show SIWA Auth (~5 seconds)

**Type:** `auth`

**What happens:**
- Agent generates an EIP-4361 SIWA message
- Signs it server-side with its own private key
- Returns signed message + signature

**What to say:**
> "The agent authenticates to services using SIWA — Sign-In With Agent. It signs with its OWN key. Services see the agent's address, never the human principal's. The identity separation is complete."

**Expected output:** JSON with `signature`, `agentAddress`, signed `message`.

---

### Step 5: Show Transaction History

**Type:** `history`

Or click **Transactions** in the nav bar.

**What to say:**
> "Full audit trail. Every transaction — approved or rejected — is logged. The approved ones have on-chain tx hashes you can verify on Basescan."

---

### Step 6: Status — "Where Is the Spending Authority?"

**Type:** `status`

**What to say:**
> "Where is the spending authority? On-chain. The MetaMask Delegation Framework's NativeTokenTransferAmountEnforcer — a smart contract — enforces the limit. Not app code. Not a config file. On-chain, auditable, revocable."

---

## The Pitch (30 seconds)

> "Every other agent project shows you what the agent DID. GEASS shows you what the agent DIDN'T reveal."
>
> "Three secrets the agent keeps:
> 1. **What it thinks** — Venice.ai reasoning is private, no data stored
> 2. **Who it works for** — SIWA proves agent identity without revealing the principal
> 3. **What it can't do** — on-chain caveat enforcers silently block unauthorized transactions"
>
> "One agent. One capability. Depth over breadth."

---

## Troubleshooting

### "Run 'setup' first"
Run the `setup` command before trying `send` or `auth`.

### Setup takes too long / times out
The smart account deployment requires gas on Base Sepolia. Check the owner EOA balance:
```bash
npm run agent -- balance
```
If owner balance is 0, get testnet ETH from a faucet.

### Venice says "not configured"
The `VENICE_API_KEY` env var is missing. Check `.env` locally or Coolify env vars for the deployed version.

### Transaction approved but no txHash
The user smart account doesn't have ETH to transfer. Fund it:
```
Address: 0x58f5b2fBd6442480448D05d555F4E30959cb7e48
```

### Live site is down
Check Coolify at https://coolify.robbyn.xyz. Redeploy if needed:
```bash
curl -s -X POST -H "Authorization: Bearer 2|EUQN4jvyHVqJiClntPM0zeTUEqGqvD0dueF9YaP504a2453c" \
  -H "Content-Type: application/json" \
  "https://coolify.robbyn.xyz/api/v1/deploy" \
  -d '{"uuid": "asoww0os0k484gkog0kock0s"}'
```

---

## Key Links

| Resource | URL |
|----------|-----|
| Live demo | https://geass.robbyn.xyz |
| GitHub repo | https://github.com/amrrobb/geass |
| Base Sepolia Explorer | https://sepolia.basescan.org |
| Status Network Contract | https://sepoliascan.status.network/address/0xf95c11c7acfea0d63a621195a7004fe3b8c7884b |
| DelegationManager | https://sepolia.basescan.org/address/0xdb9B1e94B5b69Df7e401DDbedE43491141047dB3 |
| User Smart Account | https://sepolia.basescan.org/address/0x58f5b2fBd6442480448D05d555F4E30959cb7e48 |
| Owner EOA | https://sepolia.basescan.org/address/0xa8B5C601ca3BA8742Fe8Ec7bA07C7C687cEEa90A |

## Bounty Targets

| Bounty | Prize | Status |
|--------|-------|--------|
| Open Track ("Agents that keep secrets") | $19.5k pool | Primary submission |
| Venice.ai | $5,750 / $3,450 / $2,300 | Real integration, private reasoning |
| MetaMask Delegations | $3,000 / $1,500 / $500 | Core integration |
| Status Network | $2,000 pool (min $50) | Contract deployed, gasless tx proven |

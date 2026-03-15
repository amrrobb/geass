# GEASS Build Plan
**Hackathon**: Synthesis — deadline Mar 22, 2026
**Theme**: Agents that keep secrets
**Stack**: TypeScript, Next.js 14, Veil Cash CLI, Bankr CLI, SIWA
**Base**: Mainnet only (Veil has no testnet)

---

## Phase 1: Agent Core (Days 1–3)

### Step 1.1 — Fund wallet + Veil init
**Precondition**: User provides `PRIVATE_KEY` (Base mainnet wallet with ≥0.05 ETH)

```bash
# Add to /Users/ammar.robb/Documents/Web3/hackathons/aegis/.env
PRIVATE_KEY=<user_provides>
WALLET_ADDRESS=<derived_from_key>
```

```bash
cd /Users/ammar.robb/Documents/Web3/hackathons/aegis
veil init          # generates Veil keypair, saves to ~/.veil/
veil register      # registers keypair on-chain (costs gas on Base mainnet)
veil status        # acceptance: shows "registered: true", relay healthy
```

**Acceptance**: `veil status` returns registered keypair and healthy relay.

---

### Step 1.2 — Test Veil deposit + withdraw
```bash
veil deposit 0.01   # deposit 0.01 ETH into Veil pool
veil balance        # should show ~0.01 ETH shielded
veil withdraw 0.005 --to <different_address>  # withdraw to fresh address
```

**Acceptance**: Withdrawal address has no on-chain link to deposit address. Verify on https://basescan.org.

---

### Step 1.3 — Install Bankr + get API key
```bash
npm i -g @bankr/cli
bankr login         # follow OAuth flow
bankr whoami        # get API key / user ID
```

Add to `.env`:
```
BANKR_API_KEY=<from_bankr_login>
```

**Acceptance**: `bankr whoami` returns authenticated user.

---

### Step 1.4 — Wire SIWA auth
```bash
cd /Users/ammar.robb/Documents/Web3/hackathons/aegis
npm install @buildersgarden/siwa
```

Create `/Users/ammar.robb/Documents/Web3/hackathons/aegis/src/lib/siwa.ts`:
- Export `createSiwaMessage(address, nonce)` — builds EIP-4361 message
- Export `verifySiwaSignature(message, signature)` — returns `{ address, valid }`

**Acceptance**: Unit test: sign a SIWA message with a test key, verify returns `valid: true`.

---

### Step 1.5 — Smoke test agent commands
```bash
npx tsx agent/index.ts status
npx tsx agent/index.ts deposit 0.001
npx tsx agent/index.ts balance
npx tsx agent/index.ts withdraw 0.0005 --to <address>
```

**Acceptance**: All four commands return structured JSON output, no unhandled errors.

---

## Phase 2: Dashboard (Days 4–6)

### Step 2.1 — Next.js setup
```bash
cd /Users/ammar.robb/Documents/Web3/hackathons/aegis
npm install wagmi viem @tanstack/react-query
```

Verify `src/app/layout.tsx` exists. Add wagmi `WagmiProvider` + `QueryClientProvider` wrapping app.

Base mainnet config in `src/lib/wagmi.ts`:
```ts
import { base } from 'wagmi/chains'
// chain: base, transport: http(process.env.NEXT_PUBLIC_RPC_URL)
```

**Acceptance**: `npm run dev` starts without errors.

---

### Step 2.2 — Home page (`src/app/page.tsx`)
Must include:
1. Agent status card — calls `GET /api/agent/status`, shows relay health + registered address
2. Command input — free-text field, `POST /api/agent/run { command: string }`, streams result
3. Connect wallet button (wagmi `useConnect`)

---

### Step 2.3 — API routes
Create the following in `src/app/api/`:

**`/api/agent/status/route.ts`**
- Runs `npx tsx agent/index.ts status` via `child_process.exec`
- Returns JSON: `{ relay: string, address: string, registered: boolean }`

**`/api/agent/run/route.ts`**
- Body: `{ command: string }`
- Validates command is in allowlist: `["status","deposit","withdraw","balance","history"]`
- Spawns `npx tsx agent/index.ts <command>`, returns stdout as JSON

**Acceptance**: `curl http://localhost:3000/api/agent/status` returns valid JSON.

---

### Step 2.4 — Transactions page (`src/app/transactions/page.tsx`)
- Calls `GET /api/agent/history` → returns last N Veil transactions
- Each row: amount, timestamp, type (deposit/withdraw), privacy badge
- **Key visual**: two columns — "From" address and "To" address — with a red ✗ between them labeled "No on-chain link"
- Link each tx to basescan.org

---

### Step 2.5 — Settings page (`src/app/settings/page.tsx`)
- Show connected wallet address (wagmi `useAccount`)
- Show Veil registered address
- Show Bankr user ID
- SIWA sign-in button — on click, prompts wallet signature, calls `/api/auth/siwa`, stores session

**`/api/auth/siwa/route.ts`**: calls `verifySiwaSignature`, returns `{ address, authenticated: true }`, set session cookie.

---

### Step 2.6 — Veil pool balances
In Home page, add a balances card:
- Call `veil balance` via `/api/agent/run`
- Display shielded ETH balance with lock icon
- Update every 30s via `setInterval`

---

## Phase 3: Polish + Submit (Days 7–10)

### Step 3.1 — Error handling on happy path
- Wrap all `child_process.exec` calls in try/catch, return `{ error: string }` on failure
- Dashboard shows user-friendly error messages (not raw stderr)
- Add loading spinners to command input and balance card

### Step 3.2 — ERC-8004 identity display
- In Settings page, add "Identity" section
- Show ERC-8004 identity linked to SIWA session address
- If not registered, show "Register Identity" CTA (link to Bankr or relevant registry)

### Step 3.3 — README for AI judges
Update `/Users/ammar.robb/Documents/Web3/hackathons/aegis/README.md`:
- Hook: 1-sentence pitch
- Problem / Solution / How it works (3 bullets each)
- Architecture diagram (ASCII)
- Quick start: 5 commands to run locally
- Live demo link (if deployed)

### Step 3.4 — Demo video (2 min)
Script:
1. Show basescan — depositing ETH into Veil from address A (0:00–0:30)
2. Show agent command `withdraw --to B` executing on dashboard (0:30–1:00)
3. Show basescan — address B receiving ETH with NO link to A (1:00–1:30)
4. Show Bankr integration + SIWA auth in settings (1:30–2:00)

### Step 3.5 — Submit
- Repo: make public on GitHub
- Submission form: fill title, description, repo URL, demo video URL, tech stack
- Deadline: **Mar 22, 2026**

---

## File Map

```
aegis/
├── agent/index.ts          # command parser (exists)
├── src/
│   ├── lib/
│   │   ├── veil.ts         # Veil CLI wrapper (exists)
│   │   ├── bankr.ts        # Bankr CLI wrapper (exists)
│   │   ├── siwa.ts         # SIWA auth helpers (Phase 1.4)
│   │   └── wagmi.ts        # wagmi Base config (Phase 2.1)
│   └── app/
│       ├── layout.tsx       # wagmi providers (Phase 2.1)
│       ├── page.tsx         # Home: status + command input (Phase 2.2)
│       ├── transactions/page.tsx  # TX history (Phase 2.4)
│       ├── settings/page.tsx      # Wallet + SIWA (Phase 2.5)
│       └── api/
│           ├── agent/status/route.ts
│           ├── agent/run/route.ts
│           └── auth/siwa/route.ts
├── .env                    # PRIVATE_KEY, BANKR_API_KEY, NEXT_PUBLIC_RPC_URL
└── docs/BUILD_PLAN.md      # this file
```

---

## Environment Variables Required

```bash
PRIVATE_KEY=             # Base mainnet wallet private key
WALLET_ADDRESS=          # derived address
BANKR_API_KEY=           # from `bankr login`
NEXT_PUBLIC_RPC_URL=     # Base mainnet RPC (e.g. https://mainnet.base.org)
NEXT_PUBLIC_CHAIN_ID=8453
```

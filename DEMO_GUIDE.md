# GEASS Demo Guide

## Video Script (2 minutes)

Record this with Loom or OBS. Share your screen showing https://geass.robbyn.xyz.

---

### Opening (10 sec)

**Show:** Dashboard with GEASS logo, status cards, "How GEASS Keeps Secrets" section visible.

**Say:**
> "This is GEASS — a financial privacy agent. Every other agent project shows you what the agent did. GEASS shows you what the agent didn't reveal."

---

### Scene 1: Setup (20 sec)

**Type:** `setup`

**Wait for result card** — shows green SUCCESS badge, smart account addresses, spending policy.

**Say:**
> "First, the user delegates scoped spending authority to the agent. The MetaMask Delegation Framework creates a delegation with a 0.01 ETH limit. This limit is enforced by a NativeTokenTransferAmountEnforcer — a smart contract on Base Sepolia, not app code."

**Point out:** The User Smart Account and Agent address in the result card.

---

### Scene 2: Send within policy — APPROVED (20 sec)

**Type:** `send 0.005 to 0xd4c894e2209a5291ab6a4e0f72f6cb385e2a91ab`

**Wait for result card** — shows green APPROVED badge, Venice reasoning in purple card, Basescan link.

**Say:**
> "The agent sends 0.005 ETH — within the policy. Notice two things: the Venice.ai reasoning card shows the agent evaluated this privately — no prompts or outputs stored. And there's a Basescan link — this is a real on-chain transaction."

**Click the Basescan link** to show the real tx (optional but powerful).

---

### Scene 3: Send over policy — REJECTED (15 sec)

**Type:** `send 0.05 to 0xd4c894e2209a5291ab6a4e0f72f6cb385e2a91ab`

**Wait for result card** — shows red REJECTED badge, policy violation message.

**Say:**
> "Now 0.05 ETH — five times the limit. Instantly rejected. The agent doesn't even call Venice or submit on-chain. It knows the caveat enforcer would revert, so it blocks locally to save gas. This is the agent keeping a secret — it knows what it CAN'T do."

---

### Scene 4: SIWA Auth (15 sec)

**Type:** `auth`

**Wait for result card** — shows signed SIWA message, agent address, signature.

**Say:**
> "The agent authenticates via SIWA — Sign-In With Agent. It signs with its OWN key, server-side. Services see the agent's address. The human principal's identity is never exposed."

---

### Scene 5: Transaction History (10 sec)

**Click "Transactions"** in the nav bar.

**Show:** The approved and rejected transactions with Basescan link.

**Say:**
> "Full audit trail. Every transaction — approved or rejected — is logged. Approved ones have on-chain tx hashes you can verify on Basescan."

---

### Scene 6: Status — The Punchline (15 sec)

**Click back to "Dashboard"**. **Type:** `status`

**Say:**
> "Where is the spending authority? On-chain. MetaMask Delegation Framework's NativeTokenTransferAmountEnforcer. Not a config file. Not app code. A smart contract. Auditable. Revocable."

---

### Closing (15 sec)

**Say:**
> "Three secrets GEASS keeps:
> One — what it thinks. Venice.ai reasoning is private. No data stored.
> Two — who it works for. SIWA proves agent identity without revealing the principal.
> Three — what it can't do. On-chain caveat enforcers silently block unauthorized transactions.
>
> One agent. One capability. Depth over breadth."

---

## Tips for Recording

1. **Use Loom** — free, easy, gives you a shareable link instantly
2. **Full screen the browser** — hide bookmarks bar, use a clean browser profile
3. **Go slow on typing** — let each result card fully render before talking
4. **Don't rush** — 2 minutes is plenty. Pause between scenes.
5. **If setup takes long** (15-20s), fill the silence: "The agent is creating smart accounts on Base Sepolia and signing the delegation..."
6. **If a command fails**, just say "let me retry" — judges expect testnet hiccups
7. **Show the "How GEASS Keeps Secrets" section** at the bottom of the dashboard — it's your visual summary

## After Recording

Upload the video URL to your submission:

```bash
curl -X POST "https://synthesis.devfolio.co/projects/3dcbbe82caff4e72975aa54827a7f707" \
  -H "Authorization: Bearer sk-synth-ac778830b83282a90bfc8d4df77c767f9e09b7c8cc60a4f0" \
  -H "Content-Type: application/json" \
  -d '{"videoURL": "YOUR_LOOM_OR_YOUTUBE_URL"}'
```

---

## Pre-Recording Checklist

- [ ] Open https://geass.robbyn.xyz in a clean browser window
- [ ] Verify status returns "not initialized" (fresh state for demo)
- [ ] Verify owner EOA has Base Sepolia ETH for gas
- [ ] Start Loom/OBS recording
- [ ] Share screen (browser only, not whole desktop)
- [ ] Run through the script above
- [ ] Stop recording, get shareable link
- [ ] Update submission with videoURL

## Troubleshooting

### State not fresh (shows "complete" instead of "not initialized")
Delete the state file on the server. Or just skip setup and go straight to send commands.

### Setup takes too long / times out
Owner EOA needs gas. Check balance:
```bash
curl -s https://geass.robbyn.xyz/api/agent/run -X POST -H "Content-Type: application/json" -d '{"command":"balance"}'
```

### Venice says "reasoning unavailable"
VENICE_API_KEY missing in Coolify env vars. The agent will reject (fail-closed) — mention this: "Venice is unavailable, so the agent defaults to rejecting — fail-closed, not fail-open."

---

## Key Links

| Resource | URL |
|----------|-----|
| Live demo | https://geass.robbyn.xyz |
| GitHub | https://github.com/amrrobb/geass |
| Base Sepolia Explorer | https://sepolia.basescan.org |
| Status Network Contract | https://sepoliascan.status.network/address/0xf95c11c7acfea0d63a621195a7004fe3b8c7884b |
| User Smart Account | https://sepolia.basescan.org/address/0x58f5b2fBd6442480448D05d555F4E30959cb7e48 |

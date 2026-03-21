# GEASS Demo Video Script

**Duration:** 2 minutes | **Format:** Screen recording with narration

---

## Pre-Recording

1. Open https://geass.robbyn.xyz
2. Clear localStorage (F12 → Application → Local Storage → delete all geass keys)
3. Make sure Rabby/MetaMask is on Base Sepolia with ~0.25 ETH
4. Start Loom/OBS recording (share browser tab only)

---

## NARRATION SCRIPT

### Opening — Onboarding Slides (30 sec)

*[The onboarding overlay appears automatically]*

**Slide 1 — The Problem:**
> "Your agent moves money on your behalf. But today, the agent holds your private key — it can drain everything. The LLM provider logs every prompt — your strategy becomes their data. And every service sees your wallet address — your spending patterns, contacts, behavior — all linked to you."

*[Click "Next"]*

**Slide 2 — The Solution:**
> "GEASS fixes this. Instead of giving your key to the agent, you delegate scoped spending — 0.01 ETH max — enforced by a smart contract, not app code. The agent reasons privately through Venice AI, which stores nothing. And the agent authenticates with its own ephemeral key — services never see your wallet."

*[Click "Next"]*

**Slide 3 — Zero Residual Trust:**
> "The agent key is generated in your browser. It never touches any server. And when you close the tab — it's gone. Zero residual trust."

*[Click "Start Building"]*

---

### Scene 1: Setup (30 sec)

*[Connect wallet via RainbowKit button, then type `setup` and click Execute]*

> "I connect my wallet and run setup. My wallet creates a smart account, generates an ephemeral agent key, and signs a delegation — all on-chain on Base Sepolia. Notice: two wallet confirmations — one for the smart account deployment, one for funding the agent with gas. My wallet stays in control."

*[Wait for SUCCESS result to appear]*

> "Setup complete. The spending pool address and the ephemeral agent address are shown. The agent exists only in this browser tab."

---

### Scene 2: Fund + Send Approved (30 sec)

*[Click the "+ Fund" button to deposit 0.005 ETH]*

> "I fund the spending pool with 0.005 ETH."

*[Type: `send 0.001 to 0xd4c894e2209a5291ab6a4e0f72f6cb385e2a91ab` and Execute]*

> "Now I send 0.001 ETH — within the 0.01 limit. The agent checks the policy locally, then Venice AI privately evaluates the transaction for risk. Look at the purple card — Venice analyzed the recipient type, checked for phishing patterns, and assessed privacy leakage risk. None of this reasoning is stored anywhere. Then the delegation is redeemed on-chain — verified on Basescan."

*[Point to the Basescan link]*

---

### Scene 3: Send Rejected (15 sec)

*[Type: `send 0.05 to 0xd4c894e2209a5291ab6a4e0f72f6cb385e2a91ab` and Execute]*

> "Now 0.05 ETH — five times the limit. Instantly rejected. The agent doesn't even call Venice or submit on-chain. The caveat enforcer would revert it, so the agent saves gas by blocking locally. This is the infrastructure keeping the human in control."

---

### Closing (15 sec)

> "GEASS is the privacy and spending control layer for any AI agent that moves money. The human defines boundaries via delegation. The smart contract guarantees them. Venice provides private reasoning. And the ephemeral key means zero residual trust. Scoped. Private. Ephemeral."

---

## After Recording

Upload video URL:
```bash
curl -X POST "https://synthesis.devfolio.co/projects/3dcbbe82caff4e72975aa54827a7f707" \
  -H "Authorization: Bearer sk-synth-ac778830b83282a90bfc8d4df77c767f9e09b7c8cc60a4f0" \
  -H "Content-Type: application/json" \
  -d '{"videoURL": "YOUR_LOOM_OR_YOUTUBE_URL"}'
```

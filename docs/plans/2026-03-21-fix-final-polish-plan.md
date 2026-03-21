---
title: "fix: Final polish — transactions, Venice reasoning, UI, presentation"
type: fix
status: active
date: 2026-03-21
---

# fix: Final Polish Before Submission

## Context

Deadline: March 22 11:59 PM PST (tomorrow). Demo works end-to-end. These are the final items.

## Open Questions from User

1. **Transactions page empty** — reads from old server API, needs to read from localStorage or on-chain
2. **Do we need a presentation/slides for demo?**
3. **What is Venice actually validating? Is it meaningful?**
4. **UI/UX needs improvement — not standout enough**
5. **Check if we received hackathon feedback**

## Proposed Solutions

### P0-1: Fix Transactions Page — Use Basescan API

**File:** `src/app/transactions/page.tsx`

Instead of localStorage (not persistent across devices) or old server API (broken), query the Basescan API for the smart account's transaction history. This is how real wallets do it.

**Implementation:**
- Use Basescan API: `https://api-sepolia.basescan.org/api?module=account&action=txlist&address={SA_ADDRESS}&sort=desc`
- Read smart account address from localStorage session
- Display real on-chain transactions
- Fallback to localStorage transactions if Basescan is slow
- Show both approved (on-chain txs) and rejected (localStorage only) transactions

### P0-2: Make Venice Reasoning Meaningful

**Current problem:** Venice just says "amount is within policy limits" — judges will see this adds no value beyond the policy check.

**Fix the prompt to ask Venice meaningful questions:**
- Is this recipient address known/suspicious?
- Is the transaction pattern unusual (frequency, timing)?
- Does the amount make sense in context?
- Risk assessment of the transaction

**Better prompt example:**
```
You are a privacy-preserving financial agent's reasoning engine.
Evaluate this transaction for risk, not just policy compliance.

Consider:
- Is the recipient a known contract or EOA?
- Is the amount unusual for this type of transaction?
- Are there any red flags (round numbers suggesting phishing, etc)?
- Would this transaction leak information about the principal?

Transaction: {amount} ETH to {recipient}
Policy: max {policy} ETH

Respond with JSON: {"reasoning": "your analysis", "decision": "approve|reject|review", "confidence": 0.0-1.0}
```

### P0-3: Presentation / Demo Video

**Builder guide says:** "Demo video URL - Very strongly recommended. For our human judges to review what AI can't!"

Options:
- **Loom** — record screen + narration, 2 min max
- **Slides** — NOT needed per builder guide. The demo video IS the presentation.

Just record the demo flow from DEMO_GUIDE.md. No slides needed.

### P1-1: UI/UX Improvements

The current UI is functional but basic. Quick wins:

1. **Animated status indicator** — pulse dot for "processing" state
2. **Better typography** — add tagline below GEASS header
3. **Transaction result animations** — fade in results
4. **Mobile responsive** — check on narrow screens
5. **Loading spinner** — show during setup/send instead of just "Running..."

**Reality check:** The judges said "Is this a working thing or a vibe coded frontend?" Your UI proves it works. Don't over-polish at the expense of breaking something. The prettified output cards are already good.

### P1-2: Check Hackathon Feedback

Query the Synthesis API for any feedback on the submission. (Research agent checking this.)

## Execution Order

1. Fix Venice prompt (10 min) — makes the reasoning card actually interesting
2. Fix Transactions page (20 min) — Basescan API + localStorage hybrid
3. Deploy + test (10 min)
4. Record demo video (30 min) — Loom, follow DEMO_GUIDE.md
5. Update submission with video URL (5 min)

## Acceptance Criteria

- [ ] Venice reasoning shows meaningful analysis, not just "within policy"
- [ ] Transactions page shows real transaction history
- [ ] Demo video recorded and uploaded to submission
- [ ] All changes deployed to geass.robbyn.xyz

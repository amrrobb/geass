---
title: "fix: Submission polish — make all 6 judging criteria strong"
type: fix
status: active
date: 2026-03-20
---

# fix: Submission Polish — All 6 Criteria Strong

## Context

Hackathon deadline: March 22 11:59 PM PST. Judging: March 23-25.
Project is published, live, and functional. This plan addresses the gaps to move every scoring dimension from medium to strong.

## Scoring Gap Analysis

| Criteria | Current | Target | Gap |
|----------|---------|--------|-----|
| 1. Problem Clarity | Strong | Strong | None |
| 2. Technical Execution | Strong | Strong | None |
| 3. AI × Crypto Integration | Strong | Strong | None |
| 4. Originality | Medium | Strong | Need sharper "why this combination" narrative |
| 5. Impact Potential | Medium | Strong | Need concrete use cases, who needs this |
| 6. Completeness | Medium-Weak | Strong | AGENTS.md, demo video, pretty output, cover image, conversation log |

## Proposed Solution

### P0 — Must do (directly affects judging)

#### P0-1: Create AGENTS.md (30 min)

Builder guide says: "Include an AGENTS.md file in your git repo. This helps agentic judges understand your system's capabilities and interface more effectively."

**This is how AI judges know what your agent does.** Without it, they're guessing.

Content:
- Agent name, purpose, one-line description
- Available commands with exact syntax
- What the agent keeps secret (the three pillars)
- How to interact (live URL + CLI)
- Architecture overview (delegation → Venice → execution → SIWA)
- On-chain contracts and addresses
- What to test: the 6-step demo flow
- Expected outputs for each command

#### P0-2: Prettify command output (1.5 hrs)

Current: raw `JSON.stringify(json, null, 2)` in a `<pre>` block.
Judge sees: a green monospace wall of JSON.

**Fix:** Parse the response and render structured cards:
- **Approve/reject badge** — green checkmark or red X, large and obvious
- **Venice reasoning** — highlighted in a distinct card with "Private Reasoning (Venice.ai)" header
- **Policy check** — show limit vs amount visually
- **Tx hash** — clickable Basescan link
- **SIWA signature** — formatted with agent address highlighted
- **Error states** — red card with clear message, not raw JSON

This is the single biggest visual upgrade. Judges click the live site and see polished output instead of JSON dumps. Moves criteria 6 from weak to strong.

#### P0-3: Upload cover image to submission (5 min)

**File:** `geass_square.png` exists in repo but isn't in the submission.

Update project with `coverImageURL` pointing to the raw GitHub URL.

#### P0-4: Beef up conversation log (20 min)

Current log is one sentence. The builder guide says: "Document your process. Use the conversationLog field to capture your human-agent collaboration. Brainstorms, pivots, breakthroughs. This is history."

Update with:
- Initial architecture: Lit Protocol TEE for key isolation
- The pivot: MetaMask Delegation Framework (why — Lit was overkill, delegation is more elegant)
- Security audit: found command injection in execSync, replaced with direct imports
- Performance: eliminated 2-5s cold start per request
- Venice integration: added fail-closed, include_venice_system_prompt:false
- SIWA: server-side signing to prove agent identity
- Status Network: gasless deployment for bounty qualification

#### P0-5: Strengthen Impact Potential in description (20 min)

Current description says WHAT the agent does but not WHO needs it or WHY it matters at scale.

Add concrete use cases to the project description:
- **DAO Treasury Agent**: Pays contributors without revealing salary amounts on-chain. Delegation limits what the agent can spend per contributor. Venice reasons about payment priority privately.
- **DeFi Strategy Agent**: Executes trades without linking the human's wallet to the strategy. Competitors can't front-run or copy based on wallet analysis.
- **Subscription Agent**: Pays for services (API calls, SaaS) without linking the human's identity to their usage patterns.

Frame impact as: "Every agent that moves money needs scoped authority. Every agent that reasons needs private cognition. Every agent that authenticates needs identity separation. GEASS is the privacy primitive for all of them."

#### P0-6: Add logo to dashboard (10 min)

The GEASS sigil is distinctive. Put it in the nav/header. Instant personality and memorability for judges.

### P1 — Should do (strengthens scoring)

#### P1-1: Record demo video (30 min)

Builder guide: "Very strongly recommended. Human judges can't parse live demos as well."

Record a 2-minute Loom:
1. Open https://geass.robbyn.xyz
2. Walk through the 6-step demo from DEMO_GUIDE.md
3. Show Basescan tx for proof
4. Narrate the three secrets

Upload to YouTube/Loom, add `videoURL` to submission.

#### P1-2: Sharpen originality narrative (15 min)

Update project description to explicitly answer "what's new here?"

"Privacy agents exist. Delegation frameworks exist. What doesn't exist is the combination: an agent that reasons privately (Venice), spends within on-chain-enforced limits (MetaMask Delegation), and authenticates without revealing its principal (SIWA). Each layer is necessary — remove any one and the privacy guarantee breaks. This is a full-stack privacy primitive for agents, not a wrapper around a single tool."

### P2 — Nice to have

#### P2-1: Moltbook post

Create a post on their social platform for extra visibility.

## Execution Order

1. **AGENTS.md** — unblocks AI judges immediately
2. **Prettify output** — biggest visual change
3. **Logo in dashboard** — quick personality boost
4. **Cover image + conversation log** — submission metadata
5. **Impact story + originality** — description updates
6. **Demo video** — record and upload
7. **Push + update submission + redeploy**

## Acceptance Criteria

- [ ] AGENTS.md in repo with full agent capabilities and interaction guide
- [ ] Command output shows formatted cards (approve/reject badge, Venice reasoning, Basescan links)
- [ ] Logo visible in dashboard
- [ ] Cover image in submission
- [ ] Conversation log tells the build story (pivot, security audit, key decisions)
- [ ] Description includes concrete use cases (DAO treasury, DeFi strategy, subscription agent)
- [ ] Description answers "what's new" explicitly
- [ ] Demo video recorded and linked (P1)
- [ ] Live site redeployed with all changes
- [ ] Submission updated via API

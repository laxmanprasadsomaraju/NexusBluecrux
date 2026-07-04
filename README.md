# NEXUS by Bluecrux

**A Supply Chain Exception & Escalation Hub — turning alerts into governed, tracked, cross-team decisions.**

> "QC always wanted a seat at the table in supply consensus meetings and we could go but we weren't getting any value from them because we didn't have the capability to show what our capacities were." — AstraZeneca, Director of QC Capacity & Modelling

---

## 1. What is this tool?

NEXUS sits on top of the supply chain systems a manufacturer already has — **Axon, Helion, Anaplan, Binocs, SAP** — and catches the problems those systems detect (a QC hold, a CMO capacity gap, a safety-stock breach, a cold-chain excursion) *before* they turn into a missed shipment or a blown launch date.

Every detected problem becomes an **exception**: a single record with a severity, a named owner, a deadline, an AI-suggested resolution, and a live, append-only audit trail of everything anyone did about it. Nothing gets resolved by chasing people over email or in a Teams thread that nobody else can see — it happens inside one governed queue that a director can audit six weeks later and a QC analyst can act on in sixty seconds.

**What NEXUS is not:**
- Not another dashboard — Axon already does dashboards.
- Not a replacement for Axon, Helion, Binocs, or SAP — it sits on top of them.
- Not a generic ticketing tool — it is purpose-built for supply chain exceptions, with pharma/biotech-grade audit requirements baked in.
- Not an AI that makes decisions — it suggests, a named human approves, everything is timestamped and signed.

## 2. The problem it solves (real case studies)

The product brief behind this build was grounded entirely in **Bluecrux's own published client case studies** — not a hypothetical. The pattern is identical across every one of them: the tools to *detect* a problem already exist, but there is no governed process to see it, own it, resolve it, and prove it was resolved.

| Client | Industry | What actually happened | Real quote / documented pain |
|---|---|---|---|
| **AstraZeneca** | Pharma | QC lab teams tracked capacity in manual Excel reports. By the time a batch's QC hold surfaced as a supply risk, Supply Chain had already made planning decisions without them — nobody's fault, there was just no shared real-time view. | *"QC always wanted a seat at the table in supply consensus meetings... we weren't getting any value from them because we didn't have the capability to show what our capacities were."* — AZ Director of QC Capacity & Modelling |
| **Argenx** (biotech, €2.2B revenue) | Biotech | No systematic way to flag, escalate, and resolve capacity problems across a network of external CMO manufacturing partners. Every issue became a fire drill run over email. | *"Difficulties in aligning supply chain planning across different regions and CMO partners... no integration between long-term network planning and order management."* |
| **Maesa** | Beauty / CPG | No exception alerting meant inventory problems were discovered late; planning stayed reactive and fully manual. | *"High inventory due to difficulty in balancing cash, cost & service... desire to move away from manual planning."* |
| **Clariant Catalysts** | Chemicals | Nobody had a structured view of what exceptions existed, who owned them, or what they were costing — Bluecrux had to run a 4-month manual diagnostic just to surface the problems. | *"The main challenge centred on the perception that there were limited opportunities to reduce inventory."* |

**The common thread:** every one of these clients already had excellent detection tools. What none of them had was a governed layer that could (1) show the exception with business impact attached, (2) assign a named owner and a deadline, (3) track whether it actually got resolved and how long it took, and (4) report the value protected vs. value at risk to leadership. That missing layer is exactly what NEXUS is.

This build directly recreates the three flagship scenarios from those case studies as seeded demo data — see [§5](#5-the-three-flagship-demo-flows).

## 3. Who uses it, and why it's useful to them

| Persona | What they get out of NEXUS |
|---|---|
| **QC / Lab Ops Manager** (AstraZeneca scenario) | Gets notified the moment a batch hold creates a downstream supply risk, sees an AI-suggested fix grounded in real scheduling data, approves it in two clicks, done. |
| **External Manufacturing Manager** (Argenx scenario) | Sends a structured capacity request to a CMO partner through the tool instead of an email chain, watches their response land in the same timeline, and gets auto-escalated to a director if the partner goes quiet. |
| **SC Planner** (Maesa scenario) | Sees a safety-stock breach with the exact stockout date and an AI-costed expedite option, instead of noticing the problem when the warehouse is already empty. |
| **Supply Chain Director / VP** | Opens one screen and sees total value at risk, team response times, and the resolution trend — without a status meeting or chasing five people for an update. |
| **CMO / supplier partner** (e.g. Lonza) | Signs into their own scoped portal, sees only the requests addressed to them, and responds directly — their response is logged straight into the client's audit trail. |
| **Compliance / QA** | Every action, approval, and escalation is hash-chained and append-only — nothing can be edited or deleted after the fact, which is the GxP-grade requirement regulated life-sciences clients need. |

The measurable payoff (from the product brief's own success metrics): time-to-first-action on a critical exception drops from **1–3 days via email to a target of under 4 hours**; the executive view turns "how are we doing" from a status meeting into a screen anyone can open unprompted.

## 4. Run it locally

Two processes, no external services, no signup, no API keys.

```bash
# 1) Backend — FastAPI + SQLite, seeded with demo data automatically on first run
cd backend
./run.sh
# → http://localhost:8000   (interactive API docs at http://localhost:8000/docs)

# 2) Frontend — React + TypeScript + Vite, in a second terminal
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

Open `http://localhost:5173`, pick any seeded persona on the login screen (no password — this stands in for Microsoft Entra ID SSO), and you're in.

**To reset all demo data back to the canonical seeded state at any time:**
```bash
cd backend && source venv/bin/activate && python seed.py
```
This drops and recreates every table. All user IDs change, so clear `localStorage` / log in again afterwards.

Full details (project layout, every screen, API reference) live in [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md).

## 5. The three flagship demo flows

These are seeded, fully-built-out exceptions with realistic timelines — not empty placeholders. Log in as the named persona and click through:

1. **AstraZeneca QC hold** (`eric.rousseau@nexus-demo.io`) — Batch X-4421 enters a QC hold at Site 3, Axon flags a 3-day EU release-window risk, and NEXUS auto-assigns it to Eric as QC Ops Lead. He opens it, sees the €1.2M impact and an 87%-confidence AI suggestion to re-slot the batch with a specific analyst, and approves it in two clicks — the decision is pushed back to Binocs and logged with his name and a timestamp.
2. **Lonza / Argenx CMO capacity shortfall** (`maria.kovacs@nexus-demo.io`) — Helion detects a 3,200-unit shortfall six weeks before a launch. Maria sends a structured capacity request to Lonza through the tool; log in as `lonza.portal@nexus-demo.io` to see the partner-side portal where Lonza's own contact responds directly, with Samsung Biologics confirmed as backup for the shortfall.
3. **Maesa inventory drift** (`jana.lindqvist@nexus-demo.io`) — Axon detects SKU-089 safety stock has dropped to 4.2 days against a 14-day policy, with a stockout projected in 5 days. Jana approves a 91%-confidence air-freight expedite suggestion, which pushes a purchase-order change to SAP.

Log in as `nina.vos@nexus-demo.io` (the only admin account) to see the workspace from the operator's side: Integrations, Users & permissions, Workspace settings, and a full Audit log.

## 6. What was verified end-to-end

Every screen and every interactive control was driven directly against the live backend (no mocks) and confirmed working, including:

- **Exception queue** — stat-card filters, filter pills, search, CSV export (real file download), Sync (pulls real new exceptions from the seeded integrations and re-runs the rule engine live), Raise Exception (validation showing all errors at once, discard-changes confirmation, successful creation with a "New" badge and toast).
- **Exception detail** — two-step Approve → Confirm flow (idempotent, backend-verified), Escalate (with target/deadline/note), inline Add note, Open-in-source deep link (opens a new tab with a signed mock URL), AI suggestion box with hover disclaimer.
- **My Actions** — Review/Start opening a full detail drawer, urgency-sorted buckets, completed items dropping into a "Completed today" section.
- **Executive View** — resolution trend / by-source / team-response charts rendering real aggregated data, and a working PDF export that opens a server-generated file.
- **Partner Network** — row click filters the queue to that partner, name click opens a 90-day scorecard drawer with real trend data.
- **Alert Rules** — enable/disable toggle and full rule creation with validation, both persisted and audited.
- **Teams** — real rosters (lead, members, open-exception counts, escalation path) pulled from the same user data as everywhere else.
- **Admin** — Integrations connect/disconnect, Users invite/re-invite/role-change/deactivate-reactivate, Workspace Settings save-and-persist, and an Audit log showing the full history of every one of those actions.
- **Notifications** and **AI assistant** — live polling panel with mark-all-read, and a chat drawer that answers real questions ("what's my biggest risk?") grounded in the caller's actual permitted data.
- **Partner Portal** (`lonza.portal@nexus-demo.io`) — lands on its own shell, cannot reach any internal route (and vice versa), sees only Lonza-scoped exceptions, and can submit a response that immediately appears in both the client-side timeline and the partner's own Messages view.

No console errors were found during this pass; one real bug (a duplicate-React-key warning when an exception's type and source system were both "Manual") was found and fixed in `frontend/src/pages/ExceptionQueue/ExceptionCard.tsx`.

## 7. Repo layout

```
backend/    FastAPI + SQLAlchemy + SQLite API, seed script, full endpoint reference
frontend/   React + TypeScript (Vite) app — every screen listed above
docs/       Original product spec, colour/interaction spec, click-through prototypes
```

See [`backend/README.md`](backend/README.md) for the API contract and [`frontend/README.md`](frontend/README.md) for the frontend project layout, demo account table, and screen-by-screen reference.

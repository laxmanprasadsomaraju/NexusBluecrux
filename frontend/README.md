# NEXUS by Bluecrux — Frontend

A Supply Chain Exception & Escalation Hub. React + TypeScript (Vite), CSS Modules,
TanStack React Query, react-router-dom. Talks directly to the FastAPI backend in
`../backend` — no mocks, no MSW layer.

## Run it

```bash
# 1. Backend (from repo root)
cd backend && ./run.sh          # http://localhost:8000, docs at /docs

# 2. Frontend
cd frontend
npm install
npm run dev                     # http://localhost:5173
```

`frontend/.env` points the app at `VITE_API_URL=http://localhost:8000`. Change it if
the backend runs elsewhere.

To reset all demo data back to a known-good state at any time:

```bash
cd backend && source venv/bin/activate && python seed.py
```

This drops and recreates every table, so **all users get new IDs** — sign out and
back in again in the browser after reseeding (`localStorage.clear()` if the app looks
stuck on a 401 loop).

## Logging in

There's no password. `/login` shows a persona picker for every seeded account,
grouped by role. Pick a name and you're in as that user for the rest of the session.
Switch users any time from the sidebar (bottom-left, click your name → pick someone
else) without going back to `/login`.

| Name | Email | Role | What they see |
|---|---|---|---|
| Eric Rousseau | eric.rousseau@nexus-demo.io | Planner (QC Ops Lead) | Full internal app, owns the AstraZeneca QC-hold exceptions |
| Maria Kovacs | maria.kovacs@nexus-demo.io | Manager (External Mfg) | Owns the Lonza/Samsung Biologics capacity exceptions |
| Jana Lindqvist | jana.lindqvist@nexus-demo.io | Planner (SC Planner) | Owns the Maesa inventory-drift exceptions |
| Tom Berger | tom.berger@nexus-demo.io | Manager (Procurement) | Owns lead-time-drift and cold-chain exceptions |
| Sofie De Vries | sofie.devries@nexus-demo.io | Planner (Demand Planner) | Owns forecast-accuracy exceptions |
| A. Janssens | a.janssens@nexus-demo.io | Director | Same queue as everyone + escalation target |
| Nina Vos | nina.vos@nexus-demo.io | **Admin** | Everything above **plus** Integrations, Users, Settings, Audit log |
| Lonza Portal | lonza.portal@nexus-demo.io | **Partner** | A completely different shell (`/partner/*`) scoped to Lonza's own exceptions only |

Planner/manager/director/admin land on `/exceptions`. The partner account lands on
`/partner/queue` and cannot reach any internal route (it redirects back). Internal
users who try to open `/partner/*` get redirected the other way.

## What's already "lived in"

The seed data isn't a blank slate — it's built to look like a workspace that's been
running for a few weeks:

- **20 exceptions** spanning the last 4 weeks: the three flagship flows from the
  product spec (AstraZeneca QC hold, Lonza/Argenx capacity shortfall, Maesa inventory
  drift) plus ~17 more with a mix of severities, sources and statuses, most of the
  older ones already resolved with a full timeline of who did what and when.
- **Audit log** with ~15 backdated entries going back 6 weeks: integrations being
  connected one by one as the rollout progressed, a rule getting tuned and later
  disabled for being noisy, a user invited and promoted, settings changed, CSV/PDF
  exports. `/audit-log` (admin-only) shows this history immediately, no setup needed.
  Every mutating action you take in the UI (approve, escalate, connect an
  integration, invite a user, save settings...) adds a new row here or to the
  relevant exception's timeline — nothing is ever edited or deleted.
- **Users & permissions** includes one `invited`-but-not-yet-active user (Priya
  Nair) alongside the 8 active accounts, so the screen shows a realistic mix of
  statuses, not just "everyone active."
- **Notifications**, **sync log**, and **integrations** (6 connected, 3 disconnected
  with working Connect buttons) are all pre-populated the same way.

If you want a completely fresh start, re-run `python seed.py` (see above) — every
button and flow works from that clean state too, it just won't have history yet
until you start clicking around.

## Screens (all real, nothing is a static mock)

| Route | Who | What it does |
|---|---|---|
| `/exceptions` | everyone (default landing) | The core screen — stat strip, filter pills, search, exception list + detail panel with impact analysis, AI suggestion, activity timeline, two-step approve, escalate, add note, open-in-source deep link |
| `/actions` | everyone | Personal to-do list sorted by urgency (Overdue → Due today → Tomorrow → This week), one-click approve/review/start, completed items drop to a "Completed today" section |
| `/executive` | everyone | KPIs, resolution trend chart, exceptions-by-source, team response times, partner performance table, one-click PDF export |
| `/partners` | everyone | Partner table — click a row to filter the queue to that partner, click a name for a 90-day scorecard drawer |
| `/rules` | everyone (view); admin/director (edit) | Alert rules that actually run on every `/sync` call — toggle enabled/disabled, create new ones |
| `/teams` | everyone | Real team rosters pulled from the same user/team data as everywhere else — lead, member avatars, open-exception count, escalation path |
| `/integrations` | **admin only** | Connect/disconnect each source system; recent sync log |
| `/users` | **admin only** | Invite, change role, activate/deactivate; static permissions-by-role reference table |
| `/settings` | **admin only** | SLA hours per severity, feature flags, currency/retention |
| `/audit-log` | **admin only** | Full append-only history of non-exception mutations |
| `/partner/queue` | partner role only | Their own scoped exceptions ("requests"), respond or decline, full timeline |
| `/partner/messages` | partner role only | Every note/response they've exchanged, aggregated across their requests |

Global overlays (mounted once, available from any internal screen): Raise Exception
modal, Escalate modal, the "Ask AI" assistant drawer (hits the real
`/assistant/query` endpoint — try "What's my biggest risk?" or "Summarise the
queue"), and the notifications bell (polls every 30s).

## The three flagship flows, if you want to click through them end to end

1. **AstraZeneca QC hold** — log in as Eric Rousseau, open "Batch X-4421 QC hold at
   Site 3", read the AI suggestion (87% confidence), click **Approve re-slot** →
   **Yes, approve**. Status flips to "Action taken — monitoring", a new timeline
   entry appears, and the action disappears from his My Actions list into Completed.
2. **Lonza capacity shortfall** — log in as Maria Kovacs, open the Lonza 3,200-unit
   exception, see the partner's partial response already in the timeline. Then log
   in as the Lonza Portal partner account and respond to the same request from
   their side of the fence at `/partner/queue`.
3. **Maesa inventory drift** — log in as Jana Lindqvist, open the SKU-089 exception,
   approve the 91%-confidence air-freight suggestion.

## Project layout

```
src/
  api/        one file per backend resource, thin fetch wrappers + queryKeys.ts
  hooks/      useAuth, useApproveFlow, useSync, useRaiseException, useEscalate, ...
  context/    AuthContext (token/user), UiContext (overlay + "just created" state)
  components/ design-system primitives (Button, Badge, Card, Table, Modal, Drawer, ...)
  layout/     AppShell + Sidebar + Topbar (internal), PartnerShell + PartnerTopbar
  pages/      one folder per screen
  overlays/   RaiseExceptionModal, EscalateModal, AiAssistantDrawer, NotificationsPanel
  lib/        tokens.ts (colour constants), severity.ts, statusBadges.ts, formatters.ts, validators.ts
  styles/     tokens.css (design tokens) + global.css
```

Every colour, radius and spacing value traces back to `docs/COLOUR_SPEC.txt` via
`src/styles/tokens.css` / `src/lib/tokens.ts` — there should be no hardcoded hex
values anywhere else in the app.

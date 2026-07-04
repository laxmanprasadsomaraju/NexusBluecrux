# NEXUS by Bluecrux

A Supply Chain Exception & Escalation Hub — turns alerts from Axon, Helion, Anaplan,
Binocs and SAP into assigned, tracked, time-bound actions with a named owner, a
deadline, an AI-suggested resolution, and a live audit trail.

This repo contains:

- **`backend/`** — FastAPI + SQLAlchemy + SQLite API, fully seeded with demo data
  (three flagship flows: AstraZeneca QC hold, Lonza/Argenx CMO capacity shortfall,
  Maesa inventory drift). See [`backend/README.md`](backend/README.md) for the full
  endpoint list, auth flow, and what's mocked vs. real.
- **`frontend/`** — React + TypeScript (Vite) app implementing every screen: exception
  queue, my actions, executive view, partner network, alert rules, teams, admin
  (integrations/users/settings/audit log), AI assistant, notifications, and a
  separate partner-facing portal. See [`frontend/README.md`](frontend/README.md) for
  how to run it, demo accounts, and a screen-by-screen guide.
- **`docs/`** — the original product spec, colour/interaction spec, and click-through
  design prototypes this build was implemented against.

## Quick start

```bash
# backend — http://localhost:8000 (docs at /docs)
cd backend && ./run.sh

# frontend — http://localhost:5173
cd frontend && npm install && npm run dev
```

Log in at `/login` by picking any seeded persona (no password) — see
[`frontend/README.md`](frontend/README.md) for the full account list and what each
role can see.

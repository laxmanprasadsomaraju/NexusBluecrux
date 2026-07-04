# NEXUS by Bluecrux — Backend

FastAPI + SQLAlchemy + SQLite implementation of the Supply Chain Exception &
Escalation Hub described in `docs/PRODUCT_SPEC.txt` and `docs/NEXUS_Backend_Spec.md`.

## Run it

```bash
cd backend
./run.sh
```

`run.sh` creates a venv if one doesn't exist, installs `requirements.txt`, seeds the
database the first time only (if `nexus.db` isn't already there), and starts the API
on **http://localhost:8000** with `--reload`.

Manual equivalent:

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python seed.py            # first time only — see "Resetting demo data" below
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Interactive API docs: http://localhost:8000/docs

### Resetting demo data

`python seed.py` **drops and recreates every table**, then re-inserts the canonical
demo dataset. It's safe to re-run any time you want to wipe whatever a demo session
changed and get back to a known-good state. `run.sh` only calls it automatically when
`nexus.db` doesn't exist yet, so normal restarts of the server never wipe your data.

## Demo users ("log in as" picker)

`POST /auth/login` takes `{"email": "..."}` — no password. Seeded accounts:

| Name | Email | Role | Title | Team / Partner |
|---|---|---|---|---|
| Eric Rousseau | `eric.rousseau@nexus-demo.io` | planner | QC Ops Lead | QC |
| Maria Kovacs | `maria.kovacs@nexus-demo.io` | manager | External Manufacturing Manager | External Mfg |
| Jana Lindqvist | `jana.lindqvist@nexus-demo.io` | planner | SC Planner | SC Planning |
| Tom Berger | `tom.berger@nexus-demo.io` | manager | Procurement Lead | Procurement |
| Sofie De Vries | `sofie.devries@nexus-demo.io` | planner | Demand Planner | Demand Planning |
| A. Janssens | `a.janssens@nexus-demo.io` | director | Supply Chain Director | Supply Chain |
| Nina Vos | `nina.vos@nexus-demo.io` | admin | IT / Operations Admin | IT / Operations |
| Lonza Portal | `lonza.portal@nexus-demo.io` | partner | Lonza Partner Contact | Partner: Lonza |

The response includes a JWT (`access_token`) — send it as `Authorization: Bearer <token>`
on every other call.

## Seeded demo data

- 5 partners: Lonza, Samsung Biologics, Evonik, DSV, Catalent
- 7 teams: QC, SC Planning, External Mfg, Procurement, Demand Planning, IT / Operations, Supply Chain
- 6 alert rules (one disabled, matching the prototype)
- 11 integrations (Axon, Binocs, Helion, SAP, Anaplan, Teams, Entra ID connected; Slack, OMP, Partner portal disconnected/Phase 2)
- ~20 exceptions spread across the last 4 weeks, including the three flagship flows
  from the product spec, each with a full timeline, a linked action, and (for Flow A
  and Flow C) an AI suggestion:
  - **Flow A** — Batch X-4421 QC hold at AstraZeneca (Critical, €1.2M, owner Eric Rousseau)
  - **Flow B** — 3,200-unit Lonza capacity shortfall (Critical, €2.1M, owner Maria Kovacs, partner flow through to Samsung Biologics backup)
  - **Flow C** — SKU-089 safety stock breach at Maesa (High, €340K, owner Jana Lindqvist)

## What's mocked vs. real (and how to swap in the real thing)

- **Auth** — `POST /auth/login` trusts a bare email, standing in for Microsoft Entra
  ID / OIDC SSO (no password, no MFA, because there's no real Entra tenant available
  here). To go real: point the frontend at Entra's OAuth2/OIDC flow, validate the
  returned `id_token` server-side instead of trusting the email, and keep the same JWT
  issuance / `get_current_user` shape for the rest of the app.
- **Integrations** (Axon, Binocs, Helion, SAP, Anaplan) — `app/integrations/*.py` are
  small Python adapters with a canned, deterministically-cycling pool of "next
  exception" records instead of real HTTP calls, so demos are repeatable and never
  flaky. Each implements the same `pull_exceptions(cursor)` / `push_decision(decision)`
  interface a real adapter would use — swap the body for real API/OData calls and
  everything else (rule engine, routing, timeline writes) is unchanged.
- **Microsoft Teams** — `app/integrations/teams.py` just writes a `sync_log` row
  instead of POSTing an Adaptive Card to a real webhook URL.
- **AI assistant** (`POST /assistant/query`) — a rule-based/template responder
  (`app/routers/assistant.py`) that pattern-matches the question and answers from real,
  row-level-scoped DB data. It is NOT calling any LLM. To go real: replace
  `_build_reply()` with a call to Azure OpenAI, feeding it the same permitted-data
  context already assembled here (row-level security is applied before retrieval
  either way).
- **AI suggestions on exceptions** — seeded/static text with a confidence score,
  standing in for a real RAG pipeline grounded in Axon/Binocs/SAP data.
- **PDF report** (`POST /reports/executive-pdf`) — generated locally with `fpdf2` and
  saved under `backend/generated_reports/`, served back at `/reports/files/<name>`.
  Stands in for rendering + uploading to Azure Blob Storage and returning a signed SAS
  URL — swap the "save locally, return a relative path" step for an upload + SAS URL.
- **Database** — SQLite file (`nexus.db`) instead of PostgreSQL. Swap `DATABASE_URL` in
  `app/database.py`; the SQLAlchemy models are portable as-is.
- **Key Vault** — `POST /integrations/{id}/connect` stores only a placeholder
  `kv://nexus/<id>-api-key` reference plus a redacted blob, never a real secret — a
  real deployment stores the credential in Azure Key Vault and keeps only the vault
  reference here.
- **Append-only audit trail** — `timeline_events` has no UPDATE/DELETE endpoint
  anywhere in the API (enforced in the application layer, since SQLite has no
  per-table GRANT/REVOKE like Postgres) plus a per-row hash chain (`prev_hash` ->
  `hash`) for tamper evidence, matching the spec's GxP/audit requirements.

## Full endpoint list

**Auth**: `POST /auth/login`, `GET /auth/me`

**Exceptions**: `GET /exceptions`, `GET /exceptions/stats`, `GET /exceptions/export`,
`GET /exceptions/{id}`, `POST /exceptions`, `POST /exceptions/{id}/approve/init`,
`POST /exceptions/{id}/approve`, `POST /exceptions/{id}/escalate`,
`POST /exceptions/{id}/notes`, `POST /exceptions/{id}/ack`, `GET /exceptions/{id}/deeplink`

**Actions**: `GET /actions`, `PATCH /actions/{id}`

**Analytics**: `GET /analytics/resolution-trend`, `GET /analytics/by-source`,
`GET /analytics/team-response`, `GET /analytics/value-at-risk`, `GET /analytics/on-time-rate`

**Partners**: `GET /partners`, `GET /partners/{id}/scorecard`, `POST /partners/{id}/requests`

**Integrations**: `GET /integrations`, `POST /integrations/{id}/connect`,
`POST /integrations/{id}/disconnect`, `GET /integrations/sync-log`

**Sync**: `POST /sync`, `GET /sync/{job_id}`

**Alert rules**: `GET /rules`, `POST /rules`, `PATCH /rules/{id}`

**Users**: `GET /users` (any authenticated user, minimal fields), `POST /users/invite`
(admin), `POST /users/{id}/reinvite` (admin), `PATCH /users/{id}` (admin — role/status)

**Workspace settings**: `GET /settings`, `PUT /settings` (admin)

**Notifications**: `GET /notifications`, `POST /notifications/read-all`

**Assistant**: `POST /assistant/query`

**Reports**: `POST /reports/executive-pdf`, files served at `GET /reports/files/{filename}`

**Audit log**: `GET /audit-log` (admin) — filterable by `actor`, `entity_type`,
`entity_id`, `since`, `until`

**Health**: `GET /health`

## Security notes

- RBAC roles: `planner`, `manager`, `director`, `partner`, `admin`.
- Row-level security: users with role `partner` only ever see exceptions/partners
  scoped to their own `partner_id`; all other roles see the shared queue (matching the
  prototype, which shows every internal role the same queue with a client-side "Mine"
  filter rather than per-team server-side scoping).
- Two-step confirm + idempotency on approvals: `POST /exceptions/{id}/approve/init`
  issues a short-lived `confirm_token`; `POST /exceptions/{id}/approve` requires that
  token plus an `Idempotency-Key` header, and replays of the same key return the
  original result instead of double-applying the decision.
- Deactivating a user takes effect immediately (no separate token-revocation list
  needed) because every request re-reads the user's `status` from the database.

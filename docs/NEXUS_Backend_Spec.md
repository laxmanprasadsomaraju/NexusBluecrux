# NEXUS by Bluecrux — Full Backend & Product Specification
**Developer handoff — build spec for the working prototype `NEXUS.dc.html`**
Every button in the prototype maps to an API contract below. Stack (per product spec): React + TypeScript frontend · Python + FastAPI backend · PostgreSQL + append-only event store · Azure deployment · Azure OpenAI (RAG) · Microsoft Entra ID.

---

## 1. Data model (PostgreSQL)

| Table | Key fields |
|---|---|
| `exceptions` | id, title, severity (critical/high/medium), status, type, source_system, company, partner_id?, owner_id, rule_id?, impact_json, value_at_risk, risk_date, sla_due_at, created_at, resolved_at |
| `timeline_events` (append-only, no UPDATE/DELETE grants) | id, exception_id, kind (detected/action/note/escalation/system), actor_id, actor_type (user/system/partner/ai), body, metadata_json, created_at |
| `actions` | id, exception_id, assignee_id, title, kind (approve/review/start), due_at, status (open/in_progress/done), completed_at |
| `users` | id, entra_oid, email, name, role (planner/manager/director/partner/admin), team_id, status (active/invited/deactivated), last_active_at |
| `teams` | id, name, lead_id, escalation_path_json |
| `partners` | id, name, type (cmo/supplier/3pl), contact_channel, avg_response_hours, status |
| `alert_rules` | id, name, condition_dsl, severity, route_to_role, source_system, enabled |
| `integrations` | id, system, direction (read/write/rw/sso/webhook), status, config_json (encrypted), last_sync_at |
| `notifications` | id, user_id, kind, text, entity_ref, read_at, created_at |
| `workspace_settings` | singleton: sla_hours_json, currency, retention_years, feature_flags_json |
| `ai_suggestions` | id, exception_id, body, confidence, model_version, prompt_hash, accepted_at?, accepted_by? |

Event store: `timeline_events` is the audit log. Enforce append-only at DB level (REVOKE UPDATE/DELETE) + hash-chain each row (prev_hash) for tamper evidence — required for GxP/regulated pharma clients.

---

## 2. Every button → API contract

### Exception queue
| UI element | Endpoint | Behaviour |
|---|---|---|
| Queue load / filter pills / stat cards / search | `GET /exceptions?severity=&status=&owner=me&partner=&q=` | Server-side filtering + pagination. Stat cards: `GET /exceptions/stats` (counts, deltas vs last week, avg time-to-act). |
| Exception card click | `GET /exceptions/{id}` | Full detail: impact, rule trace, AI suggestion, timeline, allowed actions (per role). |
| **Sync** | `POST /sync` | Enqueues pull jobs per connected integration (Azure Service Bus). Returns job id; UI polls `GET /sync/{jobId}`. New exceptions created by rule engine (below). |
| **Raise exception** submit | `POST /exceptions` | Validates title/severity/owner. Writes exception + `detected` timeline event ("raised manually by X") + notification to owner + Teams webhook if enabled. |
| Export CSV | `GET /exceptions/export?format=csv&…filters` | Streams CSV; respects the caller's row-level permissions. Logged to audit. |

### Detail panel
| UI element | Endpoint | Behaviour |
|---|---|---|
| **Approve [action]** (after Confirm step) | `POST /exceptions/{id}/approve` | Idempotency key required. Writes `action` timeline event with actor + timestamp; pushes decision to source system (Binocs re-slot, SAP PO change) via integration adapter; sets status `action_taken`; marks AI suggestion accepted if it matched. Two-step confirm is enforced client AND server side (`confirm_token` issued by `POST /exceptions/{id}/approve/init`). |
| **Escalate** submit | `POST /exceptions/{id}/escalate` | Body: target_user, deadline, note. Notifies target (in-app + Teams), status → `escalated`, timeline event. Auto-escalation: scheduler checks `sla_due_at`/partner deadlines and calls the same endpoint as `actor_type=system`. |
| **Add note** | `POST /exceptions/{id}/notes` | Appends `note` timeline event. No edit/delete endpoints exist — by design. |
| **Open in [source]** | `GET /exceptions/{id}/deeplink` | Returns signed deep-link URL to the exact record in Axon/Binocs/SAP. |

### My actions
| UI element | Endpoint |
|---|---|
| List | `GET /actions?assignee=me&status=open` sorted overdue → due today → tomorrow → week |
| Approve (with Confirm) | same `POST /exceptions/{id}/approve`; action row → `done`, moves to Completed today |
| Review / Start | `PATCH /actions/{id}` status `in_progress` |

### Executive view
| UI element | Endpoint |
|---|---|
| Trend / by-source / team response charts | `GET /analytics/resolution-trend?weeks=4`, `GET /analytics/by-source`, `GET /analytics/team-response` |
| Value at risk / on-time rate | `GET /analytics/value-at-risk`, `GET /analytics/on-time-rate` (target from workspace_settings) |
| **Export PDF** | `POST /reports/executive-pdf` — server-rendered (Playwright/WeasyPrint), stored in Azure Blob, returns signed download URL. Logged to audit. |

### Partner network
| UI element | Endpoint |
|---|---|
| Table | `GET /partners` (open counts by severity, avg response, status computed nightly) |
| Row click | client-side queue filter `?partner=` |
| Partner name → scorecard | `GET /partners/{id}/scorecard?days=90` |
| Send capacity request (Flow B) | `POST /partners/{id}/requests` — structured request via partner portal/email; sets auto-escalation timer |

### Integrations screen
| UI element | Endpoint |
|---|---|
| Cards | `GET /integrations` |
| **Connect / Disconnect** | `POST /integrations/{id}/connect` (OAuth2 client-credentials or API-key stored in **Azure Key Vault**, never in DB plaintext) / `POST …/disconnect` |
| Sync log | `GET /integrations/sync-log` |

Integration adapters (one module each, common interface `pull_exceptions() / push_decision(decision)`):
- **Axon** REST API — read KPI/inventory alerts; write parameter updates
- **Binocs** REST API — read QC holds/scheduling conflicts; write re-slot approvals
- **Helion** REST API — read capacity gaps (Phase 2 write)
- **SAP S/4HANA** OData — read inventory/lead-time/PO; write expedites + PO changes
- **Anaplan** REST — read-only forecast exceptions
- **Microsoft Teams** — outgoing webhook + Adaptive Cards with Acknowledge button (action posts back to `POST /exceptions/{id}/ack`)
- **Email/Outlook (Phase 2)** — structured mail out, inbound parse to timeline
- **MCP server (future)** — expose NEXUS as an MCP tool server (`list_exceptions`, `approve_action`, `raise_exception`) so Claude/agents in the Bluecrux ecosystem can operate the hub with the same RBAC + audit guarantees.

### Alert rules
| UI element | Endpoint |
|---|---|
| List / toggle | `GET /rules`, `PATCH /rules/{id}` (enabled) |
| Create/edit (Phase 2 UI) | `POST /rules` — condition DSL, e.g. `source=binocs AND event=qc_hold AND release_risk_days > 0 → severity=critical, route=qc_ops_lead` |

Rule engine runs on every sync: evaluate → create exception → set severity → resolve owner from route_to_role + team routing → stamp `rule_id` (powers the "Why this exception exists" trace) → notify.

### Users & permissions (admin only)
| UI element | Endpoint |
|---|---|
| Table | `GET /users` |
| **Invite user** | `POST /users/invite` — creates `invited` user, sends Entra B2B invitation email; user signs in with company account, **no password stored in NEXUS**. Resend: `POST /users/{id}/reinvite`. |
| Role dropdown | `PATCH /users/{id}` role — admin only, audited |
| Deactivate/Reactivate | `PATCH /users/{id}` status — sessions revoked immediately on deactivate |

### Workspace settings (admin only)
`GET/PUT /settings` — SLA hours per severity (drives `sla_due_at` + escalation scheduler), currency, retention, feature flags (ai_suggestions, auto_escalation, teams_notifications, partner_portal). Every change audited.

### Notifications & AI chat
- `GET /notifications`, `POST /notifications/read-all`; per-event Teams toggles in user prefs.
- Chat: `POST /assistant/query` — RAG over the caller's *permitted* exceptions/partners/analytics only (row-level security applied before retrieval). Azure OpenAI GPT-4; every answer tagged AI, logged with prompt/response hash; never executes actions — read-only by design.

---

## 3. Security model (enterprise / regulated pharma)

1. **AuthN**: Microsoft Entra ID only (OIDC). Partner users via Entra B2B federation. MFA + conditional access inherited from tenant. Session: short-lived JWT + refresh, revocation list.
2. **AuthZ**: RBAC exactly as the in-app permission matrix (planner/manager/director/partner/admin) enforced server-side per endpoint + **row-level security**: partners see only `partner_id = their org`; planners see own team scope. Roles come from Entra app-role claims; NEXUS role table is the override of record.
3. **Audit**: every mutating call writes a timeline/audit event (actor, IP, timestamp, before/after). Append-only + hash-chained. Retention 5–10 yrs configurable (GxP default 7). One-click CSV export for auditors.
4. **Data protection**: TLS 1.2+; AES-256 at rest (Azure-managed); integration credentials in Key Vault; PII minimisation (name, email, role only); tenant isolation per client org.
5. **Change safety**: two-step confirm on primary actions enforced server-side; idempotency keys; no hard deletes anywhere; soft-deactivate only.
6. **Compliance targets**: SOC 2 Type II, ISO 27001, GxP/GAMP5 validation pack (IQ/OQ docs), 21 CFR Part 11 (e-signature on approvals = re-auth prompt, Phase 2).
7. **Ops**: rate limiting, WAF, Azure Monitor + alerting, RPO ≤ 1h / RTO ≤ 4h, blue-green deploys, seeded demo tenant.

---

## 4. Future / product-level roadmap (owner's view)

- **Partner portal** (highest leverage): scoped partner login, respond to capacity requests, SLA visible both sides.
- **E-signature approvals** (21 CFR Part 11) for regulated decisions.
- **What-if on exceptions**: pull Helion/Axon scenario data into the detail panel before approving.
- **AI action drafting**: AI pre-fills the escalation note / partner request; human always sends.
- **Mobile web + Teams-native app** (approve from an Adaptive Card).
- **Webhooks out** (`exception.created`, `action.approved`…) so clients integrate ServiceNow/Jira without new UI.
- **Multi-workspace / multi-site** rollout with site-scoped routing rules.
- **SLA analytics**: breach prediction (which exceptions will miss SLA, flagged proactively).

---

## 5. End-to-end flows (as clickable in the prototype)

1. **Detection → resolution (AstraZeneca/QC)**: Sync → rule `QC hold + release window risk` creates Critical → routed to QC Ops Lead → notification + Teams → owner opens detail → reads impact + rule trace + AI suggestion → Approve → **Confirm?** → pushed to Binocs → timeline + toast → Executive view shows resolved, value protected.
2. **Partner flow (Argenx/Lonza)**: Helion gap → Critical → External Mfg Manager → capacity request to partner → auto-escalation timer → partner partial response logged → backup site confirmed → Director sees it all without a meeting.
3. **Manual flow**: Raise exception (validated, owner autocomplete) → appears with New badge → owner notified → same lifecycle.
4. **Admin flow**: Invite user (Entra B2B email) → user lands as Invited → signs in via SSO → role governs sidebar + capabilities → deactivate revokes instantly → all audited.

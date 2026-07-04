"""
Seed script for NEXUS by Bluecrux demo data.

Idempotency strategy: this script DROPS and RECREATES every table on each run — the
simplest reliable way to guarantee a known-good demo state. It is safe to re-run any
time you want to reset the database back to the canonical demo scenario. `run.sh`
only calls this automatically the first time (when nexus.db does not yet exist), so
day-to-day restarts of the server do not wipe data created during a demo session —
run `python seed.py` explicitly whenever you want a hard reset.

Seeds: 4+ teams, 5 partners, 8 users spanning all 5 roles, 6 alert rules, 11
integrations, workspace settings, and ~20 exceptions — including the three flagship
flows from the product spec (Flow A: AstraZeneca QC hold, Flow B: Argenx/Lonza CMO
capacity shortfall, Flow C: Maesa inventory drift) fully fleshed out with timelines,
linked actions and AI suggestions, plus a spread of ~17 additional exceptions across
the last 4 weeks (mixed severity/source/status, many already resolved) so that lists,
stats and analytics charts have real, non-trivial data.
"""
import json
from datetime import datetime, timedelta

from app.database import Base, engine, SessionLocal
from app import models, utils


def run():
    print("Dropping and recreating all tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    now = datetime.utcnow()

    # ---------------------------------------------------------------- workspace settings
    settings = models.WorkspaceSettings(
        id=1,
        sla_hours_json=json.dumps({"critical": 4, "high": 8, "medium": 24}),
        currency="EUR",
        retention_years=7,
        on_time_target_pct=85.0,
        feature_flags_json=json.dumps(
            {"ai_suggestions": True, "auto_escalation": True, "teams_notifications": True, "partner_portal": False}
        ),
    )
    db.add(settings)
    db.commit()

    # ---------------------------------------------------------------------------- teams
    team_names = ["QC", "SC Planning", "External Mfg", "Procurement", "Demand Planning", "IT / Operations", "Supply Chain"]
    teams = {}
    for name in team_names:
        t = models.Team(name=name, escalation_path_json=json.dumps(["Team Lead", "Site Director", "SC Director"]))
        db.add(t)
        teams[name] = t
    db.commit()
    for t in teams.values():
        db.refresh(t)

    # ------------------------------------------------------------------------- partners
    partner_defs = [
        ("Lonza", "cmo", 6.5, "needs_action"),
        ("Samsung Biologics", "cmo", 3.2, "on_track"),
        ("Evonik", "supplier", 5.1, "monitoring"),
        ("DSV", "3pl", 2.8, "on_track"),
        ("Catalent", "cmo", 3.9, "on_track"),
    ]
    partners = {}
    for name, ptype, resp, status in partner_defs:
        p = models.Partner(name=name, type=ptype, avg_response_hours=resp, status=status, contact_channel="portal")
        db.add(p)
        partners[name] = p
    db.commit()
    for p in partners.values():
        db.refresh(p)

    # ---------------------------------------------------------------------------- users
    user_defs = [
        ("Eric Rousseau", "eric.rousseau@nexus-demo.io", "planner", "QC Ops Lead", "QC", None),
        ("Maria Kovacs", "maria.kovacs@nexus-demo.io", "manager", "External Manufacturing Manager", "External Mfg", None),
        ("Jana Lindqvist", "jana.lindqvist@nexus-demo.io", "planner", "SC Planner", "SC Planning", None),
        ("Tom Berger", "tom.berger@nexus-demo.io", "manager", "Procurement Lead", "Procurement", None),
        ("Sofie De Vries", "sofie.devries@nexus-demo.io", "planner", "Demand Planner", "Demand Planning", None),
        ("A. Janssens", "a.janssens@nexus-demo.io", "director", "Supply Chain Director", "Supply Chain", None),
        ("Nina Vos", "nina.vos@nexus-demo.io", "admin", "IT / Operations Admin", "IT / Operations", None),
        ("Lonza Portal", "lonza.portal@nexus-demo.io", "partner", "Lonza Partner Contact", None, "Lonza"),
    ]
    users = {}
    for name, email, role, title, team_name, partner_name in user_defs:
        u = models.User(
            name=name,
            email=email,
            role=role,
            title=title,
            team_id=teams[team_name].id if team_name else None,
            partner_id=partners[partner_name].id if partner_name else None,
            status="active",
            last_active_at=now - timedelta(hours=1),
        )
        db.add(u)
        users[name] = u
    db.commit()
    for u in users.values():
        db.refresh(u)

    teams["QC"].lead_id = users["Eric Rousseau"].id
    teams["External Mfg"].lead_id = users["Maria Kovacs"].id
    teams["SC Planning"].lead_id = users["Jana Lindqvist"].id
    teams["Procurement"].lead_id = users["Tom Berger"].id
    teams["Demand Planning"].lead_id = users["Sofie De Vries"].id
    teams["Supply Chain"].lead_id = users["A. Janssens"].id
    db.commit()

    # ---------------------------------------------------------------------- alert rules
    rule_defs = [
        ("QC hold + release window risk", "Binocs QC hold AND release window risk > 0 days", "critical", "QC Ops Lead", "Binocs", True),
        ("CMO capacity shortfall", "Helion gap > 1,000 units within 8 weeks of launch", "critical", "External Manufacturing Manager", "Helion", True),
        ("Safety stock breach", "Axon stock < 50% of policy days", "high", "SC Planner", "Axon", True),
        ("Lead time drift", "SAP PO drift > 3 days vs contracted lead time", "high", "Procurement Lead", "SAP", True),
        ("Cold chain excursion", "SAP shipment temperature out of range > 30 min", "high", "Procurement Lead", "SAP", True),
        ("Forecast accuracy drop", "Anaplan accuracy < target − 10pts", "medium", "Demand Planner", "Anaplan", False),
    ]
    rules = {}
    for name, cond, sev, route, source, enabled in rule_defs:
        r = models.AlertRule(name=name, condition_dsl=cond, severity=sev, route_to_role=route, source_system=source, enabled=enabled)
        db.add(r)
        rules[name] = r
    db.commit()
    for r in rules.values():
        db.refresh(r)

    # --------------------------------------------------------------------- integrations
    integration_defs = [
        ("axon", "Axon™", "Bluecrux", "rw", True, "Inventory drift and KPI alerts in; approved parameter updates pushed back."),
        ("binocs", "Binocs™", "Bluecrux", "rw", True, "QC scheduling conflicts and hold alerts in; re-slot approvals pushed back."),
        ("helion", "Helion™", "Bluecrux", "read", True, "CMO capacity gaps and supply risk alerts in."),
        ("sap", "SAP S/4HANA", "SAP", "rw", True, "Inventory deviations and lead-time drift in; expedites and PO changes pushed back."),
        ("anaplan", "Anaplan", "Anaplan", "read", True, "Forecast accuracy drops and planning exceptions in. Read-only in MVP."),
        ("teams", "Microsoft Teams", "Microsoft", "webhook", True, "Notifications on create, escalate and overdue. Acknowledge directly from Teams."),
        ("entra", "Microsoft Entra ID", "Microsoft", "sso", True, "Single sign-on and role-based access: planner / manager / director / partner."),
        ("slack", "Slack", "Salesforce", "webhook", False, "Post exceptions and escalations to Slack channels with acknowledge buttons."),
        ("outlook", "Email / Outlook", "Microsoft", "rw", True, "Structured exception emails to stakeholders; replies parsed back into the timeline."),
        ("omp", "OMP / Kinaxis", "—", "read", False, "Planning exceptions from alternative APS platforms. Phase 2."),
        ("portal", "Partner portal", "NEXUS", "rw", False, "CMO/supplier-facing view and structured response form. Phase 2."),
    ]
    for slug, name, vendor, direction, connected, desc in integration_defs:
        ig = models.Integration(
            id=slug, system=name, vendor=vendor, direction=direction,
            status="connected" if connected else "disconnected",
            description=desc,
            last_sync_at=now - timedelta(minutes=2) if connected else None,
            sync_cursor=0,
        )
        db.add(ig)
    db.commit()

    # ---------------------------------------------------------------------- sync log
    sync_log_defs = [
        ("Axon", "QC hold detected · 1 Critical exception created (Batch X-4421)", now - timedelta(hours=3, minutes=48)),
        ("Binocs", "Analyst availability synced for Site 3 · attached to Batch X-4421", now - timedelta(hours=2, minutes=54)),
        ("Helion", "Capacity model delta · 1 Critical exception created (Lonza Wk 26-28)", now - timedelta(hours=1, minutes=44)),
        ("SAP", "PO status refresh · lead-time drift check passed", now - timedelta(minutes=19)),
        ("Axon", "2 KPI alerts evaluated · 0 new exceptions · 1 status update", now - timedelta(minutes=19)),
    ]
    for system, message, ts in sync_log_defs:
        entry = models.SyncLogEntry(system=system, message=message)
        db.add(entry)
        db.flush()
        entry.created_at = ts
    db.commit()

    def sla_due(created_at, severity):
        return utils.sla_due_at_for(created_at, severity, settings)

    def mk_exception(**kwargs):
        resolved = kwargs.pop("resolved", False)
        resolution_hours = kwargs.pop("resolution_hours", None)
        created_at = kwargs.pop("created_at")
        severity = kwargs["severity"]
        status = kwargs.pop("status", None)
        if resolved:
            status = "resolved"
        elif status is None:
            status = "awaiting_action"

        exc = models.Exception_(
            created_at=created_at,
            status=status,
            sla_due_at=sla_due(created_at, severity),
            is_new=(now - created_at) < timedelta(hours=1),
            **kwargs,
        )
        if resolved and resolution_hours is not None:
            exc.resolved_at = created_at + timedelta(hours=resolution_hours)
        db.add(exc)
        db.commit()
        db.refresh(exc)
        return exc

    def event(exc, kind, actor_name, body, actor_id=None, actor_type="system", offset_hours=0.0, metadata=None):
        utils.add_timeline_event(
            db, exc.id, kind, actor_name, body,
            actor_id=actor_id, actor_type=actor_type, metadata=metadata,
            created_at=exc.created_at + timedelta(hours=offset_hours),
        )

    def suggestion(exc, body, confidence, accepted=False, accepted_by=None, offset_hours=1.0):
        s = models.AiSuggestion(exception_id=exc.id, body=body, confidence=confidence, prompt_hash="seed-demo")
        if accepted:
            s.accepted_at = exc.created_at + timedelta(hours=offset_hours)
            s.accepted_by = accepted_by.id if accepted_by else None
        db.add(s)
        db.commit()
        return s

    def action(exc, title, assignee, kind="approve", due_in_hours=1.0, status="open"):
        a = models.Action(
            exception_id=exc.id, assignee_id=assignee.id, title=title, kind=kind,
            due_at=now + timedelta(hours=due_in_hours), status=status,
        )
        if status == "done":
            a.completed_at = now - timedelta(hours=1)
        db.add(a)
        db.commit()
        return a

    def notif(user, kind, text, entity_ref="", unread=True, hours_ago=1.0):
        n = models.Notification(user_id=user.id, kind=kind, text=text, entity_ref=entity_ref)
        db.add(n)
        db.flush()
        n.created_at = now - timedelta(hours=hours_ago)
        if not unread:
            n.read_at = now - timedelta(minutes=30)
        db.commit()

    # ============================================================= FLOW A — AstraZeneca
    flow_a = mk_exception(
        title="Batch X-4421 QC hold at Site 3 — EU release window at risk",
        severity="critical", type="QC hold", source_system="Axon", company="AstraZeneca",
        owner_id=users["Eric Rousseau"].id, rule_id=rules["QC hold + release window risk"].id,
        push_to="Binocs", external_ref="BATCH-X-4421",
        value_at_risk=1_200_000, risk_date="Nov 13 — EU release window",
        impact_json=json.dumps([
            ["Detected by", "Axon (QC signal via Binocs)", False],
            ["Business impact", "€1.2M revenue at risk", True],
            ["Affected volume", "1 batch · 48,000 units", False],
            ["Risk date", "Nov 13 — EU release window", False],
            ["Current owner", "Eric Rousseau (QC Ops)", False],
            ["Escalation path", "QC Ops → Site Director → SC Director", False],
        ]),
        created_at=now - timedelta(hours=3),
    )
    event(flow_a, "detected", "Axon", "QC hold detected on Batch X-4421 at Site 3. EU release window at risk by 3 days.", offset_hours=0)
    event(flow_a, "action", "Eric Rousseau", "Acknowledged the exception and requested analyst availability from Binocs.",
          actor_id=users["Eric Rousseau"].id, actor_type="user", offset_hours=0.9)
    event(flow_a, "note", "Binocs", "Analyst availability synced: Müller free Thu 08:00–12:00, Peeters free Fri PM.", offset_hours=0.93)
    suggestion(flow_a, "Re-slot batch X-4421 to Thu AM with analyst Müller — projected release Nov 13, within window. "
                        "Binocs shows 6h of unused analyst capacity Thu morning. Confidence 87%.", 0.87)
    action(flow_a, "Approve Binocs re-slot for Batch X-4421", users["Eric Rousseau"], kind="approve", due_in_hours=-1.0)
    notif(users["Eric Rousseau"], "created", "New exception from Axon: Batch X-4421 QC hold at Site 3", entity_ref=flow_a.id, hours_ago=3)
    notif(users["Eric Rousseau"], "overdue", "Action overdue: Approve Binocs re-slot for Batch X-4421", entity_ref=flow_a.id, hours_ago=1)

    # ============================================================= FLOW B — Argenx/Lonza
    flow_b = mk_exception(
        title="3,200-unit capacity shortfall at Lonza — Wk 26–28, Q3 launch at risk",
        severity="critical", type="Capacity gap", source_system="Helion", company="Lonza",
        owner_id=users["Maria Kovacs"].id, rule_id=rules["CMO capacity shortfall"].id,
        partner_id=partners["Lonza"].id, push_to="Helion", external_ref="HEL-GAP-2288",
        value_at_risk=2_100_000, risk_date="Q3 launch — 6 weeks out",
        impact_json=json.dumps([
            ["Detected by", "Helion capacity model", False],
            ["Business impact", "€2.1M launch revenue at risk", True],
            ["Affected volume", "3,200 units · Wk 26–28", False],
            ["Risk date", "Q3 launch — 6 weeks out", False],
            ["Inventory buffer", "8 days", True],
            ["Current owner", "Maria Kovacs (External Mfg)", False],
            ["Escalation path", "External Mfg → SC Director", False],
        ]),
        created_at=now - timedelta(hours=6),
        status="resolution_in_progress",
    )
    event(flow_b, "detected", "Helion", "Capacity shortfall of 3,200 units detected at Lonza for Wk 26–28.", offset_hours=0)
    event(flow_b, "action", "Maria Kovacs", "Reviewed shortfall and inventory buffer (8 days). Preparing partner capacity request.",
          actor_id=users["Maria Kovacs"].id, actor_type="user", offset_hours=1.0)
    event(flow_b, "action", "Maria Kovacs", "Sent structured capacity request to Lonza for 3,200 units. Auto-escalation armed for 17:00 today if no response.",
          actor_id=users["Maria Kovacs"].id, actor_type="user", offset_hours=1.5)
    event(flow_b, "note", "Lonza", "Partner responded: can cover 2,000 of 3,200 units. Remaining 1,200 units short.",
          actor_type="partner", offset_hours=3.0)
    event(flow_b, "action", "Maria Kovacs", "Confirmed backup site: Samsung Biologics to cover the remaining 1,200 units. Procurement team notified.",
          actor_id=users["Maria Kovacs"].id, actor_type="user", offset_hours=4.0)
    suggestion(flow_b, "Send structured capacity request to Lonza for 3,200 units; pre-book Samsung Biologics as backup for the "
                        "uncovered volume. Auto-escalate at 17:00 if no response. Confidence 78%.", 0.78,
               accepted=True, accepted_by=users["Maria Kovacs"], offset_hours=1.5)
    action(flow_b, "Confirm capacity plan follow-up with Procurement", users["Maria Kovacs"], kind="review", due_in_hours=6.0)
    notif(users["Maria Kovacs"], "created", "New exception from Helion: Lonza capacity shortfall", entity_ref=flow_b.id, hours_ago=6)
    notif(users["A. Janssens"], "escalated", "Auto-escalation was armed (and resolved before triggering): Lonza capacity shortfall", entity_ref=flow_b.id, hours_ago=2, unread=False)

    # ============================================================= FLOW C — Maesa
    flow_c = mk_exception(
        title="SKU-089 safety stock at DE warehouse below policy — stockout in 5 days",
        severity="high", type="Inventory drift", source_system="Axon", company="Maesa",
        owner_id=users["Jana Lindqvist"].id, rule_id=rules["Safety stock breach"].id,
        push_to="SAP", external_ref="SKU-089",
        value_at_risk=340_000, risk_date="Stockout in 5 days",
        impact_json=json.dumps([
            ["Detected by", "Axon inventory command center", False],
            ["Business impact", "€340K service risk", True],
            ["Current stock", "4.2 days (policy: 14 days)", True],
            ["Replenishment ETA", "+9 days standard route", False],
            ["Stockout date", "In 5 days", True],
            ["Current owner", "Jana Lindqvist (SC Planning)", False],
        ]),
        created_at=now - timedelta(hours=9),
    )
    event(flow_c, "detected", "Axon", "SKU-089 safety stock dropped to 4.2 days at DE warehouse. Policy: 14 days.", offset_hours=0)
    event(flow_c, "action", "Jana Lindqvist", "Compared standard replenishment ETA (+9 days) against stockout date. Standard route too slow.",
          actor_id=users["Jana Lindqvist"].id, actor_type="user", offset_hours=8.0)
    suggestion(flow_c, "Expedite replenishment via air freight — cost €4,200, prevents stockout with 91% confidence. "
                        "Push purchase order change to SAP on approval.", 0.91)
    action(flow_c, "Approve expedite for SKU-089", users["Jana Lindqvist"], kind="approve", due_in_hours=3.0)
    notif(users["Jana Lindqvist"], "created", "New exception from Axon: SKU-089 safety stock breach at DE warehouse", entity_ref=flow_c.id, hours_ago=9)

    # ================================================================ additional colour
    extra = [
        dict(title="PO 4500128843 lead time drift +6 days from supplier Evonik", severity="high", type="Lead time drift",
             source_system="SAP", company="Evonik", owner="Tom Berger", partner="Evonik", push_to="SAP",
             value_at_risk=180_000, risk_date="+6 days vs contracted lead time", days_ago=1.0, status="partner_response_pending"),
        dict(title="Forecast accuracy drop of 12pts on C-Line SKU family, EMEA", severity="medium", type="Forecast",
             source_system="Anaplan", company="EMEA region", owner="Sofie De Vries", push_to="Anaplan",
             value_at_risk=95_000, risk_date="Overstock risk building", days_ago=2.0, status="in_review"),
        dict(title="DSV inbound receipt delay at NL DC — 2 shipments pending dock slot", severity="medium", type="Logistics",
             source_system="Manual", company="DSV", owner="Eric Rousseau", partner="DSV", push_to="SAP",
             value_at_risk=45_000, risk_date="Holding cost accruing", days_ago=2.3, status="awaiting_action"),
        dict(title="Temperature excursion on shipment SHP-2291 in transit to US DC", severity="high", type="Cold chain",
             source_system="SAP", company="Catalent", owner="Tom Berger", partner="Catalent", push_to="SAP",
             value_at_risk=260_000, risk_date="Excursion +4.2°C for 47 min", days_ago=0.15, status="awaiting_action"),
        dict(title="Binocs analyst utilisation over 95% at Site 1 lab — Wk 25", severity="medium", type="QC capacity",
             source_system="Binocs", company="Site 1", owner="Eric Rousseau", push_to="Binocs",
             value_at_risk=50_000, risk_date="Release delays likely Wk 25", days_ago=0.1, status="awaiting_action"),
        dict(title="Capacity gap at Samsung Biologics — Wk 29, secondary launch line", severity="medium", type="Capacity gap",
             source_system="Helion", company="Samsung Biologics", owner="Maria Kovacs", partner="Samsung Biologics", push_to="Helion",
             value_at_risk=150_000, risk_date="Wk 29", days_ago=1.5, status="in_review"),
        dict(title="Batch W-3390 QC hold at Site 1 — release window at risk", severity="critical", type="QC hold",
             source_system="Binocs", company="AstraZeneca", owner="Eric Rousseau", push_to="Binocs",
             value_at_risk=980_000, risk_date="Resolved within window", days_ago=25, resolved=True, resolution_hours=4.5),
        dict(title="2,100-unit capacity gap at Samsung Biologics — Wk 18", severity="high", type="Capacity gap",
             source_system="Helion", company="Samsung Biologics", owner="Maria Kovacs", partner="Samsung Biologics", push_to="Helion",
             value_at_risk=430_000, risk_date="Resolved before launch window", days_ago=20, resolved=True, resolution_hours=8.0),
        dict(title="SKU-045 safety stock breach at UK warehouse", severity="high", type="Inventory drift",
             source_system="Axon", company="Maesa", owner="Jana Lindqvist", push_to="SAP",
             value_at_risk=210_000, risk_date="Expedited via air freight", days_ago=18, resolved=True, resolution_hours=3.1),
        dict(title="PO 4500127700 lead time drift +4 days from supplier Evonik", severity="high", type="Lead time drift",
             source_system="SAP", company="Evonik", owner="Tom Berger", partner="Evonik", push_to="SAP",
             value_at_risk=120_000, risk_date="Resolved via alternate supplier split", days_ago=15, resolved=True, resolution_hours=6.0),
        dict(title="Forecast accuracy drop of 11pts on B-Line SKU family, APAC", severity="medium", type="Forecast",
             source_system="Anaplan", company="APAC region", owner="Sofie De Vries", push_to="Anaplan",
             value_at_risk=55_000, risk_date="Rebaselined", days_ago=12, resolved=True, resolution_hours=12.0),
        dict(title="Temperature excursion on shipment SHP-2177 in transit to EU DC", severity="high", type="Cold chain",
             source_system="SAP", company="Catalent", owner="Tom Berger", partner="Catalent", push_to="SAP",
             value_at_risk=190_000, risk_date="Cleared QA stability check", days_ago=10, resolved=True, resolution_hours=5.0),
        dict(title="2,800-unit capacity shortfall at Lonza — Wk 22", severity="critical", type="Capacity gap",
             source_system="Helion", company="Lonza", owner="Maria Kovacs", partner="Lonza", push_to="Helion",
             value_at_risk=1_000_000, risk_date="Covered by backup allocation", days_ago=8, resolved=True, resolution_hours=9.5),
        dict(title="Binocs analyst utilisation over 95% at Site 1 lab — Wk 22", severity="medium", type="QC capacity",
             source_system="Binocs", company="Site 1", owner="Eric Rousseau", push_to="Binocs",
             value_at_risk=40_000, risk_date="Re-planned within week", days_ago=6, resolved=True, resolution_hours=2.0),
        dict(title="DSV inbound receipt delay at BE DC — 1 shipment pending dock slot", severity="medium", type="Logistics",
             source_system="Manual", company="DSV", owner="Eric Rousseau", partner="DSV", push_to="SAP",
             value_at_risk=30_000, risk_date="Dock slot confirmed", days_ago=5, resolved=True, resolution_hours=4.0),
        dict(title="SKU-231 forecast vs actual variance breach at BE DC", severity="medium", type="Inventory drift",
             source_system="Axon", company="Clariant Catalysts", owner="Jana Lindqvist", push_to="SAP",
             value_at_risk=88_000, risk_date="Overstock order paused", days_ago=4, resolved=True, resolution_hours=7.0),
        dict(title="Batch V-2205 QC hold at Site 3 — release window at risk", severity="critical", type="QC hold",
             source_system="Binocs", company="AstraZeneca", owner="Eric Rousseau", push_to="Binocs",
             value_at_risk=700_000, risk_date="Resolved within window", days_ago=3, resolved=True, resolution_hours=5.5),
    ]

    for item in extra:
        owner = users[item["owner"]]
        partner = partners.get(item.get("partner"))
        created_at = now - timedelta(days=item["days_ago"])
        exc = mk_exception(
            title=item["title"], severity=item["severity"], type=item["type"],
            source_system=item["source_system"], company=item["company"],
            owner_id=owner.id, partner_id=partner.id if partner else None,
            push_to=item["push_to"], value_at_risk=item["value_at_risk"], risk_date=item["risk_date"],
            impact_json=json.dumps([
                ["Detected by", f"{item['source_system']} detection", False],
                ["Business impact", f"€{item['value_at_risk']:,.0f} exposure", True],
                ["Current owner", f"{owner.name} ({owner.title})", False],
            ]),
            created_at=created_at,
            status=item.get("status"),
            resolved=item.get("resolved", False),
            resolution_hours=item.get("resolution_hours"),
        )
        event(exc, "detected", item["source_system"], f"{item['title']}.", offset_hours=0)
        if item.get("resolved"):
            event(exc, "action", owner.name, f"Reviewed and approved corrective action. {item['risk_date']}.",
                  actor_id=owner.id, actor_type="user", offset_hours=item["resolution_hours"] * 0.6)
            event(exc, "system", item["push_to"] or item["source_system"], f"Confirmed. Exception marked resolved.",
                  offset_hours=item["resolution_hours"])
        else:
            event(exc, "action", owner.name, "Reviewing impact and preparing next step.",
                  actor_id=owner.id, actor_type="user", offset_hours=min(item["days_ago"] * 24 * 0.3, 4.0) if item["days_ago"] > 0 else 0.2)

    # a few more actions spread across assignees/buckets for "My actions" richness
    action(flow_a, "Confirm QC analyst allocation for Wk 24", users["Eric Rousseau"], kind="review", due_in_hours=26.0)
    dsv_exc = db.query(models.Exception_).filter(models.Exception_.title.like("DSV inbound receipt delay at NL DC%")).first()
    if dsv_exc:
        action(dsv_exc, "Review DSV inbound delay — confirm dock slot", users["Eric Rousseau"], kind="review", due_in_hours=7.0)
    tom_evonik = db.query(models.Exception_).filter(models.Exception_.title.like("PO 4500128843%")).first()
    if tom_evonik:
        action(tom_evonik, "Confirm alternate supplier split for PO 4500128843", users["Tom Berger"], kind="review", due_in_hours=30.0)
    sofie_forecast = db.query(models.Exception_).filter(models.Exception_.title.like("Forecast accuracy drop of 12pts%")).first()
    if sofie_forecast:
        action(sofie_forecast, "Approve rebaseline for C-Line forecast", users["Sofie De Vries"], kind="approve", due_in_hours=48.0)

    # extra notifications for demo richness
    notif(users["Tom Berger"], "partner", "DSV responded: proposed dock slots Thu 07:00 / Fri 13:00", hours_ago=20, unread=False)
    notif(users["Eric Rousseau"], "created", "New exception from Binocs: Site 1 lab utilisation over 95%", hours_ago=2)
    notif(users["Sofie De Vries"], "created", "New exception from Anaplan: forecast accuracy drop on C-Line", hours_ago=48, unread=False)

    # ---------------------------------------------------------------------- audit log
    # Backdated history so the workspace reads as an already-operating instance rather
    # than a freshly created one — admin actions, rule tuning, integration setup, an
    # invited-but-not-yet-active user, and a couple of report/export events.
    def audit(actor, action_name, entity_type="", entity_id="", before=None, after=None, days_ago=0.0):
        entry = models.AuditLog(
            actor_id=actor.id if actor else None,
            actor_name=actor.name if actor else "System",
            action=action_name,
            entity_type=entity_type,
            entity_id=entity_id,
            before_json=json.dumps(before or {}, default=str),
            after_json=json.dumps(after or {}, default=str),
        )
        db.add(entry)
        db.flush()
        entry.created_at = now - timedelta(days=days_ago)
        db.commit()

    audit(users["Nina Vos"], "connect_integration", "integration", "axon",
          after={"id": "axon", "status": "connected"}, days_ago=41)
    audit(users["Nina Vos"], "connect_integration", "integration", "binocs",
          after={"id": "binocs", "status": "connected"}, days_ago=41)
    audit(users["Nina Vos"], "connect_integration", "integration", "sap",
          after={"id": "sap", "status": "connected"}, days_ago=40)
    audit(users["Nina Vos"], "connect_integration", "integration", "helion",
          after={"id": "helion", "status": "connected"}, days_ago=38)
    audit(users["Nina Vos"], "connect_integration", "integration", "anaplan",
          after={"id": "anaplan", "status": "connected"}, days_ago=35)
    audit(users["A. Janssens"], "create_rule", "alert_rule", rules["Forecast accuracy drop"].id,
          after={"name": "Forecast accuracy drop", "enabled": True}, days_ago=33)
    audit(users["A. Janssens"], "patch_rule", "alert_rule", rules["Forecast accuracy drop"].id,
          before={"enabled": True}, after={"enabled": False, "reason": "too noisy during Q2 rebaseline"}, days_ago=14)
    audit(users["Nina Vos"], "invite_user", "user", "—",
          after={"name": "Priya Nair", "email": "priya.nair@nexus-demo.io", "role": "planner", "status": "invited"}, days_ago=9)
    audit(users["Nina Vos"], "patch_user", "user", users["Sofie De Vries"].id,
          before={"role": "planner"}, after={"role": "planner", "status": "active"}, days_ago=7)
    audit(users["A. Janssens"], "update_settings", "workspace_settings", "1",
          before={"on_time_target_pct": 80.0}, after={"on_time_target_pct": 85.0}, days_ago=6)
    audit(users["Eric Rousseau"], "export_exceptions_csv", "exceptions", "",
          after={"row_count": 14}, days_ago=4)
    audit(users["Nina Vos"], "connect_integration", "integration", "outlook",
          after={"id": "outlook", "status": "connected"}, days_ago=3)
    audit(users["A. Janssens"], "export_executive_pdf", "report", "executive_report_seed_demo.pdf",
          after={"path": "generated_reports/executive_report_seed_demo.pdf"}, days_ago=2)
    audit(users["Nina Vos"], "disconnect_integration", "integration", "slack",
          before={"status": "connected"}, after={"status": "disconnected", "reason": "consolidating on Teams"}, days_ago=1)

    # A second, not-yet-active invited user so Users & permissions shows a realistic mix.
    invited_user = models.User(
        name="Priya Nair", email="priya.nair@nexus-demo.io", role="planner", title="QC Analyst",
        team_id=teams["QC"].id, status="invited", last_active_at=now - timedelta(days=9),
    )
    db.add(invited_user)
    db.commit()

    db.close()
    print("Seed complete.")
    print(f"  Teams: {len(teams)}  Partners: {len(partners)}  Users: {len(users)}  Rules: {len(rules)}")
    total_exceptions = SessionLocal().query(models.Exception_).count()
    print(f"  Exceptions: {total_exceptions}")


if __name__ == "__main__":
    run()

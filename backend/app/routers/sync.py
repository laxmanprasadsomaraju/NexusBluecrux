import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user
from app.integrations.registry import ADAPTERS
from app.integrations.teams import send_webhook

router = APIRouter(tags=["sync"])

# Maps an exception `type` to the alert rule name that governs it — mirrors the
# prototype's TRACE table and drives "why this exception exists".
TYPE_TO_RULE_NAME = {
    "QC hold": "QC hold + release window risk",
    "Capacity gap": "CMO capacity shortfall",
    "Inventory drift": "Safety stock breach",
    "Lead time drift": "Lead time drift",
    "Cold chain": "Cold chain excursion",
    "Forecast": "Forecast accuracy drop",
}

# Fallback owner routing for exception types with no matching alert_rules row
# (e.g. QC capacity, Performance) — routes by source system to a sensible default team lead.
SOURCE_FALLBACK_TITLE = {
    "Axon": "SC Planner",
    "Binocs": "QC Ops Lead",
    "Helion": "External Manufacturing Manager",
    "SAP": "Procurement Lead",
    "Anaplan": "Demand Planner",
}


def _resolve_owner(db: Session, role_title: str):
    return db.query(models.User).filter(models.User.title == role_title, models.User.status == "active").first()


def _run_rule_engine(db: Session, candidate: dict) -> dict:
    """Given a canned candidate dict from an adapter, decide whether/how to create an
    exception. Returns {'created': bool, 'reason': str, 'exception': Exception_|None}."""
    rule_name = TYPE_TO_RULE_NAME.get(candidate["type"])
    rule = db.query(models.AlertRule).filter(models.AlertRule.name == rule_name).first() if rule_name else None

    if rule and not rule.enabled:
        return {"created": False, "reason": f"Matched rule '{rule.name}' but it is disabled"}

    severity = rule.severity if rule else candidate["severity"]
    owner = None
    if rule:
        owner = _resolve_owner(db, rule.route_to_role)
    if not owner:
        owner = _resolve_owner(db, SOURCE_FALLBACK_TITLE.get(candidate["source_system"], ""))
    if not owner:
        owner = db.query(models.User).filter(models.User.role == "admin").first()

    partner = db.query(models.Partner).filter(models.Partner.name == candidate["company"]).first()
    settings = utils.get_settings(db)
    now = datetime.utcnow()

    exc = models.Exception_(
        title=candidate["title"],
        severity=severity,
        status="awaiting_action",
        type=candidate["type"],
        source_system=candidate["source_system"],
        company=candidate["company"],
        partner_id=partner.id if partner else None,
        owner_id=owner.id if owner else None,
        rule_id=rule.id if rule else None,
        impact_json=json.dumps(candidate["impact"]),
        value_at_risk=candidate["value_at_risk"],
        risk_date=candidate["risk_date"],
        push_to=candidate["push_to"],
        sla_due_at=utils.sla_due_at_for(now, severity, settings),
        is_new=True,
    )
    db.add(exc)
    db.commit()
    db.refresh(exc)

    utils.add_timeline_event(
        db, exc.id, "detected", candidate["source_system"], candidate["detected_body"],
        actor_type="system",
        metadata={"rule_id": rule.id if rule else None, "rule_name": rule.name if rule else None},
    )
    if owner:
        utils.notify(db, owner.id, "created", f"New exception from {candidate['source_system']}: {exc.title}", entity_ref=exc.id)

    return {"created": True, "reason": f"Rule '{rule.name}' matched" if rule else "No matching rule — routed by source-system default", "exception": exc}


def auto_escalate_overdue(db: Session) -> list:
    """Scheduler-equivalent: since there is no real background scheduler in this
    environment, this runs as part of every /sync call (and could equally be wired to
    a cron). Finds exceptions past their auto-escalation deadline and escalates them
    with actor_type='system', exactly as a real scheduler would call POST .../escalate."""
    now = datetime.utcnow()
    overdue = db.query(models.Exception_).filter(
        models.Exception_.auto_escalate.is_(True),
        models.Exception_.escalation_deadline.isnot(None),
        models.Exception_.escalation_deadline < now,
        models.Exception_.status.notin_(["action_taken", "resolved", "escalated"]),
    ).all()
    director = db.query(models.User).filter(models.User.role == "director").first()
    escalated = []
    for exc in overdue:
        exc.status = "escalated"
        exc.auto_escalate = False
        db.commit()
        utils.add_timeline_event(
            db, exc.id, "escalation", "System",
            f"Auto-escalated to {director.name if director else 'Supply Chain Director'}: no response by deadline.",
            actor_type="system",
        )
        if director:
            utils.notify(db, director.id, "escalated", f"Auto-escalated: {exc.title}", entity_ref=exc.id)
        escalated.append(exc.id)
    return escalated


@router.post("/sync")
def trigger_sync(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    integrations = db.query(models.Integration).filter(models.Integration.status == "connected").all()
    created = []
    log_lines = []

    for ig in integrations:
        adapter = ADAPTERS.get(ig.id)
        ig.last_sync_at = datetime.utcnow()
        if not adapter:
            continue
        candidate = adapter.pull_exceptions(ig.sync_cursor)
        ig.sync_cursor += 1
        db.commit()

        if not candidate:
            msg = f"{ig.system} sync: evaluated, no new exceptions this cycle"
            db.add(models.SyncLogEntry(system=ig.system, message=msg))
            db.commit()
            continue

        result = _run_rule_engine(db, candidate)
        if result["created"]:
            exc = result["exception"]
            created.append({"id": exc.id, "title": exc.title, "severity": exc.severity, "source_system": exc.source_system})
            msg = f"{ig.system} sync: {result['reason']} → 1 {exc.severity} exception created ({exc.title[:60]})"
        else:
            msg = f"{ig.system} sync: {result['reason']} — no exception created"
        db.add(models.SyncLogEntry(system=ig.system, message=msg))
        db.commit()
        log_lines.append(msg)

    escalated = auto_escalate_overdue(db)
    if escalated:
        db.add(models.SyncLogEntry(system="NEXUS", message=f"Auto-escalation: {len(escalated)} exception(s) escalated past deadline"))
        db.commit()

    result_payload = {"created": created, "escalated": escalated, "integrations_synced": [i.system for i in integrations]}
    job = models.SyncJob(status="completed", result_json=json.dumps(result_payload))
    db.add(job)
    db.commit()
    db.refresh(job)

    return {"job_id": job.id, "status": job.status, **result_payload}


@router.get("/sync/{job_id}")
def get_sync_job(job_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    job = db.query(models.SyncJob).filter(models.SyncJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Sync job not found")
    return {"job_id": job.id, "status": job.status, **json.loads(job.result_json)}

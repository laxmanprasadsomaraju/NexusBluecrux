"""Shared helpers used across routers: timeline hash-chaining, serialization,
notifications, SLA/age formatting. Centralized here so every router that touches an
exception behaves consistently."""
import json
from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app import models


def get_settings(db: Session) -> models.WorkspaceSettings:
    settings = db.query(models.WorkspaceSettings).filter(models.WorkspaceSettings.id == 1).first()
    if not settings:
        settings = models.WorkspaceSettings(id=1)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


def sla_hours_for(settings: models.WorkspaceSettings, severity: str) -> float:
    hours = json.loads(settings.sla_hours_json)
    return float(hours.get(severity, 24))


def add_timeline_event(
    db: Session,
    exception_id: str,
    kind: str,
    actor_name: str,
    body: str,
    actor_id: Optional[str] = None,
    actor_type: str = "system",
    metadata: Optional[dict] = None,
    created_at: Optional[datetime] = None,
) -> models.TimelineEvent:
    """Append a timeline event, extending the hash chain for this exception. This is
    the ONLY way timeline rows are ever created — there is no update/delete route.
    `created_at` is only ever backdated by seed.py to build a realistic historical
    demo timeline; live application code always leaves it as the real current time."""
    last = (
        db.query(models.TimelineEvent)
        .filter(models.TimelineEvent.exception_id == exception_id)
        .order_by(models.TimelineEvent.created_at.desc())
        .first()
    )
    prev_hash = last.hash if last else ""
    event = models.TimelineEvent(
        exception_id=exception_id,
        kind=kind,
        actor_id=actor_id,
        actor_name=actor_name,
        actor_type=actor_type,
        body=body,
        metadata_json=json.dumps(metadata or {}),
        prev_hash=prev_hash,
    )
    if created_at is not None:
        event.created_at = created_at
    event.hash = event.compute_hash()
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


def notify(db: Session, user_id: str, kind: str, text: str, entity_ref: str = "") -> models.Notification:
    n = models.Notification(user_id=user_id, kind=kind, text=text, entity_ref=entity_ref)
    db.add(n)
    db.commit()
    db.refresh(n)
    return n


def audit(
    db: Session,
    actor,
    action: str,
    entity_type: str = "",
    entity_id: str = "",
    before: Optional[dict] = None,
    after: Optional[dict] = None,
):
    entry = models.AuditLog(
        actor_id=getattr(actor, "id", None),
        actor_name=getattr(actor, "name", "system"),
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        before_json=json.dumps(before or {}, default=str),
        after_json=json.dumps(after or {}, default=str),
    )
    db.add(entry)
    db.commit()


def humanize_age(dt: datetime) -> str:
    delta = datetime.utcnow() - dt
    seconds = delta.total_seconds()
    if seconds < 90:
        return "Opened just now"
    minutes = seconds / 60
    if minutes < 60:
        return f"Opened {int(minutes)}m ago"
    hours = minutes / 60
    if hours < 24:
        return f"Opened {int(hours)}h ago"
    days = hours / 24
    return f"Opened {int(days)}d ago"


def sla_due_at_for(created_at: datetime, severity: str, settings: models.WorkspaceSettings) -> datetime:
    return created_at + timedelta(hours=sla_hours_for(settings, severity))


def sla_string(exc: models.Exception_, settings: models.WorkspaceSettings) -> str:
    if exc.status in ("action_taken", "resolved"):
        return "SLA met"
    if not exc.sla_due_at:
        return ""
    remaining = exc.sla_due_at - datetime.utcnow()
    hrs = sla_hours_for(settings, exc.severity)
    if remaining.total_seconds() < 0:
        return f"{int(hrs)}h SLA · breached"
    total_minutes = int(remaining.total_seconds() // 60)
    if total_minutes < 60:
        return f"{int(hrs)}h SLA · {total_minutes}m left"
    return f"{int(hrs)}h SLA · {total_minutes // 60}h left"


def action_bucket(due_at: datetime) -> str:
    now = datetime.utcnow()
    if due_at < now:
        return "Overdue"
    if due_at.date() == now.date():
        return "Due today"
    if due_at.date() == (now + timedelta(days=1)).date():
        return "Tomorrow"
    return "This week"


BUCKET_ORDER = {"Overdue": 0, "Due today": 1, "Tomorrow": 2, "This week": 3}


def owner_display(exc: models.Exception_) -> str:
    return exc.owner.name if exc.owner else "Unassigned"


def initials(name: str) -> str:
    parts = [p for p in name.split(" ") if p]
    return "".join(p[0] for p in parts[:2]).upper()


STATUS_LABELS = {
    "new": "New",
    "awaiting_action": "Awaiting action",
    "in_review": "In review",
    "escalated": "Escalated",
    "partner_response_pending": "Partner response pending",
    "resolution_in_progress": "Resolution in progress",
    "action_taken": "Action taken — monitoring",
    "resolved": "Resolved",
}


def status_label(status: str) -> str:
    return STATUS_LABELS.get(status, status)

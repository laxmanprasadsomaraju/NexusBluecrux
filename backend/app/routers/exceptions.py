import csv
import hashlib
import hmac
import io
import json
import uuid
from datetime import datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Header, Query
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, scope_exceptions_query, JWT_SECRET
from app.schemas import (
    RaiseExceptionRequest, ApproveRequest, EscalateRequest, NoteRequest, AckRequest,
)

router = APIRouter(prefix="/exceptions", tags=["exceptions"])


# ---------------------------------------------------------------- serialization ----

def _list_item(db: Session, exc: models.Exception_, settings) -> dict:
    return {
        "id": exc.id,
        "title": exc.title,
        "severity": exc.severity,
        "status": exc.status,
        "status_label": utils.status_label(exc.status),
        "type": exc.type,
        "source_system": exc.source_system,
        "company": exc.company,
        "owner_id": exc.owner_id,
        "owner_name": utils.owner_display(exc),
        "owner_initials": utils.initials(utils.owner_display(exc)),
        "partner_id": exc.partner_id,
        "partner_name": exc.partner.name if exc.partner else None,
        "value_at_risk": exc.value_at_risk,
        "risk_date": exc.risk_date,
        "created_at": exc.created_at.isoformat(),
        "resolved_at": exc.resolved_at.isoformat() if exc.resolved_at else None,
        "age": utils.humanize_age(exc.created_at),
        "is_new": exc.is_new,
        "sla_summary": utils.sla_string(exc, settings),
    }


def _detail(db: Session, exc: models.Exception_, user: models.User, settings) -> dict:
    base = _list_item(db, exc, settings)
    timeline = (
        db.query(models.TimelineEvent)
        .filter(models.TimelineEvent.exception_id == exc.id)
        .order_by(models.TimelineEvent.created_at.asc())
        .all()
    )
    rule = db.query(models.AlertRule).filter(models.AlertRule.id == exc.rule_id).first() if exc.rule_id else None
    suggestion = (
        db.query(models.AiSuggestion)
        .filter(models.AiSuggestion.exception_id == exc.id)
        .order_by(models.AiSuggestion.id.desc())
        .first()
    )
    allowed = ["note", "deeplink"]
    if user.role != "partner":
        allowed = ["approve", "escalate", "note", "deeplink"]

    base.update(
        {
            "impact": json.loads(exc.impact_json),
            "push_to": exc.push_to,
            "external_ref": exc.external_ref,
            "escalation_deadline": exc.escalation_deadline.isoformat() if exc.escalation_deadline else None,
            "rule_trace": {
                "rule_name": rule.name if rule else "Manual entry",
                "condition": rule.condition_dsl if rule else "Raised by a user via the Raise exception form",
                "route_to_role": rule.route_to_role if rule else f"Owner selected at creation — {utils.owner_display(exc)}",
            },
            "ai_suggestion": (
                {
                    "id": suggestion.id,
                    "body": suggestion.body,
                    "confidence": suggestion.confidence,
                    "model_version": suggestion.model_version,
                    "accepted_at": suggestion.accepted_at.isoformat() if suggestion.accepted_at else None,
                    "tag": "AI-suggested — human approval required",
                }
                if suggestion
                else None
            ),
            "timeline": [
                {
                    "id": t.id,
                    "kind": t.kind,
                    "actor_name": t.actor_name,
                    "actor_type": t.actor_type,
                    "body": t.body,
                    "metadata": json.loads(t.metadata_json or "{}"),
                    "created_at": t.created_at.isoformat(),
                    "hash": t.hash,
                }
                for t in timeline
            ],
            "partner_status": (
                {
                    "partner_name": exc.partner.name,
                    "avg_response_hours": exc.partner.avg_response_hours,
                    "status": exc.partner.status,
                    "escalation_deadline": exc.escalation_deadline.isoformat() if exc.escalation_deadline else None,
                }
                if exc.partner
                else None
            ),
            "allowed_actions": allowed,
        }
    )
    return base


def _get_or_404(db: Session, exception_id: str, user: models.User) -> models.Exception_:
    q = db.query(models.Exception_).filter(models.Exception_.id == exception_id)
    q = scope_exceptions_query(q, user)
    exc = q.first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")
    return exc


# --------------------------------------------------------------------- endpoints ----

@router.get("")
def list_exceptions(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    owner: Optional[str] = None,  # "me" or a user id
    partner: Optional[str] = None,  # partner name or id
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=200),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    settings = utils.get_settings(db)
    query = db.query(models.Exception_)
    query = scope_exceptions_query(query, user)

    if severity:
        query = query.filter(models.Exception_.severity == severity.lower())
    if status:
        query = query.filter(models.Exception_.status == status)
    if owner:
        owner_id = user.id if owner == "me" else owner
        query = query.filter(models.Exception_.owner_id == owner_id)
    if partner:
        query = query.join(models.Partner, models.Exception_.partner_id == models.Partner.id, isouter=True).filter(
            (models.Partner.id == partner) | (models.Partner.name == partner)
        )
    if q:
        like = f"%{q.lower()}%"
        query = query.filter(
            (models.Exception_.title.ilike(like))
            | (models.Exception_.company.ilike(like))
            | (models.Exception_.type.ilike(like))
            | (models.Exception_.source_system.ilike(like))
        )

    total = query.count()
    items = (
        query.order_by(models.Exception_.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [_list_item(db, e, settings) for e in items],
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/stats")
def exception_stats(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)

    base = scope_exceptions_query(db.query(models.Exception_), user)

    def count(**filters):
        qq = base
        for k, v in filters.items():
            qq = qq.filter(getattr(models.Exception_, k) == v)
        return qq.count()

    critical_open = base.filter(
        models.Exception_.severity == "critical",
        models.Exception_.status.notin_(["action_taken", "resolved"]),
    ).count()
    critical_open_last_week = base.filter(
        models.Exception_.severity == "critical",
        models.Exception_.created_at <= week_ago,
        (models.Exception_.resolved_at.is_(None)) | (models.Exception_.resolved_at > week_ago),
    ).count()

    awaiting = base.filter(models.Exception_.status == "awaiting_action").count()
    awaiting_last_week = base.filter(
        models.Exception_.status == "awaiting_action", models.Exception_.created_at <= week_ago
    ).count()

    resolved_this_week = base.filter(
        models.Exception_.resolved_at.isnot(None), models.Exception_.resolved_at >= week_ago
    ).count()

    # avg time to act = avg hours between created_at and first 'action' timeline event
    exc_ids = [e.id for e in base.all()]
    action_events = (
        db.query(models.TimelineEvent)
        .filter(models.TimelineEvent.exception_id.in_(exc_ids), models.TimelineEvent.kind == "action")
        .order_by(models.TimelineEvent.created_at.asc())
        .all()
    )
    first_action = {}
    for ev in action_events:
        if ev.exception_id not in first_action:
            first_action[ev.exception_id] = ev.created_at
    exc_by_id = {e.id: e for e in base.all()}
    deltas = [
        (ts - exc_by_id[eid].created_at).total_seconds() / 3600
        for eid, ts in first_action.items()
        if eid in exc_by_id
    ]
    avg_time_to_act = round(sum(deltas) / len(deltas), 1) if deltas else 0.0

    return {
        "critical_open": critical_open,
        "critical_open_delta_vs_last_week": critical_open - critical_open_last_week,
        "awaiting_action": awaiting,
        "awaiting_action_delta_vs_last_week": awaiting - awaiting_last_week,
        "resolved_this_week": resolved_this_week,
        "avg_time_to_act_hours": avg_time_to_act,
    }


@router.get("/export")
def export_csv(
    severity: Optional[str] = None,
    status: Optional[str] = None,
    owner: Optional[str] = None,
    partner: Optional[str] = None,
    format: str = "csv",
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    query = scope_exceptions_query(db.query(models.Exception_), user)
    if severity:
        query = query.filter(models.Exception_.severity == severity.lower())
    if status:
        query = query.filter(models.Exception_.status == status)
    if owner:
        owner_id = user.id if owner == "me" else owner
        query = query.filter(models.Exception_.owner_id == owner_id)
    items = query.order_by(models.Exception_.created_at.desc()).all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Severity", "Status", "Title", "Type", "Company", "Source", "Owner", "Value at risk", "Age", "Created at"])
    for e in items:
        writer.writerow(
            [
                e.severity, utils.status_label(e.status), e.title, e.type, e.company,
                e.source_system, utils.owner_display(e), e.value_at_risk,
                utils.humanize_age(e.created_at), e.created_at.isoformat(),
            ]
        )
    buf.seek(0)
    utils.audit(db, user, "export_exceptions_csv", entity_type="exceptions", after={"row_count": len(items)})
    return StreamingResponse(
        iter([buf.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=exceptions_export.csv"},
    )


@router.get("/{exception_id}")
def get_exception(exception_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    exc = _get_or_404(db, exception_id, user)
    settings = utils.get_settings(db)
    return _detail(db, exc, user, settings)


@router.post("")
def raise_exception(
    body: RaiseExceptionRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    if not body.title.strip():
        raise HTTPException(status_code=422, detail="title is required")
    if body.severity.lower() not in ("critical", "high", "medium"):
        raise HTTPException(status_code=422, detail="severity must be critical/high/medium")

    owner = None
    if body.owner_id:
        owner = db.query(models.User).filter(models.User.id == body.owner_id).first()
    elif body.owner_name:
        owner = db.query(models.User).filter(models.User.name.ilike(f"%{body.owner_name}%")).first()
    if not owner:
        raise HTTPException(status_code=422, detail="owner is required and must resolve to a known user")

    settings = utils.get_settings(db)
    now = datetime.utcnow()
    exc = models.Exception_(
        title=body.title.strip(),
        severity=body.severity.lower(),
        status="awaiting_action",
        type=body.type or "Manual",
        source_system=body.source_system or "Manual",
        company=body.company or "—",
        owner_id=owner.id,
        partner_id=body.partner_id,
        impact_json=json.dumps(
            [
                ["Detected by", f"Raised manually — {user.name}", False],
                ["Business impact", f"€{body.value_at_risk:,.0f} exposure" if body.value_at_risk else "Not yet quantified", bool(body.value_at_risk)],
                ["Current owner", f"{owner.name} ({owner.title or owner.role})", False],
            ]
        ),
        value_at_risk=body.value_at_risk,
        push_to=body.source_system if body.source_system not in ("Manual", "") else "—",
        sla_due_at=utils.sla_due_at_for(now, body.severity.lower(), settings),
        is_new=True,
    )
    db.add(exc)
    db.commit()
    db.refresh(exc)

    utils.add_timeline_event(
        db, exc.id, "detected", user.name,
        f"Exception raised manually by {user.name} at {now.strftime('%H:%M')}." + (f" Notes: {body.notes}" if body.notes else ""),
        actor_id=user.id, actor_type="user",
    )
    utils.notify(db, owner.id, "created", f"New exception assigned to you: {exc.title}", entity_ref=exc.id)

    from app.integrations.teams import send_webhook
    settings_flags = json.loads(settings.feature_flags_json)
    if settings_flags.get("teams_notifications"):
        send_webhook(db, f"New {exc.severity} exception raised: {exc.title}", entity_ref=exc.id)

    return _detail(db, exc, user, settings)


@router.post("/{exception_id}/approve/init")
def approve_init(exception_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    exc = _get_or_404(db, exception_id, user)
    if user.role == "partner":
        raise HTTPException(status_code=403, detail="Partners cannot approve internal actions")
    if exc.status in ("action_taken", "resolved"):
        raise HTTPException(status_code=409, detail=f"Exception is already {exc.status}")

    token = uuid.uuid4().hex
    exc.confirm_token = token
    exc.confirm_token_expires = datetime.utcnow() + timedelta(minutes=5)
    db.commit()
    return {"confirm_token": token, "expires_in_seconds": 300}


@router.post("/{exception_id}/approve")
def approve(
    exception_id: str,
    body: ApproveRequest,
    idempotency_key: Optional[str] = Header(None, alias="Idempotency-Key"),
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if not idempotency_key:
        raise HTTPException(status_code=400, detail="Idempotency-Key header is required")

    existing = db.query(models.IdempotencyKey).filter(models.IdempotencyKey.key == idempotency_key).first()
    if existing:
        return json.loads(existing.response_json)

    exc = _get_or_404(db, exception_id, user)
    if user.role == "partner":
        raise HTTPException(status_code=403, detail="Partners cannot approve internal actions")
    if exc.status in ("action_taken", "resolved"):
        raise HTTPException(status_code=409, detail=f"Exception is already {exc.status}")
    if not exc.confirm_token or exc.confirm_token != body.confirm_token:
        raise HTTPException(status_code=400, detail="Invalid confirm_token — call approve/init first")
    if exc.confirm_token_expires and exc.confirm_token_expires < datetime.utcnow():
        raise HTTPException(status_code=400, detail="confirm_token expired — call approve/init again")

    from app.integrations.registry import ADAPTERS

    push_result = {"system": exc.push_to, "status": "confirmed"}
    adapter = ADAPTERS.get((exc.push_to or "").lower())
    if adapter:
        push_result = adapter.push_decision({"exception_id": exc.id})

    now = datetime.utcnow()
    exc.status = "action_taken"
    exc.is_new = False
    exc.confirm_token = None
    exc.confirm_token_expires = None
    db.commit()

    event = utils.add_timeline_event(
        db, exc.id, "action", user.name,
        f"Approved by {user.name}. Electronically signed and timestamped {now.strftime('%Y-%m-%d %H:%M UTC')}. "
        f"Decision pushed to {exc.push_to}: {push_result.get('detail', push_result.get('status'))}.",
        actor_id=user.id, actor_type="user", metadata={"push_result": push_result},
    )

    # Mark the matching open "approve"-kind action(s) for this exception done — this is
    # what "Approve (with Confirm) ... action row -> done" means in the spec. Unrelated
    # review/start actions on the same exception are left open; they close only via
    # PATCH /actions/{id} when the user actually completes them.
    open_actions = (
        db.query(models.Action)
        .filter(models.Action.exception_id == exc.id, models.Action.status != "done", models.Action.kind == "approve")
        .all()
    )
    for a in open_actions:
        a.status = "done"
        a.completed_at = now
    suggestion = (
        db.query(models.AiSuggestion)
        .filter(models.AiSuggestion.exception_id == exc.id, models.AiSuggestion.accepted_at.is_(None))
        .first()
    )
    if suggestion:
        suggestion.accepted_at = now
        suggestion.accepted_by = user.id
    db.commit()

    settings = utils.get_settings(db)
    result = _detail(db, exc, user, settings)

    db.add(models.IdempotencyKey(key=idempotency_key, endpoint="approve", response_json=json.dumps(result, default=str)))
    db.commit()
    return result


@router.post("/{exception_id}/escalate")
def escalate(
    exception_id: str, body: EscalateRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    exc = _get_or_404(db, exception_id, user)
    target = db.query(models.User).filter(models.User.id == body.target_user_id).first()
    if not target:
        raise HTTPException(status_code=422, detail="target_user_id does not resolve to a known user")

    deadline = None
    if body.deadline:
        try:
            deadline = datetime.fromisoformat(body.deadline)
        except ValueError:
            raise HTTPException(status_code=422, detail="deadline must be ISO-8601")

    exc.status = "escalated"
    exc.escalation_deadline = deadline
    exc.auto_escalate = bool(deadline)
    db.commit()

    utils.add_timeline_event(
        db, exc.id, "escalation", user.name,
        f"Escalated to {target.name} by {user.name}." + (f" Deadline: {body.deadline}." if body.deadline else "") + (f" Note: {body.note}" if body.note else ""),
        actor_id=user.id, actor_type=user.role if user.id else "system",
        metadata={"target_user_id": target.id, "deadline": body.deadline},
    )
    utils.notify(db, target.id, "escalated", f"Escalated to you: {exc.title}", entity_ref=exc.id)

    settings = utils.get_settings(db)
    return _detail(db, exc, user, settings)


@router.post("/{exception_id}/notes")
def add_note(exception_id: str, body: NoteRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    exc = _get_or_404(db, exception_id, user)
    if not body.body.strip():
        raise HTTPException(status_code=422, detail="body is required")
    utils.add_timeline_event(
        db, exc.id, "note", user.name, body.body.strip(), actor_id=user.id,
        actor_type="partner" if user.role == "partner" else "user",
    )
    settings = utils.get_settings(db)
    return _detail(db, exc, user, settings)


@router.post("/{exception_id}/ack")
def acknowledge_from_teams(exception_id: str, body: AckRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Callback target for the Teams Adaptive Card 'Acknowledge' button (spec section 2,
    integrations table). Logs acknowledgement without requiring the user to open NEXUS."""
    exc = _get_or_404(db, exception_id, user)
    utils.add_timeline_event(
        db, exc.id, "action", user.name, f"Acknowledged from Microsoft Teams by {user.name}." + (f" {body.note}" if body.note else ""),
        actor_id=user.id, actor_type="user",
    )
    settings = utils.get_settings(db)
    return _detail(db, exc, user, settings)


@router.get("/{exception_id}/deeplink")
def deeplink(exception_id: str, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    exc = _get_or_404(db, exception_id, user)
    ref = exc.external_ref or exc.id
    system = (exc.source_system or "system").lower()
    expiry = int((datetime.utcnow() + timedelta(minutes=10)).timestamp())
    sig_payload = f"{system}:{ref}:{expiry}"
    signature = hmac.new(JWT_SECRET.encode(), sig_payload.encode(), hashlib.sha256).hexdigest()[:32]
    url = f"https://{system}.bluecrux-mock.local/records/{ref}?sig={signature}&exp={expiry}"
    return {"url": url, "system": exc.source_system, "expires_at": datetime.utcfromtimestamp(expiry).isoformat()}

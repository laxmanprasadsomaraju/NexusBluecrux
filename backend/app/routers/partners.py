from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, require_roles
from app.schemas import PartnerRequestBody

router = APIRouter(prefix="/partners", tags=["partners"])


@router.get("")
def list_partners(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    partners = db.query(models.Partner).all()
    if user.role == "partner":
        partners = [p for p in partners if p.id == user.partner_id]

    items = []
    for p in partners:
        exceptions = db.query(models.Exception_).filter(
            models.Exception_.partner_id == p.id, models.Exception_.status.notin_(["action_taken", "resolved"])
        ).all()
        by_sev = defaultdict(int)
        for e in exceptions:
            by_sev[e.severity] += 1
        parts = [f"{by_sev[s]} {s.capitalize()}" for s in ("critical", "high", "medium") if by_sev[s]]
        top_sev = next((s for s in ("critical", "high", "medium") if by_sev[s]), None)
        items.append(
            {
                "id": p.id,
                "name": p.name,
                "type": p.type,
                "open_summary": " · ".join(parts) if parts else "—",
                "open_top_severity": top_sev,
                "avg_response_hours": p.avg_response_hours,
                "status": p.status,
            }
        )
    return {"items": items}


@router.get("/{partner_id}/scorecard")
def partner_scorecard(partner_id: str, days: int = Query(90, ge=1, le=365), db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    partner = db.query(models.Partner).filter(models.Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    if user.role == "partner" and user.partner_id != partner_id:
        raise HTTPException(status_code=403, detail="Partners may only view their own scorecard")

    since = datetime.utcnow() - timedelta(days=days)
    exceptions = db.query(models.Exception_).filter(
        models.Exception_.partner_id == partner_id, models.Exception_.created_at >= since
    ).all()
    resolved = [e for e in exceptions if e.status in ("action_taken", "resolved")]

    weekly = defaultdict(lambda: {"opened": 0, "resolved": 0})
    for e in exceptions:
        key = e.created_at.strftime("%Y-W%W")
        weekly[key]["opened"] += 1
        if e.resolved_at:
            rkey = e.resolved_at.strftime("%Y-W%W")
            weekly[rkey]["resolved"] += 1

    return {
        "partner": {"id": partner.id, "name": partner.name, "type": partner.type, "status": partner.status},
        "days": days,
        "total_exceptions": len(exceptions),
        "resolved_exceptions": len(resolved),
        "avg_response_hours": partner.avg_response_hours,
        "trend": [{"period": k, **v} for k, v in sorted(weekly.items())],
    }


@router.post("/{partner_id}/requests")
def send_capacity_request(
    partner_id: str, body: PartnerRequestBody, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)
):
    partner = db.query(models.Partner).filter(models.Partner.id == partner_id).first()
    if not partner:
        raise HTTPException(status_code=404, detail="Partner not found")
    exc = db.query(models.Exception_).filter(models.Exception_.id == body.exception_id).first()
    if not exc:
        raise HTTPException(status_code=404, detail="Exception not found")

    deadline = None
    if body.deadline:
        try:
            deadline = datetime.fromisoformat(body.deadline)
        except ValueError:
            raise HTTPException(status_code=422, detail="deadline must be ISO-8601")
    else:
        deadline = datetime.utcnow() + timedelta(hours=partner.avg_response_hours)

    exc.status = "partner_response_pending"
    exc.escalation_deadline = deadline
    exc.auto_escalate = True
    db.commit()

    utils.add_timeline_event(
        db, exc.id, "action", user.name,
        f"Structured capacity request sent to {partner.name} by {user.name}." + (f" {body.message}" if body.message else "")
        + f" Auto-escalation armed for {deadline.strftime('%H:%M')} if no response.",
        actor_id=user.id, actor_type="user",
    )

    from app.integrations.teams import send_webhook
    send_webhook(db, f"Capacity request sent to {partner.name} for {exc.title}", entity_ref=exc.id)

    return {"status": "sent", "partner": partner.name, "exception_id": exc.id, "auto_escalation_deadline": deadline.isoformat()}

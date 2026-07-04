"""GET /audit-log — admin-only read access to the generic AuditLog table (settings
changes, role changes, integration connects, PDF exports, CSV exports, rule edits,
user invites, etc). Exception-level audit trail lives in timeline_events instead and
is read via GET /exceptions/{id}."""
import json
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import require_roles

router = APIRouter(prefix="/audit-log", tags=["audit-log"])


@router.get("")
def list_audit_log(
    actor: Optional[str] = Query(None, description="actor_id or actor_name substring"),
    entity_type: Optional[str] = None,
    entity_id: Optional[str] = None,
    since: Optional[str] = Query(None, description="ISO-8601 date/datetime lower bound"),
    until: Optional[str] = Query(None, description="ISO-8601 date/datetime upper bound"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    user: models.User = Depends(require_roles("admin")),
):
    query = db.query(models.AuditLog)
    if actor:
        query = query.filter((models.AuditLog.actor_id == actor) | (models.AuditLog.actor_name.ilike(f"%{actor}%")))
    if entity_type:
        query = query.filter(models.AuditLog.entity_type == entity_type)
    if entity_id:
        query = query.filter(models.AuditLog.entity_id == entity_id)
    if since:
        query = query.filter(models.AuditLog.created_at >= datetime.fromisoformat(since))
    if until:
        query = query.filter(models.AuditLog.created_at <= datetime.fromisoformat(until))

    total = query.count()
    items = (
        query.order_by(models.AuditLog.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )
    return {
        "items": [
            {
                "id": e.id,
                "actor_id": e.actor_id,
                "actor_name": e.actor_name,
                "action": e.action,
                "entity_type": e.entity_type,
                "entity_id": e.entity_id,
                "before": json.loads(e.before_json),
                "after": json.loads(e.after_json),
                "created_at": e.created_at.isoformat(),
            }
            for e in items
        ],
        "total": total,
        "page": page,
        "page_size": page_size,
    }

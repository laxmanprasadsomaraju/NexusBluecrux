from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, scope_exceptions_query
from app.schemas import ActionPatchRequest

router = APIRouter(prefix="/actions", tags=["actions"])


@router.get("")
def list_actions(
    assignee: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    query = db.query(models.Action)
    if assignee:
        assignee_id = user.id if assignee == "me" else assignee
        query = query.filter(models.Action.assignee_id == assignee_id)
    else:
        query = query.filter(models.Action.assignee_id == user.id)
    if status:
        query = query.filter(models.Action.status == status)

    actions = query.all()
    # row-level security: only include actions whose exception the caller may see
    visible_exc_ids = {
        e.id for e in scope_exceptions_query(db.query(models.Exception_), user).all()
    }
    actions = [a for a in actions if a.exception_id in visible_exc_ids]

    exc_by_id = {e.id: e for e in db.query(models.Exception_).filter(
        models.Exception_.id.in_([a.exception_id for a in actions])
    ).all()}

    items = []
    for a in actions:
        exc = exc_by_id.get(a.exception_id)
        bucket = utils.action_bucket(a.due_at) if a.status != "done" else "Completed"
        items.append(
            {
                "id": a.id,
                "title": a.title,
                "kind": a.kind,
                "status": a.status,
                "bucket": bucket,
                "due_at": a.due_at.isoformat(),
                "completed_at": a.completed_at.isoformat() if a.completed_at else None,
                "exception_id": a.exception_id,
                "exception_title": exc.title if exc else None,
                "severity": exc.severity if exc else None,
                "source_system": exc.source_system if exc else None,
                "context": f"Due: {a.due_at.strftime('%a %H:%M')} · {exc.source_system if exc else ''} · {exc.severity if exc else ''}",
            }
        )

    order = {"Overdue": 0, "Due today": 1, "Tomorrow": 2, "This week": 3, "Completed": 4}
    items.sort(key=lambda x: (order.get(x["bucket"], 5), x["due_at"]))
    return {"items": items, "total": len(items)}


@router.patch("/{action_id}")
def patch_action(action_id: str, body: ActionPatchRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    action = db.query(models.Action).filter(models.Action.id == action_id).first()
    if not action:
        raise HTTPException(status_code=404, detail="Action not found")
    if body.status not in ("open", "in_progress", "done"):
        raise HTTPException(status_code=422, detail="status must be open/in_progress/done")

    action.status = body.status
    if body.status == "done":
        action.completed_at = datetime.utcnow()
    db.commit()

    exc = db.query(models.Exception_).filter(models.Exception_.id == action.exception_id).first()
    if exc:
        label = {"in_progress": "started", "open": "reopened", "done": "completed"}[body.status]
        utils.add_timeline_event(
            db, exc.id, "action", user.name, f"Action '{action.title}' {label} by {user.name}.",
            actor_id=user.id, actor_type="user",
        )
        if body.status == "in_progress" and exc.status == "awaiting_action":
            exc.status = "in_review"
            db.commit()

    return {
        "id": action.id,
        "status": action.status,
        "completed_at": action.completed_at.isoformat() if action.completed_at else None,
    }

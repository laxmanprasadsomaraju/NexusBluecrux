from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    items = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user.id)
        .order_by(models.Notification.created_at.desc())
        .limit(100)
        .all()
    )
    return {
        "items": [
            {
                "id": n.id,
                "kind": n.kind,
                "text": n.text,
                "entity_ref": n.entity_ref,
                "unread": n.read_at is None,
                "created_at": n.created_at.isoformat(),
            }
            for n in items
        ],
        "unread_count": sum(1 for n in items if n.read_at is None),
    }


@router.post("/read-all")
def read_all(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    now = datetime.utcnow()
    updated = (
        db.query(models.Notification)
        .filter(models.Notification.user_id == user.id, models.Notification.read_at.is_(None))
        .update({models.Notification.read_at: now})
    )
    db.commit()
    return {"marked_read": updated}

"""
Microsoft Teams outgoing webhook simulation. A real implementation would POST an
Adaptive Card to a Teams incoming-webhook URL and expose the acknowledge callback at
POST /exceptions/{id}/ack (implemented in routers/exceptions.py). Here we just log the
"card" as a sync_log entry so the effect is visible in GET /integrations/sync-log.
"""
from sqlalchemy.orm import Session
from app import models


def send_webhook(db: Session, text: str, entity_ref: str = "") -> dict:
    entry = models.SyncLogEntry(system="Teams", message=f"Adaptive Card sent: {text}")
    db.add(entry)
    db.commit()
    return {"system": "Teams", "status": "sent", "entity_ref": entity_ref}

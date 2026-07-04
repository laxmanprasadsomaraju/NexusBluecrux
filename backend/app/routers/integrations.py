import base64
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, require_roles
from app.schemas import IntegrationConnectRequest

router = APIRouter(prefix="/integrations", tags=["integrations"])


def _serialize(ig: models.Integration) -> dict:
    return {
        "id": ig.id,
        "name": ig.system,
        "vendor": ig.vendor,
        "direction": ig.direction,
        "status": ig.status,
        "description": ig.description,
        "last_sync_at": ig.last_sync_at.isoformat() if ig.last_sync_at else None,
    }


@router.get("")
def list_integrations(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return {"items": [_serialize(i) for i in db.query(models.Integration).all()]}


@router.post("/{integration_id}/connect")
def connect_integration(
    integration_id: str, body: IntegrationConnectRequest, db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin"))
):
    ig = db.query(models.Integration).filter(models.Integration.id == integration_id).first()
    if not ig:
        raise HTTPException(status_code=404, detail="Integration not found")
    before = _serialize(ig)
    # Mock "Key Vault": never store the raw key in the DB — store only a base64 placeholder
    # blob and a reference name. A real deployment stores the secret in Azure Key Vault and
    # keeps only the vault URI here.
    ig.config_json = json.dumps({"key_vault_ref": f"kv://nexus/{integration_id}-api-key", "stored": base64.b64encode(b"***redacted***").decode()})
    ig.status = "connected"
    ig.last_sync_at = ig.last_sync_at or datetime.utcnow()
    db.commit()
    utils.audit(db, user, "connect_integration", entity_type="integration", entity_id=integration_id, before=before, after=_serialize(ig))
    return _serialize(ig)


@router.post("/{integration_id}/disconnect")
def disconnect_integration(integration_id: str, db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin"))):
    ig = db.query(models.Integration).filter(models.Integration.id == integration_id).first()
    if not ig:
        raise HTTPException(status_code=404, detail="Integration not found")
    before = _serialize(ig)
    ig.status = "disconnected"
    ig.config_json = "{}"
    db.commit()
    utils.audit(db, user, "disconnect_integration", entity_type="integration", entity_id=integration_id, before=before, after=_serialize(ig))
    return _serialize(ig)


@router.get("/sync-log")
def sync_log(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    entries = db.query(models.SyncLogEntry).order_by(models.SyncLogEntry.created_at.desc()).limit(100).all()
    return {
        "items": [
            {"id": e.id, "system": e.system, "message": e.message, "created_at": e.created_at.isoformat()}
            for e in entries
        ]
    }

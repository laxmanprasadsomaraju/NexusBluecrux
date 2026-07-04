import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, require_roles
from app.schemas import SettingsUpdateRequest

router = APIRouter(prefix="/settings", tags=["settings"])


def _serialize(s: models.WorkspaceSettings) -> dict:
    return {
        "sla_hours": json.loads(s.sla_hours_json),
        "currency": s.currency,
        "retention_years": s.retention_years,
        "on_time_target_pct": s.on_time_target_pct,
        "feature_flags": json.loads(s.feature_flags_json),
    }


@router.get("")
def get_settings(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return _serialize(utils.get_settings(db))


@router.put("")
def update_settings(body: SettingsUpdateRequest, db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin"))):
    settings = utils.get_settings(db)
    before = _serialize(settings)

    if body.sla_hours is not None:
        settings.sla_hours_json = json.dumps(body.sla_hours)
    if body.currency is not None:
        settings.currency = body.currency
    if body.retention_years is not None:
        settings.retention_years = body.retention_years
    if body.on_time_target_pct is not None:
        settings.on_time_target_pct = body.on_time_target_pct
    if body.feature_flags is not None:
        merged = json.loads(settings.feature_flags_json)
        merged.update(body.feature_flags)
        settings.feature_flags_json = json.dumps(merged)

    db.commit()
    after = _serialize(settings)
    utils.audit(db, user, "update_settings", entity_type="workspace_settings", entity_id="1", before=before, after=after)
    return after

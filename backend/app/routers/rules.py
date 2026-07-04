from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, require_roles
from app.schemas import RuleCreateRequest, RulePatchRequest

router = APIRouter(prefix="/rules", tags=["rules"])


def _serialize(r: models.AlertRule) -> dict:
    return {
        "id": r.id,
        "name": r.name,
        "condition_dsl": r.condition_dsl,
        "severity": r.severity,
        "route_to_role": r.route_to_role,
        "source_system": r.source_system,
        "enabled": r.enabled,
    }


@router.get("")
def list_rules(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    return {"items": [_serialize(r) for r in db.query(models.AlertRule).all()]}


@router.post("")
def create_rule(body: RuleCreateRequest, db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin", "director"))):
    rule = models.AlertRule(
        name=body.name, condition_dsl=body.condition_dsl, severity=body.severity.lower(),
        route_to_role=body.route_to_role, source_system=body.source_system, enabled=body.enabled,
    )
    db.add(rule)
    db.commit()
    db.refresh(rule)
    utils.audit(db, user, "create_rule", entity_type="alert_rule", entity_id=rule.id, after=_serialize(rule))
    return _serialize(rule)


@router.patch("/{rule_id}")
def patch_rule(rule_id: str, body: RulePatchRequest, db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin", "director"))):
    rule = db.query(models.AlertRule).filter(models.AlertRule.id == rule_id).first()
    if not rule:
        raise HTTPException(status_code=404, detail="Rule not found")
    before = _serialize(rule)
    if body.enabled is not None:
        rule.enabled = body.enabled
    db.commit()
    utils.audit(db, user, "patch_rule", entity_type="alert_rule", entity_id=rule.id, before=before, after=_serialize(rule))
    return _serialize(rule)

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, require_roles
from app.schemas import UserInviteRequest, UserPatchRequest

router = APIRouter(prefix="/users", tags=["users"])


def _full(u: models.User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "title": u.title,
        "team_id": u.team_id,
        "team_name": u.team.name if u.team else None,
        "partner_id": u.partner_id,
        "status": u.status,
        "last_active_at": u.last_active_at.isoformat() if u.last_active_at else None,
        "created_at": u.created_at.isoformat(),
    }


def _minimal(u: models.User) -> dict:
    """Fields safe to expose to any authenticated user for owner/escalation-target
    pickers: id/name/email/role/title/team only — no status, no last_active_at, no
    partner_id, no internal audit fields."""
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "title": u.title,
        "team_name": u.team.name if u.team else None,
    }


@router.get("")
def list_users(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    """Readable by any authenticated user (not admin-gated) so planners can search for
    an owner when raising an exception or picking an escalation target. Non-admins get
    the minimal id/name/email/role/title/team shape; admins get the full record
    (status, last_active_at, team_id, partner_id) for the Users & permissions screen."""
    if user.role == "admin":
        return {"items": [_full(u) for u in db.query(models.User).all()]}
    users = db.query(models.User).filter(models.User.status != "deactivated").all()
    return {"items": [_minimal(u) for u in users]}


@router.post("/invite")
def invite_user(body: UserInviteRequest, db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin"))):
    if db.query(models.User).filter(models.User.email == body.email).first():
        raise HTTPException(status_code=409, detail="A user with this email already exists")
    if body.role not in ("planner", "manager", "director", "partner", "admin"):
        raise HTTPException(status_code=422, detail="invalid role")

    new_user = models.User(
        email=body.email, name=body.name, role=body.role, title=body.title,
        team_id=body.team_id, status="invited",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Mock Entra B2B invitation email — no password is ever stored in NEXUS.
    print(f"[mock email] Entra B2B invitation sent to {body.email}: 'You've been invited to NEXUS by Bluecrux. Sign in with your company account.'")
    utils.audit(db, user, "invite_user", entity_type="user", entity_id=new_user.id, after=_full(new_user))
    return _full(new_user)


@router.post("/{user_id}/reinvite")
def reinvite_user(user_id: str, db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin"))):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    if target.status != "invited":
        raise HTTPException(status_code=409, detail="Only invited users can be re-invited")
    print(f"[mock email] Entra B2B invitation re-sent to {target.email}")
    utils.audit(db, user, "reinvite_user", entity_type="user", entity_id=target.id)
    return {"status": "reinvited", "email": target.email}


@router.patch("/{user_id}")
def patch_user(user_id: str, body: UserPatchRequest, db: Session = Depends(get_db), user: models.User = Depends(require_roles("admin"))):
    target = db.query(models.User).filter(models.User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")
    before = _full(target)

    if body.role is not None:
        if body.role not in ("planner", "manager", "director", "partner", "admin"):
            raise HTTPException(status_code=422, detail="invalid role")
        target.role = body.role
    if body.status is not None:
        if body.status not in ("active", "invited", "deactivated"):
            raise HTTPException(status_code=422, detail="invalid status")
        target.status = body.status

    db.commit()
    utils.audit(db, user, "patch_user", entity_type="user", entity_id=target.id, before=before, after=_full(target))
    return _full(target)

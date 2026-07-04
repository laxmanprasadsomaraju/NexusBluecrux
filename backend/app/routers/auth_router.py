from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import create_access_token, get_current_user
from app.schemas import LoginRequest

router = APIRouter(prefix="/auth", tags=["auth"])


def _profile(u: models.User) -> dict:
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "title": u.title,
        "team_id": u.team_id,
        "partner_id": u.partner_id,
        "status": u.status,
    }


@router.post("/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """Mock SSO stand-in for Microsoft Entra ID (see README). Trusts a bare email — no
    password — because there is no real Entra tenant in this environment. Lets the
    frontend offer a 'log in as' picker over the seeded demo users."""
    user = db.query(models.User).filter(models.User.email == body.email.lower().strip()).first()
    if not user:
        raise HTTPException(status_code=401, detail="No NEXUS account for this email")
    if user.status != "active":
        raise HTTPException(status_code=403, detail=f"Account is {user.status} — cannot sign in")

    user.last_active_at = datetime.utcnow()
    db.commit()

    token = create_access_token(user)
    return {"access_token": token, "token_type": "bearer", "user": _profile(user)}


@router.get("/me")
def me(user: models.User = Depends(get_current_user)):
    return _profile(user)

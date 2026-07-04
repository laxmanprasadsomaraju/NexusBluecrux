"""
Mock authentication standing in for Microsoft Entra ID / SSO (see README for the swap
plan). `POST /auth/login` trusts a bare email — no password, no MFA — because there is
no real Entra tenant available in this environment. It issues a JWT encoding user id +
role, exactly as the spec describes for the "session: short-lived JWT" requirement.

RBAC + row-level security: `get_current_user` re-reads the user row from the DB on
every request (not just at login), so a `PATCH /users/{id}` deactivate takes effect on
the very next request — this is how "sessions revoked immediately on deactivate" is
achieved without a real token revocation list.
"""
import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

# Hardcoded dev secret — in a real deployment this comes from Key Vault / env var and
# Entra ID would issue the token instead of NEXUS itself.
JWT_SECRET = os.environ.get("NEXUS_JWT_SECRET", "nexus-local-dev-secret-do-not-use-in-prod")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 12

bearer_scheme = HTTPBearer(auto_error=False)


def create_access_token(user: models.User) -> str:
    payload = {
        "sub": user.id,
        "role": user.role,
        "email": user.email,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def get_current_user(
    creds: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    if creds is None:
        raise HTTPException(status_code=401, detail="Missing bearer token")
    payload = decode_token(creds.credentials)
    user = db.query(models.User).filter(models.User.id == payload.get("sub")).first()
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    if user.status != "active":
        raise HTTPException(status_code=403, detail=f"User account is {user.status}")
    return user


def require_roles(*roles: str):
    """Dependency factory for role-gated endpoints, e.g. Depends(require_roles('admin'))."""

    def _check(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role in {roles}, caller is '{user.role}'")
        return user

    return _check


def scope_exceptions_query(query, user: models.User):
    """
    Row-level security. Per spec section 3.2: 'partners see only partner_id = their
    org; planners see own team scope.' This demo enforces the partner isolation rule
    strictly (it's the one the spec repeatedly calls a hard security requirement).
    Full per-team scoping for planner/manager is intentionally not enforced: the
    prototype's own UI shows every internal role the same shared queue with a "Mine"
    client-side filter, so all non-partner roles get the full queue here too.
    """
    if user.role == "partner":
        query = query.filter(models.Exception_.partner_id == user.partner_id)
    return query

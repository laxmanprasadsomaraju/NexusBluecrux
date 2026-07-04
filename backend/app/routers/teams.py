"""GET /teams — read-only listing of teams with members, lead, and escalation path.
Added beyond the original spec at the frontend's request: the Team/User data already
existed in the schema (Team.lead_id, Team.escalation_path_json, User.team_id) but had
no endpoint exposing it. This is intentionally read-only (no create/edit team member
endpoints) — team membership itself is still managed via PATCH /users/{id} (role/team
changes) and POST /users/invite."""
import json
from collections import defaultdict

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.auth import get_current_user

router = APIRouter(prefix="/teams", tags=["teams"])


@router.get("")
def list_teams(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    teams = db.query(models.Team).all()
    users_by_team = defaultdict(list)
    for u in db.query(models.User).filter(models.User.status != "deactivated").all():
        if u.team_id:
            users_by_team[u.team_id].append(u)

    # Open exceptions per team, via each member's owned exceptions.
    open_exceptions = (
        db.query(models.Exception_)
        .filter(models.Exception_.status.notin_(["action_taken", "resolved"]))
        .all()
    )
    open_count_by_owner = defaultdict(int)
    for e in open_exceptions:
        if e.owner_id:
            open_count_by_owner[e.owner_id] += 1

    items = []
    for t in teams:
        members = users_by_team.get(t.id, [])
        lead = next((u for u in members if u.id == t.lead_id), None)
        open_count = sum(open_count_by_owner.get(m.id, 0) for m in members)
        items.append(
            {
                "id": t.id,
                "name": t.name,
                "lead_name": lead.name if lead else None,
                "member_count": len(members),
                "open_exceptions": open_count,
                "escalation_path": json.loads(t.escalation_path_json or "[]"),
                "members": [
                    {"id": m.id, "name": m.name, "title": m.title, "role": m.role, "is_lead": m.id == t.lead_id}
                    for m in members
                ],
            }
        )
    return {"items": items}

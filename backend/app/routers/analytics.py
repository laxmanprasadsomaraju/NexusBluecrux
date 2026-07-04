from collections import defaultdict
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, scope_exceptions_query

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/resolution-trend")
def resolution_trend(weeks: int = Query(4, ge=1, le=52), db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    exceptions = scope_exceptions_query(db.query(models.Exception_), user).all()
    now = datetime.utcnow()
    buckets = []
    for i in range(weeks - 1, -1, -1):
        week_end = now - timedelta(weeks=i)
        week_start = week_end - timedelta(weeks=1)
        opened = sum(1 for e in exceptions if week_start <= e.created_at < week_end)
        resolved = sum(1 for e in exceptions if e.resolved_at and week_start <= e.resolved_at < week_end)
        buckets.append(
            {
                "week_start": week_start.date().isoformat(),
                "week_end": week_end.date().isoformat(),
                "opened": opened,
                "resolved": resolved,
            }
        )
    return {"weeks": buckets}


@router.get("/by-source")
def by_source(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    exceptions = scope_exceptions_query(db.query(models.Exception_), user).all()
    counts = defaultdict(int)
    for e in exceptions:
        counts[e.source_system] += 1
    return {"items": [{"source_system": k, "count": v} for k, v in sorted(counts.items(), key=lambda x: -x[1])]}


@router.get("/team-response")
def team_response(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    exceptions = scope_exceptions_query(db.query(models.Exception_), user).all()
    teams = {t.id: t for t in db.query(models.Team).all()}
    users_by_id = {u.id: u for u in db.query(models.User).all()}

    events_by_exc = defaultdict(list)
    for ev in db.query(models.TimelineEvent).filter(models.TimelineEvent.kind == "action").order_by(models.TimelineEvent.created_at.asc()).all():
        events_by_exc[ev.exception_id].append(ev)

    team_deltas = defaultdict(list)
    for e in exceptions:
        owner = users_by_id.get(e.owner_id)
        if not owner or not owner.team_id:
            continue
        team = teams.get(owner.team_id)
        if not team:
            continue
        first_action = events_by_exc.get(e.id)
        if not first_action:
            continue
        delta_hours = (first_action[0].created_at - e.created_at).total_seconds() / 3600
        team_deltas[team.name].append(delta_hours)

    items = [
        {"team": name, "avg_response_hours": round(sum(vals) / len(vals), 1), "sample_size": len(vals)}
        for name, vals in team_deltas.items()
    ]
    items.sort(key=lambda x: x["avg_response_hours"])
    return {"items": items}


@router.get("/value-at-risk")
def value_at_risk(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    exceptions = scope_exceptions_query(db.query(models.Exception_), user).all()
    open_exc = [e for e in exceptions if e.status not in ("action_taken", "resolved")]
    total = sum(e.value_at_risk for e in open_exc)
    biggest = max(open_exc, key=lambda e: e.value_at_risk, default=None)

    week_ago = datetime.utcnow() - timedelta(days=7)
    open_last_week = [
        e for e in exceptions
        if e.created_at <= week_ago and (e.resolved_at is None or e.resolved_at > week_ago)
        and not (e.status in ("action_taken", "resolved") and e.resolved_at and e.resolved_at <= week_ago)
    ]
    total_last_week = sum(e.value_at_risk for e in open_last_week)

    resolved_value = sum(e.value_at_risk for e in exceptions if e.status in ("action_taken", "resolved"))

    return {
        "total_value_at_risk": total,
        "delta_vs_last_week": total - total_last_week,
        "biggest_contributor": (
            {"id": biggest.id, "title": biggest.title, "value_at_risk": biggest.value_at_risk, "company": biggest.company}
            if biggest else None
        ),
        "value_protected_resolved": resolved_value,
        "currency": utils.get_settings(db).currency,
    }


@router.get("/on-time-rate")
def on_time_rate(db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    settings = utils.get_settings(db)
    exc_ids = {e.id for e in scope_exceptions_query(db.query(models.Exception_), user).all()}
    actions = db.query(models.Action).filter(models.Action.exception_id.in_(exc_ids), models.Action.status == "done").all()

    def pct(subset):
        if not subset:
            return None
        on_time = sum(1 for a in subset if a.completed_at and a.completed_at <= a.due_at)
        return round(100 * on_time / len(subset), 1)

    now = datetime.utcnow()
    this_month = [a for a in actions if a.completed_at and a.completed_at >= now - timedelta(days=30)]
    last_month = [
        a for a in actions
        if a.completed_at and now - timedelta(days=60) <= a.completed_at < now - timedelta(days=30)
    ]

    return {
        "on_time_rate_pct": pct(actions),
        "on_time_rate_this_month_pct": pct(this_month),
        "on_time_rate_last_month_pct": pct(last_month),
        "target_pct": settings.on_time_target_pct,
        "sample_size": len(actions),
    }

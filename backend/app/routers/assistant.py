"""
NEXUS AI chat — a small rule-based/template responder, NOT a call to any external LLM.
Per spec section 2: 'RAG over the caller's permitted exceptions/partners/analytics
only (row-level security applied before retrieval)... never executes actions —
read-only by design.' Every query+response is logged to `assistant_log` with a hash of
the prompt, and every response is tagged as AI-generated. Swap-in point for a real
Azure OpenAI RAG pipeline is `_build_reply()` below — same permitted-data context,
different generator.
"""
import hashlib
import json
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, utils
from app.auth import get_current_user, scope_exceptions_query
from app.schemas import AssistantQueryRequest

router = APIRouter(prefix="/assistant", tags=["assistant"])


def _build_reply(db: Session, user: models.User, message: str) -> str:
    settings = utils.get_settings(db)
    currency = settings.currency
    exceptions = scope_exceptions_query(db.query(models.Exception_), user).all()
    open_exc = [e for e in exceptions if e.status not in ("action_taken", "resolved")]
    crit = [e for e in open_exc if e.severity == "critical"]
    high = [e for e in open_exc if e.severity == "high"]
    med = [e for e in open_exc if e.severity == "medium"]
    low = message.lower()

    def money(v: float) -> str:
        symbol = "€" if currency == "EUR" else ("$" if currency == "USD" else currency + " ")
        return f"{symbol}{v:,.0f}" if v < 1_000_000 else f"{symbol}{v/1_000_000:.1f}M"

    if "risk" in low:
        top = sorted(open_exc, key=lambda e: -e.value_at_risk)[:2]
        if not top:
            return "You have no open exceptions carrying value at risk right now — queue is clear."
        parts = [f"{e.title} ({e.severity}, {money(e.value_at_risk)})" for e in top]
        total = sum(e.value_at_risk for e in open_exc)
        return (
            f"Your biggest risk is {parts[0]}."
            + (f" Second: {parts[1]}." if len(parts) > 1 else "")
            + f" Total value at risk across {len(open_exc)} open exceptions: {money(total)}."
        )

    if "summar" in low or "queue" in low:
        awaiting = sum(1 for e in exceptions if e.status == "awaiting_action")
        oldest = min(open_exc, key=lambda e: e.created_at, default=None)
        oldest_txt = f" Oldest untouched item: {oldest.title} ({utils.humanize_age(oldest.created_at)})." if oldest else ""
        return (
            f"Queue summary: {len(open_exc)} open exceptions — {len(crit)} Critical, {len(high)} High, "
            f"{len(med)} Medium. {awaiting} are awaiting action.{oldest_txt}"
        )

    if "partner" in low or "slow" in low:
        partners = db.query(models.Partner).all()
        if user.role == "partner":
            partners = [p for p in partners if p.id == user.partner_id]
        if not partners:
            return "No partner data is visible to your account."
        slowest = max(partners, key=lambda p: p.avg_response_hours)
        others = [p for p in partners if p.id != slowest.id]
        others_txt = "; ".join(f"{p.name} ({p.avg_response_hours}h, {p.status.replace('_', ' ')})" for p in others[:3])
        return (
            f"{slowest.name} is your slowest partner: {slowest.avg_response_hours}h avg response, status "
            f"'{slowest.status.replace('_', ' ')}'." + (f" Others: {others_txt}." if others_txt else "")
        )

    if "value" in low or "€" in low or "money" in low or "$" in low:
        total = sum(e.value_at_risk for e in open_exc)
        resolved_value = sum(e.value_at_risk for e in exceptions if e.status in ("action_taken", "resolved"))
        biggest = max(open_exc, key=lambda e: e.value_at_risk, default=None)
        biggest_txt = f" Largest contributor: {biggest.title} ({money(biggest.value_at_risk)})." if biggest else ""
        return f"Total value at risk is {money(total)}.{biggest_txt} {money(resolved_value)} has been protected by exceptions resolved to date."

    if "overdue" in low or "action" in low:
        exc_ids = {e.id for e in exceptions}
        now = datetime.utcnow()
        actions = db.query(models.Action).filter(
            models.Action.exception_id.in_(exc_ids), models.Action.assignee_id == user.id, models.Action.status != "done"
        ).all()
        overdue = [a for a in actions if a.due_at < now]
        if not overdue and not actions:
            return "You have no open actions right now."
        if not overdue:
            next_due = min(actions, key=lambda a: a.due_at)
            return f"No overdue actions. Next up: '{next_due.title}' due {next_due.due_at.strftime('%a %H:%M')}."
        names = ", ".join(f"'{a.title}'" for a in overdue[:3])
        return f"You have {len(overdue)} overdue action(s): {names}. Approving these keeps their SLA from breaching further."

    return (
        f"I can answer questions about your open exceptions ({len(open_exc)} currently), partners, value at risk, "
        "and overdue actions — all grounded in live NEXUS data scoped to your permissions. Try: "
        "\"What's my biggest risk?\", \"Summarise the queue\", or \"Which partner is slow?\""
    )


@router.post("/query")
def assistant_query(body: AssistantQueryRequest, db: Session = Depends(get_db), user: models.User = Depends(get_current_user)):
    message = body.message.strip()
    reply = _build_reply(db, user, message) if message else "Ask me about your open exceptions, partners, value at risk, or overdue actions."
    prompt_hash = hashlib.sha256(f"{user.id}:{message}".encode()).hexdigest()

    log = models.AssistantLog(user_id=user.id, query=message, response=reply, prompt_hash=prompt_hash)
    db.add(log)
    db.commit()

    return {
        "reply": reply,
        "ai_generated": True,
        "read_only": True,
        "logged": True,
        "prompt_hash": prompt_hash,
        "model_version": "nexus-rule-engine-sim-1.0",
    }

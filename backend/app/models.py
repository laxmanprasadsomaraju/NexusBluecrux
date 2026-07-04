"""
Data model — see docs/NEXUS_Backend_Spec.md section 1 for the authoritative table list.
A few fields/tables are added beyond the literal spec table where a working
implementation needs them (e.g. `users.partner_id` for partner row-level security,
a generic `audit_log` table for non-exception mutations, a `sync_jobs` table so
`POST /sync` / `GET /sync/{id}` behaves like the spec's async job pattern even
though it runs synchronously here). These are called out inline.
"""
import uuid
import hashlib
import json
from datetime import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


class Team(Base):
    __tablename__ = "teams"
    id = Column(String, primary_key=True, default=lambda: gen_id("team"))
    name = Column(String, nullable=False, unique=True)
    # use_alter breaks the teams<->users circular FK cycle for DDL create/drop ordering
    lead_id = Column(String, ForeignKey("users.id", use_alter=True, name="fk_team_lead"), nullable=True)
    escalation_path_json = Column(Text, default="[]")  # list[str] of role/title labels

    users = relationship("User", back_populates="team", foreign_keys="User.team_id")


class Partner(Base):
    __tablename__ = "partners"
    id = Column(String, primary_key=True, default=lambda: gen_id("partner"))
    name = Column(String, nullable=False, unique=True)
    type = Column(String, nullable=False)  # cmo | supplier | 3pl
    contact_channel = Column(String, default="portal")
    avg_response_hours = Column(Float, default=6.0)
    status = Column(String, default="on_track")  # on_track | monitoring | needs_action
    created_at = Column(DateTime, default=datetime.utcnow)


class User(Base):
    __tablename__ = "users"
    id = Column(String, primary_key=True, default=lambda: gen_id("user"))
    entra_oid = Column(String, default=lambda: str(uuid.uuid4()))  # mock Entra object id
    email = Column(String, nullable=False, unique=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False)  # planner | manager | director | partner | admin
    title = Column(String, default="")  # display title, e.g. "QC Ops Lead"
    team_id = Column(String, ForeignKey("teams.id"), nullable=True)
    partner_id = Column(String, ForeignKey("partners.id"), nullable=True)  # row-level scope for role=partner
    status = Column(String, default="active")  # active | invited | deactivated
    last_active_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    team = relationship("Team", back_populates="users", foreign_keys=[team_id])
    partner = relationship("Partner", foreign_keys=[partner_id])


class AlertRule(Base):
    __tablename__ = "alert_rules"
    id = Column(String, primary_key=True, default=lambda: gen_id("rule"))
    name = Column(String, nullable=False)
    condition_dsl = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # critical | high | medium
    route_to_role = Column(String, nullable=False)  # display label, e.g. "QC Ops Lead"
    source_system = Column(String, nullable=False)
    enabled = Column(Boolean, default=True)


class Integration(Base):
    __tablename__ = "integrations"
    id = Column(String, primary_key=True)  # slug e.g. "axon"
    system = Column(String, nullable=False)
    vendor = Column(String, default="")
    direction = Column(String, default="read")  # read | write | rw | sso | webhook
    status = Column(String, default="disconnected")  # connected | disconnected
    description = Column(String, default="")
    config_json = Column(Text, default="{}")  # mock "Key Vault" blob — see integrations router
    last_sync_at = Column(DateTime, nullable=True)
    sync_cursor = Column(Integer, default=0)  # position in the canned "next exceptions" pool


class Exception_(Base):
    """Named Exception_ to avoid clashing with the Python builtin."""
    __tablename__ = "exceptions"
    id = Column(String, primary_key=True, default=lambda: gen_id("exc"))
    title = Column(String, nullable=False)
    severity = Column(String, nullable=False)  # critical | high | medium
    status = Column(String, nullable=False, default="new")
    type = Column(String, nullable=False)
    source_system = Column(String, nullable=False)
    company = Column(String, default="")
    partner_id = Column(String, ForeignKey("partners.id"), nullable=True)
    owner_id = Column(String, ForeignKey("users.id"), nullable=True)
    rule_id = Column(String, ForeignKey("alert_rules.id"), nullable=True)
    impact_json = Column(Text, default="[]")  # list[[label, value, is_risk_highlight]]
    value_at_risk = Column(Float, default=0.0)
    risk_date = Column(String, default="")
    push_to = Column(String, default="")  # system decisions get pushed back to
    external_ref = Column(String, default="")  # id in the source system, for deeplinks
    sla_due_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    is_new = Column(Boolean, default=True)  # drives the "New" badge until first touched
    confirm_token = Column(String, nullable=True)
    confirm_token_expires = Column(DateTime, nullable=True)
    escalation_deadline = Column(DateTime, nullable=True)
    auto_escalate = Column(Boolean, default=False)

    partner = relationship("Partner", foreign_keys=[partner_id])
    owner = relationship("User", foreign_keys=[owner_id])


class TimelineEvent(Base):
    """
    Append-only audit trail for an exception.
    No UPDATE/DELETE endpoint is ever exposed for this table (see routers/exceptions.py) —
    the append-only guarantee is enforced in the application layer since SQLite has no
    per-table GRANT system to REVOKE UPDATE/DELETE the way Postgres does. Each row also
    carries a hash chain (prev_hash -> hash) for tamper evidence.
    """
    __tablename__ = "timeline_events"
    id = Column(String, primary_key=True, default=lambda: gen_id("evt"))
    exception_id = Column(String, ForeignKey("exceptions.id"), nullable=False)
    kind = Column(String, nullable=False)  # detected | action | note | escalation | system
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String, default="System")
    actor_type = Column(String, default="system")  # user | system | partner | ai
    body = Column(Text, nullable=False)
    metadata_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)
    prev_hash = Column(String, default="")
    hash = Column(String, default="")

    def compute_hash(self) -> str:
        payload = f"{self.exception_id}|{self.kind}|{self.actor_name}|{self.body}|{self.created_at}|{self.prev_hash}"
        return hashlib.sha256(payload.encode()).hexdigest()


class Action(Base):
    __tablename__ = "actions"
    id = Column(String, primary_key=True, default=lambda: gen_id("act"))
    exception_id = Column(String, ForeignKey("exceptions.id"), nullable=False)
    assignee_id = Column(String, ForeignKey("users.id"), nullable=False)
    title = Column(String, nullable=False)
    kind = Column(String, default="approve")  # approve | review | start
    due_at = Column(DateTime, nullable=False)
    status = Column(String, default="open")  # open | in_progress | done
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(String, primary_key=True, default=lambda: gen_id("notif"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    kind = Column(String, default="created")  # created | escalated | overdue | partner
    text = Column(String, nullable=False)
    entity_ref = Column(String, default="")
    read_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WorkspaceSettings(Base):
    __tablename__ = "workspace_settings"
    id = Column(Integer, primary_key=True, default=1)  # singleton row, id always 1
    sla_hours_json = Column(Text, default=json.dumps({"critical": 4, "high": 8, "medium": 24}))
    currency = Column(String, default="EUR")
    retention_years = Column(Integer, default=7)
    on_time_target_pct = Column(Float, default=85.0)
    feature_flags_json = Column(
        Text,
        default=json.dumps(
            {"ai_suggestions": True, "auto_escalation": True, "teams_notifications": True, "partner_portal": False}
        ),
    )


class AiSuggestion(Base):
    __tablename__ = "ai_suggestions"
    id = Column(String, primary_key=True, default=lambda: gen_id("ai"))
    exception_id = Column(String, ForeignKey("exceptions.id"), nullable=False)
    body = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    model_version = Column(String, default="nexus-rule-engine-sim-1.0")
    prompt_hash = Column(String, default="")
    accepted_at = Column(DateTime, nullable=True)
    accepted_by = Column(String, ForeignKey("users.id"), nullable=True)


class AuditLog(Base):
    """
    Generic audit log for mutations that aren't tied to a single exception
    (settings changes, role changes, integration connects, PDF exports, exports, etc).
    Exception-scoped mutations are audited via timeline_events instead.
    """
    __tablename__ = "audit_log"
    id = Column(String, primary_key=True, default=lambda: gen_id("audit"))
    actor_id = Column(String, ForeignKey("users.id"), nullable=True)
    actor_name = Column(String, default="")
    action = Column(String, nullable=False)
    entity_type = Column(String, default="")
    entity_id = Column(String, default="")
    before_json = Column(Text, default="{}")
    after_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)


class SyncJob(Base):
    __tablename__ = "sync_jobs"
    id = Column(String, primary_key=True, default=lambda: gen_id("job"))
    status = Column(String, default="completed")  # this mock runs sync synchronously
    result_json = Column(Text, default="{}")
    created_at = Column(DateTime, default=datetime.utcnow)


class SyncLogEntry(Base):
    __tablename__ = "sync_log"
    id = Column(String, primary_key=True, default=lambda: gen_id("synclog"))
    system = Column(String, nullable=False)
    message = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class AssistantLog(Base):
    """Every /assistant/query call is logged with prompt+response for audit — the
    assistant is read-only and never executes actions (see routers/assistant.py)."""
    __tablename__ = "assistant_log"
    id = Column(String, primary_key=True, default=lambda: gen_id("aiq"))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    query = Column(Text, nullable=False)
    response = Column(Text, nullable=False)
    prompt_hash = Column(String, default="")
    created_at = Column(DateTime, default=datetime.utcnow)


class IdempotencyKey(Base):
    """Records idempotency keys used on POST /exceptions/{id}/approve so a retried
    request with the same key returns the original result instead of double-applying."""
    __tablename__ = "idempotency_keys"
    key = Column(String, primary_key=True)
    endpoint = Column(String, nullable=False)
    response_json = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

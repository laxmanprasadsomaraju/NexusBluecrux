"""Pydantic request/response models. Kept intentionally light — most GET endpoints
return plain dicts built in the router (this is a demo backend, not a client SDK),
Pydantic is used mainly to validate request bodies."""
from typing import Optional
from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str


class RaiseExceptionRequest(BaseModel):
    title: str
    severity: str  # critical | high | medium
    source_system: str = "Manual"
    owner_id: Optional[str] = None
    owner_name: Optional[str] = None  # fallback lookup by name if id not supplied
    company: str = ""
    type: str = "Manual"
    notes: str = ""
    value_at_risk: float = 0.0
    partner_id: Optional[str] = None


class ApproveInitRequest(BaseModel):
    pass


class ApproveRequest(BaseModel):
    confirm_token: str


class EscalateRequest(BaseModel):
    target_user_id: str
    deadline: Optional[str] = None  # ISO datetime string
    note: str = ""


class NoteRequest(BaseModel):
    body: str


class AckRequest(BaseModel):
    note: str = ""


class ActionPatchRequest(BaseModel):
    status: str  # open | in_progress | done


class PartnerRequestBody(BaseModel):
    exception_id: str
    message: str = ""
    deadline: Optional[str] = None  # ISO datetime string


class IntegrationConnectRequest(BaseModel):
    api_key: Optional[str] = "demo-key-12345"


class RuleCreateRequest(BaseModel):
    name: str
    condition_dsl: str
    severity: str
    route_to_role: str
    source_system: str
    enabled: bool = True


class RulePatchRequest(BaseModel):
    enabled: Optional[bool] = None


class UserInviteRequest(BaseModel):
    name: str
    email: str
    role: str
    team_id: Optional[str] = None
    title: str = ""


class UserPatchRequest(BaseModel):
    role: Optional[str] = None
    status: Optional[str] = None


class SettingsUpdateRequest(BaseModel):
    sla_hours: Optional[dict] = None
    currency: Optional[str] = None
    retention_years: Optional[int] = None
    on_time_target_pct: Optional[float] = None
    feature_flags: Optional[dict] = None


class AssistantQueryRequest(BaseModel):
    message: str

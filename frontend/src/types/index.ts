export type Role = 'planner' | 'manager' | 'director' | 'partner' | 'admin';
export type Severity = 'critical' | 'high' | 'medium';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  team_id: string | null;
  partner_id: string | null;
  status: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export interface UserMinimal {
  id: string;
  name: string;
  email: string;
  role: Role;
  title: string;
  team_name: string | null;
}

export interface UserFull extends UserMinimal {
  team_id: string | null;
  partner_id: string | null;
  status: string;
  last_active_at: string | null;
  created_at: string;
}

export interface ExceptionListItem {
  id: string;
  title: string;
  severity: Severity;
  status: string;
  status_label: string;
  type: string;
  source_system: string;
  company: string;
  owner_id: string | null;
  owner_name: string;
  owner_initials: string;
  partner_id: string | null;
  partner_name: string | null;
  value_at_risk: number;
  risk_date: string;
  created_at: string;
  resolved_at: string | null;
  age: string;
  is_new: boolean;
  sla_summary: string;
}

export interface TimelineEvent {
  id: string;
  kind: 'detected' | 'action' | 'note' | 'escalation' | 'system';
  actor_name: string;
  actor_type: string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
  hash: string;
}

export interface AiSuggestion {
  id: string;
  body: string;
  confidence: number;
  model_version: string;
  accepted_at: string | null;
  tag: string;
}

export interface PartnerStatus {
  partner_name: string;
  avg_response_hours: number;
  status: string;
  escalation_deadline: string | null;
}

export interface ExceptionDetail extends ExceptionListItem {
  impact: [string, string, boolean][];
  push_to: string;
  external_ref: string;
  escalation_deadline: string | null;
  rule_trace: { rule_name: string; condition: string; route_to_role: string };
  ai_suggestion: AiSuggestion | null;
  timeline: TimelineEvent[];
  partner_status: PartnerStatus | null;
  allowed_actions: string[];
}

export interface ExceptionListResponse {
  items: ExceptionListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface ExceptionStats {
  critical_open: number;
  critical_open_delta_vs_last_week: number;
  awaiting_action: number;
  awaiting_action_delta_vs_last_week: number;
  resolved_this_week: number;
  avg_time_to_act_hours: number;
}

export interface ActionItem {
  id: string;
  title: string;
  kind: 'approve' | 'review' | 'start';
  status: 'open' | 'in_progress' | 'done';
  bucket: 'Overdue' | 'Due today' | 'Tomorrow' | 'This week' | 'Completed';
  due_at: string;
  completed_at: string | null;
  exception_id: string;
  exception_title: string | null;
  severity: Severity | null;
  source_system: string | null;
  context: string;
}

export interface Partner {
  id: string;
  name: string;
  type: string;
  open_summary: string;
  open_top_severity: Severity | null;
  avg_response_hours: number;
  status: 'on_track' | 'monitoring' | 'needs_action';
}

export interface PartnerScorecard {
  partner: { id: string; name: string; type: string; status: string };
  days: number;
  total_exceptions: number;
  resolved_exceptions: number;
  avg_response_hours: number;
  trend: { period: string; opened: number; resolved: number }[];
}

export interface Integration {
  id: string;
  name: string;
  vendor: string;
  direction: string;
  status: 'connected' | 'disconnected';
  description: string;
  last_sync_at: string | null;
}

export interface SyncLogEntry {
  id: string;
  system: string;
  message: string;
  created_at: string;
}

export interface AlertRule {
  id: string;
  name: string;
  condition_dsl: string;
  severity: Severity;
  route_to_role: string;
  source_system: string;
  enabled: boolean;
}

export interface WorkspaceSettings {
  sla_hours: Record<string, number>;
  currency: string;
  retention_years: number;
  on_time_target_pct: number;
  feature_flags: Record<string, boolean>;
}

export interface NotificationItem {
  id: string;
  kind: string;
  text: string;
  entity_ref: string;
  unread: boolean;
  created_at: string;
}

export interface AuditLogEntry {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  created_at: string;
}

export interface ResolutionTrendWeek {
  week_start: string;
  week_end: string;
  opened: number;
  resolved: number;
}

export interface BySourceItem {
  source_system: string;
  count: number;
}

export interface TeamResponseItem {
  team: string;
  avg_response_hours: number;
  sample_size: number;
}

export interface ValueAtRisk {
  total_value_at_risk: number;
  delta_vs_last_week: number;
  biggest_contributor: { id: string; title: string; value_at_risk: number; company: string } | null;
  value_protected_resolved: number;
  currency: string;
}

export interface OnTimeRate {
  on_time_rate_pct: number | null;
  on_time_rate_this_month_pct: number | null;
  on_time_rate_last_month_pct: number | null;
  target_pct: number;
  sample_size: number;
}

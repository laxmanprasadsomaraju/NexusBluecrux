import { apiFetch } from './client';
import type { AlertRule } from '../types';

export function listRules() {
  return apiFetch<{ items: AlertRule[] }>('/rules');
}

export interface CreateRulePayload {
  name: string;
  condition_dsl: string;
  severity: string;
  route_to_role: string;
  source_system: string;
  enabled?: boolean;
}

export function createRule(payload: CreateRulePayload) {
  return apiFetch<AlertRule>('/rules', { method: 'POST', body: payload });
}

export function patchRule(id: string, enabled: boolean) {
  return apiFetch<AlertRule>(`/rules/${id}`, { method: 'PATCH', body: { enabled } });
}

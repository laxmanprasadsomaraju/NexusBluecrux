import { apiFetch, BASE_URL } from './client';
import type { ExceptionDetail, ExceptionListResponse, ExceptionStats } from '../types';

export interface ExceptionFilters {
  severity?: string;
  status?: string;
  owner?: string;
  partner?: string;
  q?: string;
  page?: number;
  page_size?: number;
}

function qs(params: Record<string, unknown> | ExceptionFilters): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') search.set(k, String(v));
  });
  const str = search.toString();
  return str ? `?${str}` : '';
}

export function listExceptions(filters: ExceptionFilters) {
  return apiFetch<ExceptionListResponse>(`/exceptions${qs(filters)}`);
}

export function getExceptionStats() {
  return apiFetch<ExceptionStats>('/exceptions/stats');
}

export function getException(id: string) {
  return apiFetch<ExceptionDetail>(`/exceptions/${id}`);
}

export interface RaiseExceptionPayload {
  title: string;
  severity: string;
  source_system?: string;
  owner_id?: string;
  owner_name?: string;
  company?: string;
  type?: string;
  notes?: string;
  value_at_risk?: number;
  partner_id?: string;
}

export function raiseException(payload: RaiseExceptionPayload) {
  return apiFetch<ExceptionDetail>('/exceptions', { method: 'POST', body: payload });
}

export function approveInit(id: string) {
  return apiFetch<{ confirm_token: string; expires_in_seconds: number }>(
    `/exceptions/${id}/approve/init`,
    { method: 'POST', body: {} }
  );
}

export function approve(id: string, confirmToken: string, idempotencyKey: string) {
  return apiFetch<ExceptionDetail>(`/exceptions/${id}/approve`, {
    method: 'POST',
    body: { confirm_token: confirmToken },
    headers: { 'Idempotency-Key': idempotencyKey },
  });
}

export function escalate(
  id: string,
  payload: { target_user_id: string; deadline?: string; note?: string }
) {
  return apiFetch<ExceptionDetail>(`/exceptions/${id}/escalate`, { method: 'POST', body: payload });
}

export function addNote(id: string, body: string) {
  return apiFetch<ExceptionDetail>(`/exceptions/${id}/notes`, { method: 'POST', body: { body } });
}

export function getDeeplink(id: string) {
  return apiFetch<{ url: string; system: string; expires_at: string }>(`/exceptions/${id}/deeplink`);
}

export function exportCsvUrl(filters: ExceptionFilters) {
  return `${BASE_URL}/exceptions/export${qs(filters)}`;
}

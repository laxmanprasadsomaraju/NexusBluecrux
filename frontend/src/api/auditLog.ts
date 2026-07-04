import { apiFetch } from './client';
import type { AuditLogEntry } from '../types';

export interface AuditLogFilters {
  actor?: string;
  entity_type?: string;
  entity_id?: string;
  since?: string;
  until?: string;
  page?: number;
  page_size?: number;
}

export function listAuditLog(filters: AuditLogFilters = {}) {
  const search = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') search.set(k, String(v));
  });
  const str = search.toString();
  return apiFetch<{ items: AuditLogEntry[]; total: number; page: number; page_size: number }>(
    `/audit-log${str ? `?${str}` : ''}`
  );
}

import { apiFetch } from './client';
import type { Integration, SyncLogEntry } from '../types';

export function listIntegrations() {
  return apiFetch<{ items: Integration[] }>('/integrations');
}

export function connectIntegration(id: string) {
  return apiFetch<Integration>(`/integrations/${id}/connect`, { method: 'POST', body: {} });
}

export function disconnectIntegration(id: string) {
  return apiFetch<Integration>(`/integrations/${id}/disconnect`, { method: 'POST', body: {} });
}

export function getSyncLog() {
  return apiFetch<{ items: SyncLogEntry[] }>('/integrations/sync-log');
}

export function triggerSync() {
  return apiFetch<{ job_id: string; status: string; created: unknown[]; escalated: unknown[]; integrations_synced: string[] }>(
    '/sync',
    { method: 'POST', body: {} }
  );
}

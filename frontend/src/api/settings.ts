import { apiFetch } from './client';
import type { WorkspaceSettings } from '../types';

export function getSettings() {
  return apiFetch<WorkspaceSettings>('/settings');
}

export function updateSettings(payload: Partial<WorkspaceSettings>) {
  return apiFetch<WorkspaceSettings>('/settings', { method: 'PUT', body: payload });
}

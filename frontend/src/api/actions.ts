import { apiFetch } from './client';
import type { ActionItem } from '../types';

export function listActions(params: { assignee?: string; status?: string } = {}) {
  const search = new URLSearchParams();
  if (params.assignee) search.set('assignee', params.assignee);
  if (params.status) search.set('status', params.status);
  const str = search.toString();
  return apiFetch<{ items: ActionItem[]; total: number }>(`/actions${str ? `?${str}` : ''}`);
}

export function patchAction(id: string, status: 'open' | 'in_progress' | 'done') {
  return apiFetch<{ id: string; status: string; completed_at: string | null }>(`/actions/${id}`, {
    method: 'PATCH',
    body: { status },
  });
}

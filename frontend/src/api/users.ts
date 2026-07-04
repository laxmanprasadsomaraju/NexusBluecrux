import { apiFetch } from './client';
import type { UserFull, UserMinimal } from '../types';

export function listUsers() {
  return apiFetch<{ items: (UserMinimal | UserFull)[] }>('/users');
}

export interface InviteUserPayload {
  name: string;
  email: string;
  role: string;
  team_id?: string;
  title?: string;
}

export function inviteUser(payload: InviteUserPayload) {
  return apiFetch<UserFull>('/users/invite', { method: 'POST', body: payload });
}

export function reinviteUser(id: string) {
  return apiFetch<{ status: string; email: string }>(`/users/${id}/reinvite`, { method: 'POST', body: {} });
}

export function patchUser(id: string, payload: { role?: string; status?: string }) {
  return apiFetch<UserFull>(`/users/${id}`, { method: 'PATCH', body: payload });
}

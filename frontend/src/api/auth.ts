import { apiFetch } from './client';
import type { AuthUser, LoginResponse } from '../types';

export function login(email: string) {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: { email } });
}

export function me() {
  return apiFetch<AuthUser>('/auth/me');
}

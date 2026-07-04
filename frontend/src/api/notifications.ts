import { apiFetch } from './client';
import type { NotificationItem } from '../types';

export function listNotifications() {
  return apiFetch<{ items: NotificationItem[]; unread_count: number }>('/notifications');
}

export function markAllRead() {
  return apiFetch<{ marked_read: number }>('/notifications/read-all', { method: 'POST', body: {} });
}

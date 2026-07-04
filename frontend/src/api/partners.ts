import { apiFetch } from './client';
import type { Partner, PartnerScorecard } from '../types';

export function listPartners() {
  return apiFetch<{ items: Partner[] }>('/partners');
}

export function getPartnerScorecard(id: string, days = 90) {
  return apiFetch<PartnerScorecard>(`/partners/${id}/scorecard?days=${days}`);
}

export function sendPartnerRequest(
  partnerId: string,
  payload: { exception_id: string; message?: string; deadline?: string }
) {
  return apiFetch<{ status: string; partner: string; exception_id: string; auto_escalation_deadline: string }>(
    `/partners/${partnerId}/requests`,
    { method: 'POST', body: payload }
  );
}

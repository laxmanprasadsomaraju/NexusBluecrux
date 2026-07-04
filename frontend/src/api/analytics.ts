import { apiFetch } from './client';
import type { BySourceItem, OnTimeRate, ResolutionTrendWeek, TeamResponseItem, ValueAtRisk } from '../types';

export function getResolutionTrend(weeks = 4) {
  return apiFetch<{ weeks: ResolutionTrendWeek[] }>(`/analytics/resolution-trend?weeks=${weeks}`);
}

export function getBySource() {
  return apiFetch<{ items: BySourceItem[] }>('/analytics/by-source');
}

export function getTeamResponse() {
  return apiFetch<{ items: TeamResponseItem[] }>('/analytics/team-response');
}

export function getValueAtRisk() {
  return apiFetch<ValueAtRisk>('/analytics/value-at-risk');
}

export function getOnTimeRate() {
  return apiFetch<OnTimeRate>('/analytics/on-time-rate');
}

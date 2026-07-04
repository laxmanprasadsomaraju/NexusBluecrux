import { apiFetch } from './client';

export interface TeamMember {
  id: string;
  name: string;
  title: string;
  role: string;
  is_lead: boolean;
}

export interface Team {
  id: string;
  name: string;
  lead_name: string | null;
  member_count: number;
  open_exceptions: number;
  escalation_path: string[];
  members: TeamMember[];
}

export function listTeams() {
  return apiFetch<{ items: Team[] }>('/teams');
}

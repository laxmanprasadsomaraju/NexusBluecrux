import { apiFetch } from './client';

export interface AssistantResponse {
  reply: string;
  ai_generated: boolean;
  read_only: boolean;
  logged: boolean;
  prompt_hash: string;
  model_version: string;
}

export function queryAssistant(message: string) {
  return apiFetch<AssistantResponse>('/assistant/query', { method: 'POST', body: { message } });
}

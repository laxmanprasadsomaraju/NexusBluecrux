import { apiFetch, BASE_URL } from './client';

export function generateExecutivePdf() {
  return apiFetch<{ filename: string; download_url: string }>('/reports/executive-pdf', {
    method: 'POST',
    body: {},
  });
}

export function reportFileUrl(downloadUrl: string) {
  return `${BASE_URL}${downloadUrl}`;
}

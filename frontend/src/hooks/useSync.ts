import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import * as integrationsApi from '../api/integrations';
import { useToast } from './useToast';
import { ApiError } from '../api/client';

const MIN_SPINNER_MS = 1500;

// Sync button: spinner floored at 1.5s regardless of real response time, subtitle
// "Syncing…" -> "Last synced just now" (COLOUR_SPEC B2 / C2).
export function useSync() {
  const [syncing, setSyncing] = useState(false);
  const [subtitle, setSubtitle] = useState('Last synced a few minutes ago from Axon · SAP · Anaplan');
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const sync = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSubtitle('Syncing…');
    const start = Date.now();
    try {
      await integrationsApi.triggerSync();
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPINNER_MS) await new Promise((r) => setTimeout(r, MIN_SPINNER_MS - elapsed));
      setSubtitle('Last synced just now');
      showToast('Data synced from all sources', 'success');
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['integrations'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    } catch (err) {
      const elapsed = Date.now() - start;
      if (elapsed < MIN_SPINNER_MS) await new Promise((r) => setTimeout(r, MIN_SPINNER_MS - elapsed));
      const message = err instanceof ApiError ? err.message : 'Sync failed';
      setSubtitle('Sync failed — try again');
      showToast(message, 'error');
    } finally {
      setSyncing(false);
    }
  }, [syncing, queryClient, showToast]);

  return { syncing, subtitle, sync };
}

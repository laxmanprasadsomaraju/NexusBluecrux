import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import * as integrationsApi from '../../api/integrations';
import { Button } from '../../components/Button/Button';
import { Badge } from '../../components/Badge/Badge';
import { Spinner } from '../../components/Spinner/Spinner';
import { getIntegrationStatusBadge } from '../../lib/statusBadges';
import { formatRelative } from '../../lib/formatters';
import { useToast } from '../../hooks/useToast';
import { ApiError } from '../../api/client';

export function Integrations() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: queryKeys.integrations(), queryFn: integrationsApi.listIntegrations });
  const { data: logData } = useQuery({ queryKey: queryKeys.syncLog(), queryFn: integrationsApi.getSyncLog });

  const connectMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.connectIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations() });
      showToast('Integration connected', 'success');
    },
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not connect', 'error'),
  });
  const disconnectMutation = useMutation({
    mutationFn: (id: string) => integrationsApi.disconnectIntegration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.integrations() });
      showToast('Integration disconnected', 'success');
    },
    onError: (err) => showToast(err instanceof ApiError ? err.message : 'Could not disconnect', 'error'),
  });

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
        {(data?.items ?? []).map((ig) => {
          const badge = getIntegrationStatusBadge(ig.status);
          const pending = connectMutation.isPending || disconnectMutation.isPending;
          return (
            <div key={ig.id} style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 12, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'var(--cyan-pale)',
                    color: 'var(--navy-dark)',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {ig.name[0]}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>{ig.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{ig.direction}</div>
                </div>
                <Badge bg={badge.bg} text={badge.text}>
                  {badge.label}
                </Badge>
              </div>
              <div style={{ fontSize: 12, color: 'var(--dark-gray)', lineHeight: 1.5, flex: 1 }}>{ig.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 11, color: 'var(--timestamp-gray)', flex: 1 }}>
                  {ig.last_sync_at ? `Last synced ${formatRelative(ig.last_sync_at)}` : 'Never synced'}
                </span>
                <Button
                  variant="outline"
                  size="small"
                  disabled={pending}
                  onClick={() => (ig.status === 'connected' ? disconnectMutation.mutate(ig.id) : connectMutation.mutate(ig.id))}
                >
                  {ig.status === 'connected' ? 'Disconnect' : 'Connect'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 12, padding: 14, marginTop: 12 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: 0.5,
            color: 'var(--timestamp-gray)',
            paddingBottom: 8,
            borderBottom: '0.5px solid var(--mid-gray)',
          }}
        >
          Recent sync log
        </div>
        {(logData?.items ?? []).map((entry) => (
          <div key={entry.id} style={{ display: 'flex', gap: 12, padding: '8px 0', borderBottom: '0.5px solid var(--light-gray)', fontSize: 12 }}>
            <span style={{ color: 'var(--timestamp-gray)', width: 130, minWidth: 130 }}>{formatRelative(entry.created_at)}</span>
            <span style={{ fontWeight: 500, color: 'var(--black)', width: 90, minWidth: 90 }}>{entry.system}</span>
            <span style={{ color: 'var(--dark-gray)', flex: 1 }}>{entry.message}</span>
          </div>
        ))}
        {(logData?.items ?? []).length === 0 && <div style={{ fontSize: 12, color: 'var(--timestamp-gray)', padding: '10px 0' }}>No sync activity yet.</div>}
      </div>
    </div>
  );
}

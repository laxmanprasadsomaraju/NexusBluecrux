import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import * as auditLogApi from '../../api/auditLog';
import { Table, Th, Td, Tr } from '../../components/Table/Table';
import { Badge } from '../../components/Badge/Badge';
import { Spinner } from '../../components/Spinner/Spinner';
import { formatDateTime } from '../../lib/formatters';

function actionBadgeColor(action: string): { bg: string; text: string } {
  if (action.includes('delete') || action.includes('deactivate')) return { bg: 'var(--critical-bg)', text: 'var(--critical)' };
  if (action.includes('create') || action.includes('invite') || action.includes('connect')) return { bg: 'var(--resolved-bg)', text: 'var(--resolved)' };
  return { bg: 'var(--medium-bg)', text: 'var(--medium)' };
}

export function AuditLog() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.auditLog({ page_size: 100 }),
    queryFn: () => auditLogApi.listAuditLog({ page_size: 100 }),
  });

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--timestamp-gray)', marginBottom: 10 }}>
        Append-only record of every event and action. Nothing can be edited or deleted.
      </div>
      <Table>
        <thead>
          <tr>
            <Th>When</Th>
            <Th>Actor</Th>
            <Th>Type</Th>
            <Th>Entity</Th>
            <Th>Entry</Th>
          </tr>
        </thead>
        <tbody>
          {items.map((entry, i) => {
            const badge = actionBadgeColor(entry.action);
            return (
              <Tr key={entry.id} index={i}>
                <Td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(entry.created_at)}</Td>
                <Td style={{ fontWeight: 500, color: 'var(--black)', whiteSpace: 'nowrap' }}>{entry.actor_name}</Td>
                <Td>
                  <Badge bg={badge.bg} text={badge.text}>
                    {entry.action.replace(/_/g, ' ')}
                  </Badge>
                </Td>
                <Td style={{ maxWidth: 200 }}>
                  {entry.entity_type} {entry.entity_id ? `· ${entry.entity_id}` : ''}
                </Td>
                <Td>
                  {Object.keys(entry.after || {}).length > 0 ? JSON.stringify(entry.after).slice(0, 120) : '—'}
                </Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
      {items.length === 0 && <div style={{ padding: 24, textAlign: 'center', color: 'var(--timestamp-gray)', fontSize: 12 }}>No audit entries yet.</div>}
    </div>
  );
}

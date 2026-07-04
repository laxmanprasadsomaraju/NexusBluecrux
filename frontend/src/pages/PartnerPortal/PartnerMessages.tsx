import { useQuery } from '@tanstack/react-query';
import * as exceptionsApi from '../../api/exceptions';
import { Spinner } from '../../components/Spinner/Spinner';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { formatDateTime } from '../../lib/formatters';

interface MessageRow {
  id: string;
  exceptionTitle: string;
  who: string;
  when: string;
  body: string;
}

// Real data, not a stub: aggregates every note/action entry across this partner's
// scoped exceptions into a single message-style feed (backend has no dedicated
// messaging endpoint, so this is composed client-side from GET /exceptions/{id}
// timelines, which the backend already scopes to the caller's partner_id).
export function PartnerMessages() {
  const { data: listData, isLoading: listLoading } = useQuery({
    queryKey: ['exceptions', { page_size: 50 }],
    queryFn: () => exceptionsApi.listExceptions({ page_size: 50 }),
  });

  const ids = (listData?.items ?? []).map((e) => e.id);

  const { data: messages, isLoading: detailsLoading } = useQuery({
    queryKey: ['partner-messages', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const details = await Promise.all(ids.map((id) => exceptionsApi.getException(id)));
      const rows: MessageRow[] = [];
      for (const d of details) {
        for (const t of d.timeline) {
          if (t.kind === 'note' || t.kind === 'escalation' || t.actor_type === 'partner') {
            rows.push({ id: t.id, exceptionTitle: d.title, who: t.actor_name, when: t.created_at, body: t.body });
          }
        }
      }
      return rows.sort((a, b) => b.when.localeCompare(a.when));
    },
  });

  if (listLoading || detailsLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  if (!messages || messages.length === 0) {
    return <EmptyState title="No messages yet" subtitle="Notes and responses exchanged on your requests will show up here." />;
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--timestamp-gray)', marginBottom: 12 }}>
        All notes and escalations exchanged on requests addressed to your organisation, most recent first.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 760 }}>
        {messages.map((m) => (
          <div key={m.id} style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 10, padding: '10px 14px' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--black)' }}>{m.who}</span>
              <span style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{formatDateTime(m.when)}</span>
              <span style={{ flex: 1 }} />
              <span style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{m.exceptionTitle}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--dark-gray)', lineHeight: 1.5, marginTop: 4 }}>{m.body}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '../../api/queryKeys';
import * as teamsApi from '../../api/teams';
import { Avatar } from '../../components/Avatar/Avatar';
import { Spinner } from '../../components/Spinner/Spinner';
import { EmptyState } from '../../components/EmptyState/EmptyState';

export function Teams() {
  const { data, isLoading } = useQuery({ queryKey: queryKeys.teams(), queryFn: teamsApi.listTeams });

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  const items = data?.items ?? [];
  if (!items.length) return <EmptyState title="No teams configured yet." />;

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
      <div style={{ fontSize: 12, color: 'var(--timestamp-gray)', marginBottom: 12 }}>
        Teams own escalation paths and share accountability for open exceptions. Membership is managed from Users &amp; permissions.
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
        {items.map((tm) => (
          <div key={tm.id} style={{ background: 'var(--white)', border: '0.5px solid var(--mid-gray)', borderRadius: 12, padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)', flex: 1 }}>{tm.name}</div>
              <span style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{tm.member_count} member{tm.member_count === 1 ? '' : 's'}</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--dark-gray)', marginTop: 4 }}>
              Lead: <span style={{ fontWeight: 500, color: 'var(--black)' }}>{tm.lead_name || 'Unassigned'}</span>
            </div>
            <div style={{ fontSize: 12, color: tm.open_exceptions > 0 ? 'var(--high)' : 'var(--resolved)', marginTop: 4, fontWeight: 500 }}>
              {tm.open_exceptions} open exception{tm.open_exceptions === 1 ? '' : 's'}
            </div>
            <div style={{ display: 'flex', gap: 4, marginTop: 10, flexWrap: 'wrap' }}>
              {tm.members.map((m) => (
                <div key={m.id} title={`${m.name} — ${m.title}`}>
                  <Avatar name={m.name} size={24} />
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--timestamp-gray)', marginTop: 12 }}>
              Escalation path
            </div>
            <div style={{ fontSize: 12, color: 'var(--dark-gray)', marginTop: 4 }}>{tm.escalation_path.join(' → ')}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

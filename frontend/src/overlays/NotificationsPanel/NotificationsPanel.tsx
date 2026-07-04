import { useUi } from '../../hooks/useUi';
import { useNotifications } from '../../hooks/useNotifications';
import { formatRelative } from '../../lib/formatters';

const KIND_DOT: Record<string, string> = {
  created: 'var(--medium)',
  escalated: 'var(--critical)',
  overdue: 'var(--high)',
  partner: 'var(--purple)',
};

export function NotificationsPanel() {
  const { closeNotif } = useUi();
  const { data, markAllRead } = useNotifications();

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 150 }} onClick={closeNotif}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          top: 60,
          right: 16,
          width: 360,
          background: 'var(--white)',
          border: '0.5px solid var(--mid-gray)',
          borderRadius: 12,
          boxShadow: 'var(--shadow-modal)',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: '0.5px solid var(--mid-gray)' }}>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 500, color: 'var(--black)' }}>Notifications</div>
          <button
            onClick={() => markAllRead.mutate()}
            style={{ fontSize: 11, fontWeight: 500, color: 'var(--cyan-primary-hover)', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Mark all read
          </button>
        </div>
        <div style={{ maxHeight: 320, overflowY: 'auto' }}>
          {(data?.items ?? []).map((n) => (
            <div key={n.id} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '0.5px solid var(--light-gray)', background: n.unread ? 'var(--cyan-pale)' : 'transparent' }}>
              <span style={{ width: 8, height: 8, minWidth: 8, borderRadius: '50%', background: KIND_DOT[n.kind] || 'var(--mid-gray)', marginTop: 5 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, color: 'var(--black)', lineHeight: 1.45 }}>{n.text}</div>
                <div style={{ fontSize: 11, color: 'var(--timestamp-gray)', marginTop: 2 }}>{formatRelative(n.created_at)}</div>
              </div>
            </div>
          ))}
          {(data?.items ?? []).length === 0 && (
            <div style={{ padding: '24px 14px', textAlign: 'center', fontSize: 12, color: 'var(--timestamp-gray)' }}>You're all caught up.</div>
          )}
        </div>
      </div>
    </div>
  );
}

import { NavLink } from 'react-router-dom';
import { Avatar } from '../components/Avatar/Avatar';
import { Button } from '../components/Button/Button';
import { useAuth } from '../hooks/useAuth';

export function PartnerTopbar() {
  const { user, logout } = useAuth();

  return (
    <div style={{ background: 'var(--navy-dark)', height: 56, minHeight: 56, display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16 }}>
      <div>
        <span style={{ color: 'var(--white)', fontSize: 16, fontWeight: 500, letterSpacing: 0.5 }}>NEXUS</span>
        <span style={{ color: 'var(--cyan-primary)', fontSize: 12, marginLeft: 6 }}>Partner portal · Powered by Bluecrux</span>
      </div>
      <nav style={{ display: 'flex', gap: 4 }}>
        {[
          { to: '/partner/queue', label: 'Requests' },
          { to: '/partner/messages', label: 'Messages' },
        ].map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            style={({ isActive }) => ({
              fontSize: 12,
              fontWeight: 500,
              color: isActive ? 'var(--navy-dark)' : 'rgba(255,255,255,0.75)',
              background: isActive ? 'var(--cyan-primary)' : 'transparent',
              borderRadius: 8,
              padding: '6px 12px',
              textDecoration: 'none',
            })}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div style={{ flex: 1 }} />
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 12, color: 'var(--white)' }}>{user?.name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>{user?.title} · Partner access</div>
      </div>
      <Avatar name={user?.name || '?'} size={32} />
      <Button variant="outline" onClick={logout} style={{ color: 'rgba(255,255,255,0.7)', borderColor: 'rgba(255,255,255,0.25)', background: 'transparent' }}>
        Sign out
      </Button>
    </div>
  );
}

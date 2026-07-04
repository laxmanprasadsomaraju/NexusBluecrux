import { NavLink, useNavigate } from 'react-router-dom';
import { useState, type ReactElement } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import styles from './Sidebar.module.css';
import { Avatar } from '../components/Avatar/Avatar';
import { useAuth } from '../hooks/useAuth';
import { queryKeys } from '../api/queryKeys';
import * as exceptionsApi from '../api/exceptions';
import * as actionsApi from '../api/actions';
import { DEMO_USERS, ROLE_LABELS } from '../lib/demoUsers';

interface NavItemDef {
  to: string;
  label: string;
  icon: ReactElement;
  badge?: 'critical' | 'pending';
}

const iconProps = {
  width: 16,
  height: 16,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

const icons = {
  queue: (
    <svg {...iconProps}>
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
      <line x1="12" y1="9" x2="12" y2="13"></line>
      <line x1="12" y1="17" x2="12.01" y2="17"></line>
    </svg>
  ),
  actions: (
    <svg {...iconProps}>
      <path d="M10 6h11"></path>
      <path d="M10 12h11"></path>
      <path d="M10 18h11"></path>
      <path d="m3 6 1 1 2-2"></path>
      <path d="m3 12 1 1 2-2"></path>
      <path d="m3 18 1 1 2-2"></path>
    </svg>
  ),
  exec: (
    <svg {...iconProps}>
      <line x1="12" y1="20" x2="12" y2="10"></line>
      <line x1="18" y1="20" x2="18" y2="4"></line>
      <line x1="6" y1="20" x2="6" y2="16"></line>
    </svg>
  ),
  partners: (
    <svg {...iconProps}>
      <path d="M2 20a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8l-7 5V8l-7 5V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"></path>
    </svg>
  ),
  rules: (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path>
    </svg>
  ),
  teams: (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
    </svg>
  ),
  integrations: (
    <svg {...iconProps}>
      <path d="M9 2v6"></path>
      <path d="M15 2v6"></path>
      <path d="M12 17v5"></path>
      <path d="M5 8h14v4a7 7 0 0 1-14 0Z"></path>
    </svg>
  ),
  audit: (
    <svg {...iconProps}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
    </svg>
  ),
  users: (
    <svg {...iconProps}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
      <circle cx="9" cy="7" r="4"></circle>
      <line x1="19" y1="8" x2="19" y2="14"></line>
      <line x1="22" y1="11" x2="16" y2="11"></line>
    </svg>
  ),
  settings: (
    <svg {...iconProps}>
      <line x1="4" y1="21" x2="4" y2="14"></line>
      <line x1="4" y1="10" x2="4" y2="3"></line>
      <line x1="12" y1="21" x2="12" y2="12"></line>
      <line x1="12" y1="8" x2="12" y2="3"></line>
      <line x1="20" y1="21" x2="20" y2="16"></line>
      <line x1="20" y1="12" x2="20" y2="3"></line>
      <line x1="1" y1="14" x2="7" y2="14"></line>
      <line x1="9" y1="8" x2="15" y2="8"></line>
      <line x1="17" y1="16" x2="23" y2="16"></line>
    </svg>
  ),
};

export function Sidebar() {
  const { user, loginAs, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const statsQuery = useQuery({
    queryKey: queryKeys.exceptionStats(),
    queryFn: exceptionsApi.getExceptionStats,
    enabled: !!user,
    refetchInterval: 60_000,
  });
  const actionsQuery = useQuery({
    queryKey: queryKeys.actions({ assignee: 'me' }),
    queryFn: () => actionsApi.listActions({ assignee: 'me' }),
    enabled: !!user,
    refetchInterval: 60_000,
  });

  const criticalCount = statsQuery.data?.critical_open ?? 0;
  const pendingCount = actionsQuery.data?.items.filter((a) => a.status !== 'done').length ?? 0;

  const operations: NavItemDef[] = [
    { to: '/exceptions', label: 'Exception queue', icon: icons.queue, badge: 'critical' },
    { to: '/actions', label: 'My actions', icon: icons.actions, badge: 'pending' },
    { to: '/executive', label: 'Executive view', icon: icons.exec },
  ];
  const network: NavItemDef[] = [{ to: '/partners', label: 'Partner network', icon: icons.partners }];
  const settingsNav: NavItemDef[] = [
    { to: '/rules', label: 'Alert rules', icon: icons.rules },
    { to: '/teams', label: 'Teams', icon: icons.teams },
  ];
  const admin: NavItemDef[] = [
    { to: '/integrations', label: 'Integrations', icon: icons.integrations },
    { to: '/audit-log', label: 'Audit log', icon: icons.audit },
    { to: '/users', label: 'Users & permissions', icon: icons.users },
    { to: '/settings', label: 'Workspace settings', icon: icons.settings },
  ];

  function renderItem(item: NavItemDef) {
    const count = item.badge === 'critical' ? criticalCount : item.badge === 'pending' ? pendingCount : 0;
    return (
      <NavLink
        key={item.to}
        to={item.to}
        className={({ isActive }) => [styles.navItem, isActive ? styles.navItemActive : ''].filter(Boolean).join(' ')}
      >
        {item.icon}
        <span className={styles.navLabel}>{item.label}</span>
        {item.badge && count > 0 && (
          <span className={item.badge === 'critical' ? styles.navBadgeCritical : styles.navBadgePending}>{count}</span>
        )}
      </NavLink>
    );
  }

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoTitle}>NEXUS</div>
        <div className={styles.logoSub}>by Bluecrux</div>
      </div>
      <div className={styles.nav}>
        <div className={styles.sectionLabel}>Operations</div>
        {operations.map(renderItem)}
        <div className={styles.sectionLabel}>Network</div>
        {network.map(renderItem)}
        <a href="/partner/queue" className={styles.navItem} title="Partner-facing portal">
          {icons.integrations}
          <span className={styles.navLabel}>Partner portal</span>
          <span className={styles.externalTag}>External</span>
        </a>
        <div className={styles.sectionLabel}>Settings</div>
        {settingsNav.map(renderItem)}
        {isAdmin && (
          <>
            <div className={styles.sectionLabel}>Administration</div>
            {admin.map(renderItem)}
          </>
        )}
      </div>
      <div className={styles.userMenu}>
        {menuOpen && (
          <div className={styles.roleMenu}>
            <div className={styles.roleMenuHeader}>Switch user (demo)</div>
            {DEMO_USERS.filter((u) => u.email !== user?.email).map((u) => (
              <div
                key={u.email}
                className={styles.roleMenuItem}
                onClick={async () => {
                  setMenuOpen(false);
                  queryClient.clear();
                  const loggedIn = await loginAs(u.email);
                  navigate(loggedIn.role === 'partner' ? '/partner/queue' : '/exceptions');
                }}
              >
                <div style={{ fontSize: 12, color: 'var(--black)', fontWeight: 500 }}>{u.name}</div>
                <div style={{ fontSize: 11, color: 'var(--timestamp-gray)' }}>{ROLE_LABELS[u.role]} · {u.title}</div>
              </div>
            ))}
            <div className={styles.roleMenuItem} onClick={logout} style={{ color: 'var(--critical)', fontSize: 12, fontWeight: 500 }}>
              Sign out
            </div>
          </div>
        )}
        <div className={styles.userBlock} onClick={() => setMenuOpen((v) => !v)} style={{ cursor: 'pointer' }}>
          <Avatar name={user?.name || '?'} size={32} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className={styles.userName}>{user?.name}</div>
            <div className={styles.userRole}>{user?.title || ROLE_LABELS[user?.role || '']}</div>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15"></polyline>
          </svg>
        </div>
      </div>
    </div>
  );
}

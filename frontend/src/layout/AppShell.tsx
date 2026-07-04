import { Navigate, Outlet } from 'react-router-dom';
import styles from './AppShell.module.css';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { useAuth } from '../hooks/useAuth';

export function AppShell() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'partner') return <Navigate to="/partner/queue" replace />;

  return (
    <div className={styles.shell}>
      <Sidebar />
      <div className={styles.main}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
      </div>
    </div>
  );
}

// Wraps admin-only routes (Integrations, Users, Settings, Audit log per the task
// spec) — non-admins are redirected back to the queue.
export function RequireAdmin() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/exceptions" replace />;
  return <Outlet />;
}

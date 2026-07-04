import { Navigate, Outlet } from 'react-router-dom';
import styles from './PartnerShell.module.css';
import { PartnerTopbar } from './PartnerTopbar';
import { useAuth } from '../hooks/useAuth';

export function PartnerShell() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'partner') return <Navigate to="/exceptions" replace />;

  return (
    <div className={styles.shell}>
      <PartnerTopbar />
      <div className={styles.scopeBanner}>
        You see only requests addressed to your organisation. Responses are logged to the client's audit timeline and cannot be edited after submission.
      </div>
      <div className={styles.content}>
        <Outlet />
      </div>
    </div>
  );
}

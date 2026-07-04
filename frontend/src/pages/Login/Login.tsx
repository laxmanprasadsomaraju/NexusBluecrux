import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styles from './Login.module.css';
import { Avatar } from '../../components/Avatar/Avatar';
import { Spinner } from '../../components/Spinner/Spinner';
import { useAuth } from '../../hooks/useAuth';
import { DEMO_USERS, ROLE_LABELS, type DemoUser } from '../../lib/demoUsers';
import { ApiError } from '../../api/client';

const ROLE_ORDER: DemoUser['role'][] = ['director', 'manager', 'planner', 'admin', 'partner'];

export function Login() {
  const { loginAs } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pick(u: DemoUser) {
    setPending(u.email);
    setError(null);
    try {
      const user = await loginAs(u.email);
      const from = (location.state as { from?: string } | null)?.from;
      if (user.role === 'partner') navigate('/partner/queue', { replace: true });
      else navigate(from || '/exceptions', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setPending(null);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>
          <div className={styles.logoTitle}>NEXUS</div>
          <div className={styles.logoSub}>by Bluecrux</div>
        </div>
        <div className={styles.tagline}>Supply Chain Exception &amp; Escalation Hub — sign in with your company account</div>
        {error && <div className={styles.errorBanner}>{error}</div>}
        {ROLE_ORDER.map((role) => {
          const users = DEMO_USERS.filter((u) => u.role === role);
          if (!users.length) return null;
          return (
            <div key={role}>
              <div className={styles.sectionLabel}>
                {ROLE_LABELS[role]}
                {role === 'partner' ? ' — partner portal' : ''}
              </div>
              <div className={styles.grid}>
                {users.map((u) => (
                  <button key={u.email} className={styles.personaCard} onClick={() => pick(u)} disabled={!!pending}>
                    <Avatar name={u.name} size={32} />
                    <div style={{ minWidth: 0 }}>
                      <div className={styles.personaName}>{u.name}</div>
                      <div className={styles.personaTitle}>{u.title}</div>
                    </div>
                    {pending === u.email && <Spinner size={14} color="var(--cyan-primary)" />}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

import { useToast } from '../../hooks/useToast';
import styles from './Toast.module.css';

export function ToastContainer() {
  const { toasts } = useToast();
  return (
    <div className={styles.container}>
      {toasts.map((t) => (
        <div key={t.id} className={styles.toast}>
          <span className={styles.icon}>
            {t.variant === 'success' ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2DC653" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            )}
          </span>
          <span>{t.text}</span>
        </div>
      ))}
    </div>
  );
}

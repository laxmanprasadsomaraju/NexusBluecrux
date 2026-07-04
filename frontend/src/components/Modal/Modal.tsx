import type { MouseEvent, ReactNode } from 'react';
import styles from './Modal.module.css';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}

// Overlay + modal — the only surfaces (besides toasts) allowed a box-shadow.
export function Modal({ title, onClose, children, footer, wide }: ModalProps) {
  const stopProp = (e: MouseEvent) => e.stopPropagation();
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={[styles.modal, wide ? styles.wide : ''].filter(Boolean).join(' ')} onClick={stopProp}>
        <div className={styles.header}>
          <div className={styles.title}>{title}</div>
          <button className={styles.close} onClick={onClose} aria-label="Close">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <div className={styles.body}>{children}</div>
        {footer && <div className={styles.footer}>{footer}</div>}
      </div>
    </div>
  );
}

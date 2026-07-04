import type { MouseEvent, ReactNode } from 'react';
import styles from './Drawer.module.css';

interface DrawerProps {
  width?: number;
  onClose: () => void;
  children: ReactNode;
  header?: ReactNode;
}

export function Drawer({ width = 380, onClose, children, header }: DrawerProps) {
  const stopProp = (e: MouseEvent) => e.stopPropagation();
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.drawer} style={{ width }} onClick={stopProp}>
        {header && <div className={styles.header}>{header}</div>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>
  );
}

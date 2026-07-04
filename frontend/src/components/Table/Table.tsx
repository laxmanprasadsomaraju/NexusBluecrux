import type { ReactNode } from 'react';
import styles from './Table.module.css';

export function Table({ children }: { children: ReactNode }) {
  return <table className={styles.table}>{children}</table>;
}

export function Th({ children }: { children: ReactNode }) {
  return <th className={styles.th}>{children}</th>;
}

export function Td({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <td className={styles.td} style={style}>
      {children}
    </td>
  );
}

export function Tr({
  children,
  index,
  onClick,
}: {
  children: ReactNode;
  index: number;
  onClick?: () => void;
}) {
  const classes = [index % 2 === 0 ? styles.rowOdd : styles.rowEven, onClick ? styles.rowClickable : '']
    .filter(Boolean)
    .join(' ');
  return (
    <tr className={classes} onClick={onClick}>
      {children}
    </tr>
  );
}

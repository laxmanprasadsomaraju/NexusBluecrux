import type { ReactNode } from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: ReactNode;
  valueColor?: string;
  delta?: ReactNode;
  deltaColor?: string;
  onClick?: () => void;
  active?: boolean;
}

export function StatCard({ label, value, valueColor, delta, deltaColor, onClick, active }: StatCardProps) {
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      className={[styles.card, onClick ? styles.clickable : ''].filter(Boolean).join(' ')}
      onClick={onClick}
      style={active ? { outline: '2px solid var(--cyan-primary)', outlineOffset: -2 } : undefined}
    >
      <div className={styles.label}>{label}</div>
      <div className={styles.value} style={{ color: valueColor || 'var(--black)' }}>
        {value}
      </div>
      {delta !== undefined && (
        <div className={styles.delta} style={{ color: deltaColor || 'var(--timestamp-gray)' }}>
          {delta}
        </div>
      )}
    </Wrapper>
  );
}

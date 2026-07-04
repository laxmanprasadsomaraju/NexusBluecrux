import type { ButtonHTMLAttributes } from 'react';
import styles from './Pill.module.css';

interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
}

export function Pill({ active, className, ...rest }: PillProps) {
  return <button className={[styles.pill, active ? styles.active : '', className].filter(Boolean).join(' ')} {...rest} />;
}

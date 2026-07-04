import type { ButtonHTMLAttributes, ReactNode } from 'react';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'danger' | 'success';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'default' | 'small';
  children: ReactNode;
}

// Sentence-case only, active:scale(0.98) on click — never render label.toUpperCase().
export function Button({ variant = 'outline', size = 'default', className, children, ...rest }: ButtonProps) {
  const classes = [styles.btn, styles[variant], size === 'small' ? styles.small : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
  padding?: number | string;
  bg?: string;
}

// Flat surface — never a drop shadow (COLOUR_SPEC key rule).
export function Card({ children, style, className, padding = 14, bg = 'var(--white)' }: CardProps) {
  return (
    <div
      className={className}
      style={{
        background: bg,
        borderRadius: 'var(--radius-card)',
        border: '0.5px solid var(--mid-gray)',
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

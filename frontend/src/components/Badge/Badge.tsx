import type { CSSProperties, ReactNode } from 'react';

interface BadgeProps {
  bg: string;
  text: string;
  children: ReactNode;
  style?: CSSProperties;
}

// Generic badge — text colour always matches the background colour family (never
// black on a coloured badge). Severity/status shorthands live in severity.ts /
// statusBadges.ts and should be passed through this component.
export function Badge({ bg, text, children, style }: BadgeProps) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 500,
        color: text,
        background: bg,
        borderRadius: 'var(--radius-badge)',
        padding: '3px 8px',
        whiteSpace: 'nowrap',
        display: 'inline-block',
        lineHeight: 1.4,
        ...style,
      }}
    >
      {children}
    </span>
  );
}

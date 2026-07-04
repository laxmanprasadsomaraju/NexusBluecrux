import type { CSSProperties } from 'react';

export function Spinner({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  const style: CSSProperties = {
    width: size,
    height: size,
    border: `2px solid ${color}33`,
    borderTopColor: color,
    borderRadius: '50%',
    display: 'inline-block',
    animation: 'nexus-spin 0.8s linear infinite',
  };
  return <span style={style} />;
}

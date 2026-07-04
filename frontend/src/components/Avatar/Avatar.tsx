import { initials } from '../../lib/formatters';

interface AvatarProps {
  name: string;
  size?: number;
}

export function Avatar({ name, size = 18 }: AvatarProps) {
  return (
    <div
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: 'var(--cyan-primary)',
        color: 'var(--navy-dark)',
        fontSize: Math.max(9, Math.round(size * 0.5)),
        fontWeight: 500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {initials(name)}
    </div>
  );
}

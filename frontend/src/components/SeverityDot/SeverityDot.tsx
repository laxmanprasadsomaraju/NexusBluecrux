import { getSeverityStyle } from '../../lib/severity';

export function SeverityDot({ severity, size = 8 }: { severity: string; size?: number }) {
  const s = getSeverityStyle(severity);
  return (
    <span
      style={{
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: s.dot,
        display: 'inline-block',
        marginTop: 5,
      }}
      title={s.label}
    />
  );
}

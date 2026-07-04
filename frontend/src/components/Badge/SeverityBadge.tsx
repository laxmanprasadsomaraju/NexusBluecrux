import { Badge } from './Badge';
import { getSeverityStyle } from '../../lib/severity';

export function SeverityBadge({ severity }: { severity: string }) {
  const s = getSeverityStyle(severity);
  return (
    <Badge bg={s.badgeBg} text={s.badgeText}>
      {s.label}
    </Badge>
  );
}

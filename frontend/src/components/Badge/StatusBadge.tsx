import { Badge } from './Badge';
import { getExceptionStatusBadge } from '../../lib/statusBadges';

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const s = getExceptionStatusBadge(status, label);
  return (
    <Badge bg={s.bg} text={s.text}>
      {s.label}
    </Badge>
  );
}

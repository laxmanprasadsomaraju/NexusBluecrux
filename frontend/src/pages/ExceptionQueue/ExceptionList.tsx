import { ExceptionCard } from './ExceptionCard';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { useUi } from '../../hooks/useUi';
import type { ExceptionListItem } from '../../types';

interface ExceptionListProps {
  items: ExceptionListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ExceptionList({ items, selectedId, onSelect }: ExceptionListProps) {
  const { justCreatedIds } = useUi();

  if (items.length === 0) {
    return <EmptyState title="No exceptions match this filter." />;
  }

  return (
    <div>
      {items.map((exc) => (
        <ExceptionCard
          key={exc.id}
          exception={exc}
          selected={exc.id === selectedId}
          isNew={justCreatedIds.has(exc.id)}
          onClick={() => onSelect(exc.id)}
        />
      ))}
    </div>
  );
}

import type { ActionItem } from '../types';

const BUCKET_ORDER: Record<string, number> = {
  Overdue: 0,
  'Due today': 1,
  Tomorrow: 2,
  'This week': 3,
  Completed: 4,
};

// The backend already returns actions pre-sorted by bucket + due date; this is used
// when the frontend needs to re-sort after a local/optimistic mutation.
export function sortActions(items: ActionItem[]): ActionItem[] {
  return [...items].sort((a, b) => {
    const bucketDiff = (BUCKET_ORDER[a.bucket] ?? 5) - (BUCKET_ORDER[b.bucket] ?? 5);
    if (bucketDiff !== 0) return bucketDiff;
    return a.due_at.localeCompare(b.due_at);
  });
}

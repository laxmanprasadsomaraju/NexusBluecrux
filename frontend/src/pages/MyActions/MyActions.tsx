import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import styles from './MyActions.module.css';
import { queryKeys } from '../../api/queryKeys';
import * as actionsApi from '../../api/actions';
import { ActionRow } from './ActionRow';
import { EmptyState } from '../../components/EmptyState/EmptyState';
import { Spinner } from '../../components/Spinner/Spinner';
import { Drawer } from '../../components/Drawer/Drawer';
import { DetailPanel } from '../ExceptionQueue/DetailPanel';

export function MyActions() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.actions({ assignee: 'me' }),
    queryFn: () => actionsApi.listActions({ assignee: 'me' }),
  });
  const [reviewId, setReviewId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Spinner size={20} color="var(--cyan-primary)" />
      </div>
    );
  }

  const items = data?.items ?? [];
  const open = items.filter((a) => a.status !== 'done');
  const completed = items.filter((a) => a.status === 'done');

  if (!items.length) {
    return <EmptyState title="Nothing on your plate right now." subtitle="Actions assigned to you will show up here." />;
  }

  return (
    <div className={styles.page}>
      <div className={styles.list}>
        {open.length === 0 && <EmptyState title="All caught up." subtitle="No open actions assigned to you." />}
        {open.map((action) => (
          <ActionRow key={action.id} action={action} onReview={setReviewId} onStart={setReviewId} />
        ))}

        {completed.length > 0 && (
          <>
            <div className={styles.sectionLabel}>Completed today</div>
            {completed.map((action) => (
              <div key={action.id} className={styles.completedCard}>
                <div style={{ fontSize: 11, fontWeight: 500, color: 'var(--resolved)', background: 'var(--resolved-bg)', borderRadius: 4, padding: '3px 8px' }}>
                  Done
                </div>
                <div className={styles.titleStrike} style={{ flex: 1 }}>
                  {action.title}
                </div>
                <span style={{ fontSize: 12, color: 'var(--resolved)', fontWeight: 500 }}>✓ Completed</span>
              </div>
            ))}
          </>
        )}
      </div>

      {reviewId && (
        <Drawer
          width={480}
          onClose={() => setReviewId(null)}
          header={<div style={{ fontSize: 13, fontWeight: 500, color: 'var(--black)', flex: 1 }}>Exception detail</div>}
        >
          <DetailPanel key={reviewId} exceptionId={reviewId} />
        </Drawer>
      )}
    </div>
  );
}

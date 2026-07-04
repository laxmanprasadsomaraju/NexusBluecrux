import { useMutation, useQueryClient } from '@tanstack/react-query';
import styles from './MyActions.module.css';
import { Badge } from '../../components/Badge/Badge';
import { Button } from '../../components/Button/Button';
import { Spinner } from '../../components/Spinner/Spinner';
import { getActionStatusBadge } from '../../lib/statusBadges';
import { useApproveFlow } from '../../hooks/useApproveFlow';
import * as actionsApi from '../../api/actions';
import { queryKeys } from '../../api/queryKeys';
import type { ActionItem } from '../../types';

interface ActionRowProps {
  action: ActionItem;
  onReview: (exceptionId: string) => void;
  onStart: (exceptionId: string) => void;
}

export function ActionRow({ action, onReview, onStart }: ActionRowProps) {
  const badge = getActionStatusBadge(action.bucket);
  const approveFlow = useApproveFlow(action.exception_id);
  const queryClient = useQueryClient();
  const isUrgent = action.bucket === 'Overdue' || action.bucket === 'Due today';

  const startMutation = useMutation({
    mutationFn: () => actionsApi.patchAction(action.id, 'in_progress'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.actions() });
      onStart(action.exception_id);
    },
  });

  return (
    <div className={styles.card}>
      <Badge bg={badge.bg} text={badge.text}>
        {badge.label}
      </Badge>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className={styles.title}>{action.title}</div>
        <div className={styles.context}>{action.context}</div>
      </div>

      {action.kind === 'approve' && approveFlow.status === 'idle' && (
        <Button variant={isUrgent ? 'primary' : 'outline'} size="small" onClick={approveFlow.beginConfirm}>
          Approve
        </Button>
      )}
      {action.kind === 'approve' && approveFlow.status === 'confirming' && (
        <>
          <span className={styles.confirmText}>Confirm?</span>
          <Button variant="primary" size="small" onClick={approveFlow.confirmApprove}>
            Yes
          </Button>
          <Button variant="outline" size="small" onClick={approveFlow.cancelConfirm}>
            Cancel
          </Button>
        </>
      )}
      {action.kind === 'approve' && approveFlow.status === 'approving' && (
        <Button variant="primary" size="small" disabled>
          <Spinner size={11} color="var(--navy-dark)" />
        </Button>
      )}
      {action.kind === 'approve' && approveFlow.status === 'approved' && (
        <Button variant="success" size="small" disabled>
          Approved ✓
        </Button>
      )}
      {action.kind === 'review' && (
        <Button variant={isUrgent ? 'primary' : 'outline'} size="small" onClick={() => onReview(action.exception_id)}>
          Review
        </Button>
      )}
      {action.kind === 'start' && (
        <Button variant={isUrgent ? 'primary' : 'outline'} size="small" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
          {startMutation.isPending ? <Spinner size={11} /> : 'Start'}
        </Button>
      )}
    </div>
  );
}

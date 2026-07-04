import { useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { v4 as uuidv4 } from 'uuid';
import * as exceptionsApi from '../api/exceptions';
import { queryKeys } from '../api/queryKeys';
import { useToast } from './useToast';
import { ApiError } from '../api/client';

export type ApproveFlowStatus = 'idle' | 'confirming' | 'approving' | 'approved';

// Two-step approve, shared by the exception detail panel and My Actions cards.
// Click "Approve" -> inline "Confirm? Yes/Cancel" (no network call yet).
// Click "Yes" -> POST approve/init then POST approve back-to-back with a stable
// Idempotency-Key generated once per confirm attempt.
export function useApproveFlow(exceptionId: string) {
  const [status, setStatus] = useState<ApproveFlowStatus>('idle');
  const [idempotencyKey, setIdempotencyKey] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const beginConfirm = useCallback(() => {
    setIdempotencyKey(uuidv4());
    setStatus('confirming');
  }, []);

  const cancelConfirm = useCallback(() => {
    setStatus('idle');
    setIdempotencyKey(null);
  }, []);

  const confirmApprove = useCallback(async () => {
    if (!idempotencyKey) return;
    setStatus('approving');
    try {
      const initRes = await exceptionsApi.approveInit(exceptionId);
      await exceptionsApi.approve(exceptionId, initRes.confirm_token, idempotencyKey);
      setStatus('approved');
      showToast('Action approved — source system updated', 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.exception(exceptionId) });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.exceptionStats() });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    } catch (err) {
      const message = err instanceof ApiError ? err.message : 'Approval failed — please try again';
      showToast(message, 'error');
      setStatus('confirming');
    }
  }, [exceptionId, idempotencyKey, queryClient, showToast]);

  return { status, beginConfirm, cancelConfirm, confirmApprove };
}

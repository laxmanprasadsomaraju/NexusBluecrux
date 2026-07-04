import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as exceptionsApi from '../api/exceptions';
import { queryKeys } from '../api/queryKeys';
import { useToast } from './useToast';

export function useEscalate(exceptionId: string) {
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (payload: { target_user_id: string; targetName: string; deadline?: string; note?: string }) =>
      exceptionsApi.escalate(exceptionId, {
        target_user_id: payload.target_user_id,
        deadline: payload.deadline,
        note: payload.note,
      }),
    onSuccess: (_, variables) => {
      const deadlineText = variables.deadline ? ` with deadline ${new Date(variables.deadline).toLocaleString()}` : '';
      showToast(`Escalated to ${variables.targetName}${deadlineText}`, 'success');
      queryClient.invalidateQueries({ queryKey: queryKeys.exception(exceptionId) });
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.exceptionStats() });
    },
  });
}

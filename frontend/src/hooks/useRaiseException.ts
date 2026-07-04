import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as exceptionsApi from '../api/exceptions';
import { queryKeys } from '../api/queryKeys';
import { useToast } from './useToast';
import { useUi } from './useUi';

export function useRaiseException() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { markJustCreated } = useUi();

  return useMutation({
    mutationFn: (payload: exceptionsApi.RaiseExceptionPayload) => exceptionsApi.raiseException(payload),
    onSuccess: (created) => {
      showToast('Exception submitted and owner notified', 'success');
      markJustCreated(created.id);
      queryClient.invalidateQueries({ queryKey: ['exceptions'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.exceptionStats() });
      queryClient.invalidateQueries({ queryKey: ['actions'] });
    },
  });
}

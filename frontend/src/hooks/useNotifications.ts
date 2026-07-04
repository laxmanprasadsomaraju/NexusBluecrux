import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as notificationsApi from '../api/notifications';
import { queryKeys } from '../api/queryKeys';
import { useAuth } from './useAuth';

export function useNotifications() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.notifications(),
    queryFn: notificationsApi.listNotifications,
    enabled: !!token,
    refetchInterval: 30_000,
  });

  const markAllRead = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.notifications() }),
  });

  return { ...query, markAllRead };
}

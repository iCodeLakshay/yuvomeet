import { useMutation, useQuery } from '@tanstack/react-query';
import { unwrap } from '../../lib/errors';
import { qk, queryClient } from '../../lib/query';
import { supabase, type Tables } from '../../lib/supabase';

export type Notification = Tables<'notifications'>;

/** In-app activity list; new rows arrive through the Realtime listener in SessionProvider. */
export function useNotifications() {
  return useQuery({
    queryKey: qk.notifications,
    queryFn: async () => unwrap(await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100)),
  });
}

export function useUnreadCount() {
  const { data } = useNotifications();
  return data?.filter((n) => !n.read_at).length ?? 0;
}

export function useMarkRead() {
  return useMutation({
    mutationFn: async (ids?: string[]) => unwrap(await supabase.rpc('mark_notifications_read', { p_ids: ids })),
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.notifications }),
  });
}

import { useMutation, useQuery } from '@tanstack/react-query';
import { unwrap, unwrapMaybe } from '../../lib/errors';
import { qk, queryClient } from '../../lib/query';
import { supabase } from '../../lib/supabase';

function refreshFriend(userId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['friendship', userId] }),
    queryClient.invalidateQueries({ queryKey: ['profile-like', userId] }),
    queryClient.invalidateQueries({ queryKey: ['chats'] }),
    queryClient.invalidateQueries({ queryKey: qk.notifications }),
  ]);
}

/** The single friendship row between the signed-in member and this profile, if one exists. */
export function useFriendship(userId: string, meId: string) {
  return useQuery({
    queryKey: ['friendship', userId],
    enabled: Boolean(userId) && userId !== meId,
    queryFn: async () =>
      unwrapMaybe(
        await supabase
          .from('friendships')
          .select('id, requester_id, addressee_id, status, conversation_id')
          .or(`and(requester_id.eq.${meId},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${meId})`)
          .maybeSingle(),
      ),
  });
}

export function useProfileLike(userId: string, meId: string) {
  return useQuery({
    queryKey: ['profile-like', userId],
    enabled: Boolean(userId) && userId !== meId,
    queryFn: async () => Boolean(unwrapMaybe(await supabase.from('profile_likes').select('liked_id').eq('liked_id', userId).maybeSingle())),
  });
}

export function useSendFriendRequest(userId: string) {
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('send_friend_request', { p_user_id: userId })),
    onSettled: () => refreshFriend(userId),
  });
}

export function useRespondFriendRequest(userId: string) {
  return useMutation({
    mutationFn: async (accept: boolean) =>
      unwrap(await supabase.rpc('respond_friend_request', { p_user_id: userId, p_accept: accept })),
    onSettled: () => refreshFriend(userId),
  });
}

export function useLikeProfile(userId: string) {
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('like_profile', { p_user_id: userId })),
    onSettled: () => refreshFriend(userId),
  });
}

export function useUnlikeProfile(userId: string) {
  return useMutation({
    mutationFn: async () => unwrap(await supabase.rpc('unlike_profile', { p_user_id: userId })),
    onSettled: () => refreshFriend(userId),
  });
}

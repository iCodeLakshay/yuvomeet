import { useMutation, useQuery } from '@tanstack/react-query';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { unwrap } from '../../lib/errors';
import { callFunction } from '../../lib/functions';
import { qk, queryClient } from '../../lib/query';
import { supabase, type Enums } from '../../lib/supabase';
import { track } from '../../lib/telemetry';

export function useAppeals() {
  return useQuery({
    queryKey: qk.appeals,
    queryFn: async () => unwrap(await supabase.from('appeals').select('*').order('created_at', { ascending: false })),
  });
}

/** VR-6: one open appeal per subject; a person answers within 48 hours. */
export function useSubmitAppeal() {
  return useMutation({
    mutationFn: async ({ subject, subjectId, message }: { subject: Enums<'appeal_subject'>; subjectId: string; message: string }) => {
      const id = unwrap(await supabase.rpc('submit_appeal', { p_subject: subject, p_subject_id: subjectId, p_message: message }));
      track('appeal_submitted', { subject });
      return id;
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: qk.appeals }),
  });
}

/** ON-6: the export arrives as a JSON file handed to the Android share sheet. */
export function useExportData() {
  return useMutation({
    mutationFn: async () => {
      const { url, file_name } = await callFunction<{ url: string; file_name: string }>('export-data', {});
      const dir = new Directory(Paths.cache, 'exports');
      if (!dir.exists) dir.create();
      const target = new File(dir, file_name);
      if (target.exists) target.delete();
      const file = await File.downloadFileAsync(url, target);
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json', dialogTitle: 'Your Yuvomeet data' });
    },
  });
}

/** Email on the auth account, when confirmed; the deletion code goes there. */
export function useAccountEmail() {
  return useQuery({
    queryKey: ['me', 'email'],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user?.email_confirmed_at ? (data.user.email ?? null) : null;
    },
  });
}

/** Step 1 of deletion: emails a 6-digit code (10 minutes). `email` is used only if the account has none. */
export function useSendDeletionCode() {
  return useMutation({
    mutationFn: (email?: string) => callFunction<{ sent_to: string; dev_code?: string }>('delete-account', { action: 'send', email }),
  });
}

/** ON-6, step 2: the code is checked server-side, then deletion takes effect and the session ends. */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async (code: string) => {
      await callFunction('delete-account', { action: 'confirm', code });
      await supabase.auth.signOut();
      queryClient.clear();
    },
  });
}

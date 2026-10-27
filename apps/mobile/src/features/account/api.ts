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

/** ON-6: immediate effect server-side; the local session ends here too. */
export function useDeleteAccount() {
  return useMutation({
    mutationFn: async () => {
      await callFunction('delete-account', {});
      await supabase.auth.signOut();
      queryClient.clear();
    },
  });
}

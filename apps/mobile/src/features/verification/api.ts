import { useMutation, useQuery } from '@tanstack/react-query';
import * as WebBrowser from 'expo-web-browser';
import { unwrap } from '../../lib/errors';
import { callFunction } from '../../lib/functions';
import { qk, queryClient } from '../../lib/query';
import { supabase } from '../../lib/supabase';
import { track } from '../../lib/telemetry';

type StartResult = { status: string; url?: string; attempt?: number };

/**
 * VR-1 to VR-3: kyc-start mints a HyperVerge session; the provider flow (DigiLocker or offline
 * eKYC, then selfie) runs in an in-app browser. The verdict is written by kyc-webhook only
 * (S-38); the app just refreshes the profile when the browser returns.
 */
export function useStartVerification() {
  return useMutation({
    mutationFn: async () => {
      const res = await callFunction<StartResult>('kyc-start', {});
      if (res.attempt) track('verification_started', { attempt: res.attempt });
      if (res.url) await WebBrowser.openAuthSessionAsync(res.url, 'yuvomeet://verify/result');
      await queryClient.invalidateQueries({ queryKey: qk.me });
      await queryClient.invalidateQueries({ queryKey: qk.verification });
      return res;
    },
  });
}

export function useMyVerification() {
  return useQuery({
    queryKey: qk.verification,
    queryFn: async () => unwrap(await supabase.from('my_verification').select('*').order('created_at', { ascending: false }).limit(9)),
  });
}

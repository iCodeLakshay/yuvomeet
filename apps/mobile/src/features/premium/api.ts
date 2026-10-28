import { useMutation, useQuery } from '@tanstack/react-query';
import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { unwrap, unwrapMaybe } from '../../lib/errors';
import { callFunction } from '../../lib/functions';
import { qk, queryClient } from '../../lib/query';
import { supabase } from '../../lib/supabase';

type PaymentStatus = 'paid' | 'created' | 'expired' | 'failed';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Razorpay checkout: the server prices the item and returns a hosted Payment Link, which opens
 * in the system browser (UPI apps, cards, netbanking all work there). When the page closes the
 * server asks Razorpay whether it was paid; the webhook covers the app being killed meanwhile.
 */
async function checkout(body: { productId: string } | { planId: string }): Promise<PaymentStatus> {
  const { payment_id, url, paid } = await callFunction<{ payment_id: string; url: string | null; paid: boolean }>('payments-checkout', body);
  let status: PaymentStatus = paid ? 'paid' : 'created';
  if (!paid && url) {
    await WebBrowser.openAuthSessionAsync(url, Linking.createURL('payments'));
    // UPI confirmations can land a few seconds after the page closes.
    for (let i = 0; i < 4 && status === 'created'; i++) {
      ({ status } = await callFunction<{ status: PaymentStatus }>('payments-verify', { paymentId: payment_id }));
      if (status === 'created') await wait(1_500);
    }
  }
  return status;
}

/** Premium / Plus pass. */
export function useCheckout() {
  return useMutation({
    mutationFn: async (productId: string) => {
      const status = await checkout({ productId });
      if (status === 'paid') await Promise.all([queryClient.invalidateQueries({ queryKey: qk.me }), queryClient.invalidateQueries({ queryKey: qk.caps })]);
      return status;
    },
  });
}

/** Seat on a paid plan, after the host approved the member. */
export function usePaySeat(planId: string) {
  return useMutation({
    mutationFn: () => checkout({ planId }),
    onSettled: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.plan(planId) }),
        queryClient.invalidateQueries({ queryKey: qk.myPlans }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]),
  });
}

export interface Earnings {
  earned_paise: number;
  upcoming_paise: number;
  fees_paise: number;
  paid_out_paise: number;
  fee_bps: number;
  plans: { plan_id: string; title: string; starts_at: string; plan_status: string; seats: number; gross_paise: number; payout_paise: number }[];
}

export function useEarnings() {
  return useQuery({
    queryKey: qk.earnings,
    queryFn: async () => unwrap(await supabase.rpc('my_earnings')) as unknown as Earnings,
  });
}

export function usePayoutAccount() {
  return useQuery({
    queryKey: qk.payoutAccount,
    queryFn: async () => unwrapMaybe(await supabase.from('payout_accounts').select('upi_id, holder_name').maybeSingle()),
  });
}

export function useSavePayoutAccount() {
  return useMutation({
    mutationFn: async (input: { upiId: string; holderName: string }) =>
      unwrap(await supabase.rpc('set_payout_account', { p_upi_id: input.upiId, p_holder_name: input.holderName })),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: qk.payoutAccount }),
  });
}

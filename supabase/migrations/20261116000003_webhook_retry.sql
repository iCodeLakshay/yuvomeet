-- Audit FN-5: razorpay-webhook marked an event "seen" before processing it and treated every RPC error
-- as a duplicate, so one failed delivery could drop the payment for good (Razorpay's retry carries the
-- same event id). The function now treats only a unique violation as a duplicate, and calls this to
-- release the event id when processing fails, so the retry is processed.

create function public.svc_webhook_forget(p_provider text, p_event_id text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from private.webhook_events where provider = p_provider and event_id = p_event_id;
$$;

revoke execute on function public.svc_webhook_forget(text, text) from public, anon, authenticated;
grant execute on function public.svc_webhook_forget(text, text) to service_role;

-- Temporarily skip the paywall: lift the free-tier weekly caps on joining and hosting.
--
-- Data only, no schema change. request_join / create_plan keep their entitlement logic and
-- read the limits from private.settings, so the subscription code stays intact. The daily
-- anti-abuse limits (5 join requests a day in the first week, report limit) are untouched.
--
-- To bring the paywall back, run the revert below (and build the app with EXPO_PUBLIC_PAYWALL=on):
--   update private.settings set val = '2', updated_at = now() where key = 'free_joins_per_week';
--   update private.settings set val = '1', updated_at = now() where key = 'free_hosts_per_week';
update private.settings
set val = '1000', updated_at = now()
where key in ('free_joins_per_week', 'free_hosts_per_week');

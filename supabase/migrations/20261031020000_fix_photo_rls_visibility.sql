-- Fix: the plan_cards and public_profiles views subquery plan_covers and
-- profile_photos, but the original RLS on those tables allowed only owners
-- (user_id = auth.uid()) to read their own rows.  This silently nulled out
-- host_photo_path and cover_path for every viewer who isn't the host.
--
-- New policies:
--   • plan_covers — also readable when approved and linked to a plan the
--     caller can already see (can_see_plan enforces audience / block logic).
--   • profile_photos — also readable when approved and owned by a profile
--     the caller can already view (can_view_profile enforces block logic).

drop policy if exists plan_covers_read_own on public.plan_covers;
create policy plan_covers_read on public.plan_covers for select to authenticated
  using (
    user_id = auth.uid()
    or app.is_admin()
    or (
      status = 'approved'
      and exists (
        select 1 from public.plans pl
        where pl.cover_id = plan_covers.id
          and app.can_see_plan(auth.uid(), pl.id)
      )
    )
  );

drop policy if exists profile_photos_read on public.profile_photos;
create policy profile_photos_read on public.profile_photos for select to authenticated
  using (
    user_id = auth.uid()
    or app.is_admin()
    or (
      status = 'approved'
      and path is not null
      and app.can_view_profile(auth.uid(), user_id)
    )
  );

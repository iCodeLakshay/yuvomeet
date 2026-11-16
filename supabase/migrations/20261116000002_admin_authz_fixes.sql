-- Admin authorization fixes from the 2026-11-16 audit (DB-1 to DB-6, APP-4, APP-5, APP-7).
-- Everything here is `create or replace`, so existing grants and callers are untouched, and nothing
-- changes what a legitimate admin or reviewer can do today except where noted.
--
-- 1. require_admin was NULL-unsafe: admin_set_user_status passed `p_status <> 'suspended'`, which is
--    NULL for a NULL status, and `NULL and ...` / `not NULL and ...` made the whole IF condition NULL,
--    so the check was skipped for any signed-in user; the later NOT NULL violation then echoed the
--    target's profile row back in the error detail (DB-1, high).
-- 2. app.is_admin / app.is_full_admin trusted the JWT claim alone, so a removed or demoted admin kept
--    full power until the access token expired (up to 1 h, DB-2, APP-4). They now also require the live
--    private.admin_roles row. The aal2 (TOTP) requirement still comes from the JWT.
-- 3. Appeals: a reviewer could lift a ban or an under-18 block by upholding an appeal whose subject the
--    appellant chose as "suspension" (DB-4, APP-5). The gate now looks at the account's real state.
-- 4. Staff accounts: reviewers could suspend admins, and anyone could act on themselves (DB-6, APP-7).
-- 5. Roles: no self-change, no unknown users, previous role in the audit row, sessions revoked on
--    demotion or removal, concurrent changes serialised (DB-3, APP-4).

-- ---------------------------------------------------------------------------------------------
-- 1. NULL-safe gate
-- ---------------------------------------------------------------------------------------------
create or replace function private.require_admin(p_full boolean default false)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  -- A NULL p_full means "unknown", so it asks for the stricter check; the CASE can only yield TRUE
  -- or FALSE, and anything that is not TRUE is refused.
  if auth.uid() is null
     or (case when coalesce(p_full, true) then app.is_full_admin() else app.is_admin() end) is not true then
    raise exception using errcode = '42501', message = 'Admin access required.', hint = 'FORBIDDEN';
  end if;
  return auth.uid();
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Live role check (the JWT still has to be aal2)
-- ---------------------------------------------------------------------------------------------
create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'aal') = 'aal2'
    and exists (select 1 from private.admin_roles ar where ar.user_id = auth.uid()),
    false
  );
$$;

create or replace function app.is_full_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (auth.jwt() ->> 'aal') = 'aal2'
    and exists (select 1 from private.admin_roles ar where ar.user_id = auth.uid() and ar.role = 'admin'),
    false
  );
$$;

-- ---------------------------------------------------------------------------------------------
-- 4. Account status: nobody changes their own status, reviewers never act on staff, and "restore"
--    only applies to suspended or banned accounts that are not under-18 blocks.
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_set_user_status(p_user_id uuid, p_status public.profile_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- Suspend needs a reviewer; ban and restore need an admin. A NULL status asks for the stricter check.
  v_admin uuid := private.require_admin(p_status is distinct from 'suspended');
  v_before public.profiles;
  pl record;
begin
  if p_status is null or p_status not in ('active', 'suspended', 'banned') then
    raise exception using errcode = 'P0001', message = 'Unsupported status.';
  end if;
  if p_user_id = v_admin then
    raise exception using errcode = '42501', message = 'You cannot change your own status.', hint = 'FORBIDDEN';
  end if;
  if exists (select 1 from private.admin_roles where user_id = p_user_id) and not app.is_full_admin() then
    raise exception using errcode = '42501', message = 'Only an admin can act on staff accounts.', hint = 'FORBIDDEN';
  end if;

  select * into v_before from public.profiles where id = p_user_id for update;
  if v_before.id is null then
    raise exception using errcode = 'P0001', message = 'User not found.';
  end if;
  if p_status = 'active' and (v_before.status not in ('suspended', 'banned') or v_before.verification_status = 'blocked_minor') then
    raise exception using errcode = 'P0001', message = 'This account cannot be restored here.', hint = 'UNAVAILABLE';
  end if;

  update public.profiles
  set status = p_status,
      status_reason = case when p_status = 'active' then null else btrim(p_reason) end
  where id = p_user_id;

  if p_status = 'banned' then
    for pl in select id from public.plans where host_id = p_user_id and status in ('open', 'full') loop
      perform private.cancel_plan_internal(pl.id, 'The host is no longer on Yuvomeet.', true);
    end loop;
    update public.plan_members set status = 'removed', decided_at = now()
    where user_id = p_user_id and status in ('requested', 'approved');
    update private.identity_fingerprints set is_banned = true where user_id = p_user_id;
  end if;

  if p_status in ('suspended', 'banned') then
    perform private.revoke_sessions(p_user_id);
  end if;

  perform private.audit(v_admin, 'user_' || p_status::text, 'user', p_user_id, p_reason,
    jsonb_build_object('status', v_before.status), jsonb_build_object('status', p_status));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Appeals: gate on the account's real state, not on the subject the appellant picked
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_decide_appeal(p_appeal_id uuid, p_uphold boolean, p_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_appeal public.appeals;
  v_profile public.profiles;
begin
  if p_uphold is null then
    raise exception using errcode = 'P0001', message = 'Choose uphold or keep.';
  end if;

  select * into v_appeal from public.appeals where id = p_appeal_id for update;
  if v_appeal.id is null or v_appeal.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'Appeal already answered.', hint = 'UNAVAILABLE';
  end if;
  if char_length(btrim(coalesce(p_response, ''))) = 0 then
    raise exception using errcode = 'P0001', message = 'Write a response for the user.', hint = 'REASON_REQUIRED';
  end if;
  if v_appeal.user_id = v_admin then
    raise exception using errcode = '42501', message = 'You cannot answer your own appeal.', hint = 'FORBIDDEN';
  end if;
  if not app.is_full_admin() and exists (
    select 1 from public.moderation_queue
    where subject = 'appeal' and subject_id = p_appeal_id and status = 'escalated'
  ) then
    raise exception using errcode = '42501', message = 'Escalated items need an admin.', hint = 'FORBIDDEN';
  end if;

  -- Lifting a ban or an under-18 block is admin-only whatever the appellant called the appeal.
  select * into v_profile from public.profiles where id = v_appeal.user_id for update;
  if p_uphold and not app.is_full_admin()
     and (v_appeal.subject = 'ban' or v_profile.status = 'banned' or v_profile.verification_status = 'blocked_minor') then
    raise exception using errcode = '42501', message = 'Only an admin can lift a ban or an age block.', hint = 'FORBIDDEN';
  end if;

  if p_uphold then
    case v_appeal.subject
      when 'suspension', 'ban' then
        update public.profiles set status = 'active', status_reason = null
        where id = v_appeal.user_id and status in ('suspended', 'banned')
          and verification_status <> 'blocked_minor';
      when 'verification' then
        -- One extra paid KYC attempt is the only way past the retry limit (moderation doc).
        insert into private.kyc_extra_attempts (user_id, granted) values (v_appeal.user_id, 1)
        on conflict (user_id) do update set granted = private.kyc_extra_attempts.granted + 1;
        update public.profiles set verification_status = 'unverified'
        where id = v_appeal.user_id and verification_status in ('rejected', 'manual_review', 'blocked_minor');
        update public.profiles set status = 'active', status_reason = null
        where id = v_appeal.user_id and status = 'banned';
      when 'content' then
        update public.profile_photos set status = 'approved', reject_reason = null
        where id = v_appeal.subject_id and user_id = v_appeal.user_id;
        update public.messages set status = 'visible'
        where id = v_appeal.subject_id and sender_id = v_appeal.user_id;
    end case;
  end if;

  update public.appeals
  set status = case when p_uphold then 'upheld' else 'denied' end::public.appeal_status,
      response = btrim(p_response), decided_by = v_admin, decided_at = now()
  where id = p_appeal_id;
  update public.moderation_queue
  set status = case when p_uphold then 'approved' else 'rejected' end::public.queue_status,
      decided_by = v_admin, decided_at = now(), decision_reason = btrim(p_response)
  where subject = 'appeal' and subject_id = p_appeal_id;
  perform private.audit(v_admin, case when p_uphold then 'appeal_uphold' else 'appeal_deny' end,
    'appeal', p_appeal_id, p_response);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 5. Roles
-- ---------------------------------------------------------------------------------------------
create or replace function public.admin_set_role(p_user_id uuid, p_role text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_old text;
begin
  if p_role is not null and p_role not in ('reviewer', 'admin') then
    raise exception using errcode = 'P0001', message = 'Unknown role.';
  end if;
  -- Serialises concurrent role changes, so two admins cannot demote each other at the same moment.
  lock table private.admin_roles in share row exclusive mode;

  if p_user_id = v_admin then
    raise exception using errcode = '42501', message = 'You cannot change your own role.', hint = 'FORBIDDEN';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'User not found.';
  end if;

  select role into v_old from private.admin_roles where user_id = p_user_id;
  if v_old is not distinct from p_role then
    raise exception using errcode = 'P0001', message = 'That is already their role.', hint = 'UNAVAILABLE';
  end if;

  if p_role is null then
    delete from private.admin_roles where user_id = p_user_id;
  else
    insert into private.admin_roles (user_id, role, granted_by) values (p_user_id, p_role, v_admin)
    on conflict (user_id) do update set role = excluded.role, granted_by = excluded.granted_by;
  end if;

  -- A removal or demotion also ends their sessions, so a refresh cannot mint a token with the old role.
  if p_role is null or (v_old = 'admin' and p_role = 'reviewer') then
    perform private.revoke_sessions(p_user_id);
  end if;

  perform private.audit(v_admin, 'role_change', 'user', p_user_id, p_reason,
    jsonb_build_object('role', v_old), jsonb_build_object('role', p_role));
end;
$$;

-- Admin console RPCs (AD-1 to AD-4, VR-6, S-42 to S-46).
-- reviewer: queue, appeals, lookup, suspend, chat/plan moderation.
-- admin:    everything, including ban, restore, venues, cities, gender, roles.
-- Every action writes audit_log in the same transaction with a non-empty reason.

create function private.require_admin(p_full boolean default false)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
begin
  if auth.uid() is null or (p_full and not app.is_full_admin()) or (not p_full and not app.is_admin()) then
    raise exception using errcode = '42501', message = 'Admin access required.', hint = 'FORBIDDEN';
  end if;
  return auth.uid();
end;
$$;

create function private.audit(
  p_admin uuid, p_action text, p_subject_type text, p_subject_id uuid,
  p_reason text, p_before jsonb default null, p_after jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if char_length(btrim(coalesce(p_reason, ''))) = 0 then
    raise exception using errcode = 'P0001', message = 'A reason is required.', hint = 'REASON_REQUIRED';
  end if;
  insert into public.audit_log (admin_id, action, subject_type, subject_id, reason, before, after)
  values (p_admin, p_action, p_subject_type, p_subject_id, btrim(p_reason), p_before, p_after);
end;
$$;

-- -----------------------------------------------------------------------------
-- Review queue (AD-1, SF-7)
-- -----------------------------------------------------------------------------
create function public.admin_claim_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  update public.moderation_queue
  set status = 'in_review', assigned_to = v_admin, assigned_at = now()
  where id = p_item_id
    and (status = 'pending' or (status = 'in_review' and (assigned_to = v_admin or assigned_at < now() - interval '30 minutes')));
  if not found then
    raise exception using errcode = 'P0001', message = 'Item is not available.', hint = 'UNAVAILABLE';
  end if;
end;
$$;

create function public.admin_decide_item(p_item_id uuid, p_decision text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_item public.moderation_queue;
  v_approve boolean := p_decision = 'approve';
  v_gender public.gender;
begin
  select * into v_item from public.moderation_queue where id = p_item_id for update;
  if v_item.id is null or v_item.status in ('approved', 'rejected') then
    raise exception using errcode = 'P0001', message = 'Item already decided.', hint = 'UNAVAILABLE';
  end if;
  if v_item.status = 'escalated' and not app.is_full_admin() then
    raise exception using errcode = '42501', message = 'Escalated items need an admin.', hint = 'FORBIDDEN';
  end if;
  if p_decision not in ('approve', 'reject', 'escalate') then
    raise exception using errcode = 'P0001', message = 'Unknown decision.';
  end if;

  if p_decision = 'escalate' then
    update public.moderation_queue set status = 'escalated', decision_reason = btrim(p_reason)
    where id = p_item_id;
    perform private.audit(v_admin, 'queue_escalate', v_item.subject::text, v_item.subject_id, p_reason);
    return;
  end if;

  case v_item.subject
    when 'photo' then
      update public.profile_photos
      set status = case when v_approve then 'approved' else 'rejected' end::public.media_status,
          reject_reason = case when v_approve then null else btrim(p_reason) end
      where id = v_item.subject_id;
      update public.messages
      set image_status = case when v_approve then 'approved' else 'rejected' end::public.media_status,
          status = case when v_approve then status else 'rejected' end::public.content_status
      where id = v_item.subject_id;
    when 'text' then
      update public.messages
      set status = case when v_approve then 'visible' else 'rejected' end::public.content_status
      where id = v_item.subject_id;
      update public.profiles
      set bio_status = case when v_approve then 'visible' else 'rejected' end::public.content_status
      where id = v_item.subject_id and bio_status = 'held';
    when 'verification' then
      if v_approve then
        select (vc.evidence ->> 'gender')::public.gender into v_gender
        from public.verification_checks vc
        where vc.user_id = v_item.subject_id and vc.type = 'gender'
        order by vc.created_at desc limit 1;
        update public.profiles
        set verification_status = 'verified', verified_at = now(),
            verified_gender = coalesce(v_gender, declared_gender)
        where id = v_item.subject_id and birth_year is not null;
        if not found then
          raise exception using errcode = 'P0001', message = 'No ID age result on file; ask the user to retry.';
        end if;
      else
        update public.profiles set verification_status = 'rejected' where id = v_item.subject_id;
      end if;
      update public.verification_checks
      set reviewer_id = v_admin, decided_at = now(),
          verdict = case when v_approve then 'pass' else 'fail' end::public.verdict
      where user_id = v_item.subject_id and verdict = 'review';
    when 'report' then
      update public.reports
      set status = case when v_approve then 'dismissed' else 'actioned' end::public.report_status
      where id = v_item.subject_id;
    when 'venue' then
      update public.venues
      set status = case when v_approve then 'approved' else 'archived' end::public.venue_status,
          approved_by = case when v_approve then v_admin end,
          approved_at = case when v_approve then now() end
      where id = v_item.subject_id;
    when 'appeal' then
      raise exception using errcode = 'P0001', message = 'Answer appeals from the appeals queue.';
    else
      null; -- rating_review: decision recorded; any action is taken from the user record.
  end case;

  update public.moderation_queue
  set status = case when v_approve then 'approved' else 'rejected' end::public.queue_status,
      decision_reason = btrim(p_reason), decided_by = v_admin, decided_at = now()
  where id = p_item_id;
  perform private.audit(v_admin, 'queue_' || p_decision, v_item.subject::text, v_item.subject_id, p_reason);
end;
$$;

-- -----------------------------------------------------------------------------
-- Account actions (AD-3)
-- -----------------------------------------------------------------------------
create function public.admin_set_user_status(p_user_id uuid, p_status public.profile_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(p_status <> 'suspended');
  v_before public.profiles;
  pl record;
begin
  if p_status not in ('active', 'suspended', 'banned') then
    raise exception using errcode = 'P0001', message = 'Unsupported status.';
  end if;
  select * into v_before from public.profiles where id = p_user_id for update;
  if v_before.id is null then
    raise exception using errcode = 'P0001', message = 'User not found.';
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

-- S-42: declared gender changes only here.
create function public.admin_set_gender(p_user_id uuid, p_gender public.gender, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_before public.gender;
begin
  select declared_gender into v_before from public.profiles where id = p_user_id for update;
  update public.profiles set declared_gender = p_gender, verified_gender = p_gender where id = p_user_id;
  perform private.audit(v_admin, 'gender_change', 'user', p_user_id, p_reason,
    jsonb_build_object('gender', v_before), jsonb_build_object('gender', p_gender));
end;
$$;

create function public.admin_set_role(p_user_id uuid, p_role text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
begin
  if p_role is null then
    delete from private.admin_roles where user_id = p_user_id;
  elsif p_role in ('reviewer', 'admin') then
    insert into private.admin_roles (user_id, role, granted_by) values (p_user_id, p_role, v_admin)
    on conflict (user_id) do update set role = excluded.role, granted_by = excluded.granted_by;
  else
    raise exception using errcode = 'P0001', message = 'Unknown role.';
  end if;
  perform private.audit(v_admin, 'role_change', 'user', p_user_id, p_reason, null, jsonb_build_object('role', p_role));
end;
$$;

-- -----------------------------------------------------------------------------
-- Plan and chat moderation
-- -----------------------------------------------------------------------------
create function public.admin_cancel_plan(p_plan_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  perform private.cancel_plan_internal(p_plan_id, p_reason, true);
  perform private.audit(v_admin, 'plan_cancel', 'plan', p_plan_id, p_reason);
end;
$$;

create function public.admin_remove_member(p_plan_id uuid, p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  update public.plan_members set status = 'removed', decided_at = now()
  where plan_id = p_plan_id and user_id = p_user_id and status in ('requested', 'approved');
  perform private.audit(v_admin, 'member_remove', 'plan', p_plan_id, p_reason, null, jsonb_build_object('user_id', p_user_id));
end;
$$;

create function public.admin_mute(p_conversation_id uuid, p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  insert into public.conversation_mutes (conversation_id, user_id, reason)
  values (p_conversation_id, p_user_id, btrim(p_reason))
  on conflict (conversation_id, user_id) do update set reason = excluded.reason;
  perform private.audit(v_admin, 'mute', 'conversation', p_conversation_id, p_reason, null, jsonb_build_object('user_id', p_user_id));
end;
$$;

create function public.admin_remove_message(p_message_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  update public.messages set status = 'rejected' where id = p_message_id;
  perform private.audit(v_admin, 'message_remove', 'message', p_message_id, p_reason);
end;
$$;

-- -----------------------------------------------------------------------------
-- Appeals (VR-6)
-- -----------------------------------------------------------------------------
create function public.admin_decide_appeal(p_appeal_id uuid, p_uphold boolean, p_response text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_appeal public.appeals;
begin
  select * into v_appeal from public.appeals where id = p_appeal_id for update;
  if v_appeal.id is null or v_appeal.status <> 'open' then
    raise exception using errcode = 'P0001', message = 'Appeal already answered.', hint = 'UNAVAILABLE';
  end if;
  if char_length(btrim(coalesce(p_response, ''))) = 0 then
    raise exception using errcode = 'P0001', message = 'Write a response for the user.', hint = 'REASON_REQUIRED';
  end if;
  if p_uphold and v_appeal.subject = 'ban' and not app.is_full_admin() then
    raise exception using errcode = '42501', message = 'Only an admin can lift a ban.', hint = 'FORBIDDEN';
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

-- -----------------------------------------------------------------------------
-- Venues and cities (AD-4, VN-1, SF-1)
-- -----------------------------------------------------------------------------
create function public.admin_save_venue(
  p_id uuid,
  p_city_id uuid,
  p_name text,
  p_area_name text,
  p_area_cell text,
  p_lat double precision,
  p_lng double precision,
  p_address_line text,
  p_hours jsonb,
  p_capacity int,
  p_partner boolean,
  p_late_events_allowed boolean,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_id uuid;
begin
  if p_id is null then
    insert into public.venues (city_id, name, area_name, area_cell, lat, lng, address_line, hours,
      capacity, partner, late_events_allowed)
    values (p_city_id, btrim(p_name), btrim(p_area_name), p_area_cell, p_lat, p_lng, btrim(p_address_line),
      coalesce(p_hours, '{}'::jsonb), p_capacity, p_partner, p_late_events_allowed)
    returning id into v_id;
  else
    update public.venues set city_id = p_city_id, name = btrim(p_name), area_name = btrim(p_area_name),
      area_cell = p_area_cell, lat = p_lat, lng = p_lng, address_line = btrim(p_address_line),
      hours = coalesce(p_hours, '{}'::jsonb), capacity = p_capacity, partner = p_partner,
      late_events_allowed = p_late_events_allowed
    where id = p_id
    returning id into v_id;
  end if;
  perform private.audit(v_admin, case when p_id is null then 'venue_create' else 'venue_update' end,
    'venue', v_id, p_reason);
  return v_id;
end;
$$;

create function public.admin_set_venue_status(p_venue_id uuid, p_status public.venue_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_before public.venue_status;
begin
  select status into v_before from public.venues where id = p_venue_id for update;
  update public.venues
  set status = p_status,
      approved_by = case when p_status = 'approved' then v_admin else approved_by end,
      approved_at = case when p_status = 'approved' then now() else approved_at end
  where id = p_venue_id;
  perform private.audit(v_admin, 'venue_' || p_status::text, 'venue', p_venue_id, p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

create function public.admin_set_city_status(p_city_id uuid, p_status public.city_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_before public.city_status;
begin
  select status into v_before from public.cities where id = p_city_id for update;
  update public.cities
  set status = p_status, launch_date = case when p_status = 'live' then coalesce(launch_date, current_date) else launch_date end
  where id = p_city_id;
  perform private.audit(v_admin, 'city_status', 'city', p_city_id, p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

-- AD-2 lookup: per-user counts the console shows next to search results.
create view public.admin_user_summary
with (security_barrier = true)
as
select
  p.id,
  p.first_name,
  p.status,
  p.verification_status,
  p.declared_gender,
  p.verified_gender,
  p.city_id,
  p.created_at,
  (select count(*) from public.reports r where r.target_user_id = p.id) as reports_received,
  (select count(*) from public.reports r where r.reporter_id = p.id) as reports_given,
  ps.plans_attended,
  ps.plans_no_show,
  ps.plans_hosted,
  ps.late_cancel_count_30d,
  ps.unsafe_ratings_30d
from public.profiles p
left join public.profile_stats ps on ps.user_id = p.id
where app.is_admin();

create view public.admin_city_waitlist
with (security_barrier = true)
as
select c.id, c.name, c.slug, c.status, c.launch_date,
  (select count(*) from public.waitlist_signups w where w.city_id = c.id) as waitlist_count
from public.cities c
where app.is_admin();

grant select on public.admin_user_summary, public.admin_city_waitlist to authenticated;

grant execute on function
  public.admin_claim_item(uuid),
  public.admin_decide_item(uuid, text, text),
  public.admin_set_user_status(uuid, public.profile_status, text),
  public.admin_set_gender(uuid, public.gender, text),
  public.admin_set_role(uuid, text, text),
  public.admin_cancel_plan(uuid, text),
  public.admin_remove_member(uuid, uuid, text),
  public.admin_mute(uuid, uuid, text),
  public.admin_remove_message(uuid, text),
  public.admin_decide_appeal(uuid, boolean, text),
  public.admin_save_venue(uuid, uuid, text, text, text, double precision, double precision, text, jsonb, int, boolean, boolean, text),
  public.admin_set_venue_status(uuid, public.venue_status, text),
  public.admin_set_city_status(uuid, public.city_status, text)
to authenticated;

-- S-43: custom access token hook adds app_role for admins.
create function public.custom_access_token(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_claims jsonb := event -> 'claims';
  v_role text;
begin
  select ar.role into v_role from private.admin_roles ar where ar.user_id = (event ->> 'user_id')::uuid;
  if v_role is not null then
    v_claims := jsonb_set(v_claims, '{app_role}', to_jsonb(v_role));
  else
    v_claims := v_claims - 'app_role';
  end if;
  return jsonb_build_object('claims', v_claims);
end;
$$;

grant execute on function public.custom_access_token(jsonb) to supabase_auth_admin;

-- Admin console: the write paths the console was missing (create / edit / delete for reference data,
-- settings, money, messaging and staff). Same rules as 20261026000006_admin.sql:
--   * every function is security definer, starts with private.require_admin() (reviewer) or
--     private.require_admin(true) (admin), and writes one audit_log row in the same transaction;
--   * every failure the console may show is P0001 / 42501 with a plain message;
--   * deletes refuse when other rows still depend on the record, so nothing cascades by surprise.
-- Records with a text key (settings, screen terms, interests, activities) have no uuid, so their audit
-- rows use the nil uuid as subject_id and carry the key in before/after.

-- ---------------------------------------------------------------------------------------------
-- Read models (admin-only views; security_barrier, gated in the WHERE clause like the others)
-- ---------------------------------------------------------------------------------------------
create view public.admin_settings
with (security_barrier = true)
as
  select s.key, s.val, s.updated_at from private.settings s where app.is_full_admin();

create view public.admin_screen_terms
with (security_barrier = true)
as
  select t.term, t.lang, t.action from private.screen_terms t where app.is_full_admin();

-- Console staff with their sign-in email (admins only; reviewers never see other staff emails).
create view public.admin_staff
with (security_barrier = true)
as
  select ar.user_id, u.email::text as email, ar.role, ar.granted_by, ar.created_at, u.last_sign_in_at,
         p.first_name
  from private.admin_roles ar
  join auth.users u on u.id = ar.user_id
  left join public.profiles p on p.id = ar.user_id
  where app.is_full_admin();

-- Landing-page waitlist rows. Emails are personal data: admin-only, and deletable on request.
create view public.admin_web_waitlist_entries
with (security_barrier = true)
as
  select w.id, w.email, w.city, w.consent_text, w.consented_at, w.created_at
  from private.web_waitlist w
  where app.is_full_admin();

-- KYC attempts granted by appeal or by an admin, per member.
create view public.admin_kyc_extra
with (security_barrier = true)
as
  select k.user_id, k.granted from private.kyc_extra_attempts k where app.is_admin();

revoke all on public.admin_settings, public.admin_screen_terms, public.admin_staff,
  public.admin_web_waitlist_entries, public.admin_kyc_extra from public, anon;
grant select on public.admin_settings, public.admin_screen_terms, public.admin_staff,
  public.admin_web_waitlist_entries, public.admin_kyc_extra to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Settings (private.settings): update only. Keys are read by name in SQL and Edge Functions, so a
-- new key would do nothing and a deleted one would break a feature; the console edits values.
-- ---------------------------------------------------------------------------------------------
create function public.admin_set_setting(p_key text, p_val text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_old text;
  v_val text := btrim(coalesce(p_val, ''));
begin
  select val into v_old from private.settings where key = p_key for update;
  if v_old is null then
    raise exception using errcode = 'P0001', message = 'Unknown setting.';
  end if;
  if v_val = '' or char_length(v_val) > 200 then
    raise exception using errcode = 'P0001', message = 'Enter a value under 200 characters.';
  end if;
  -- A numeric setting stays numeric, and a clock time stays a clock time, so a typo cannot break a job.
  if v_old ~ '^-?\d+$' and v_val !~ '^-?\d+$' then
    raise exception using errcode = 'P0001', message = 'This setting needs a whole number.';
  end if;
  if v_old ~ '^\d{2}:\d{2}$' and v_val !~ '^([01]\d|2[0-3]):[0-5]\d$' then
    raise exception using errcode = 'P0001', message = 'This setting needs a time like 21:00.';
  end if;
  if v_old = v_val then
    raise exception using errcode = 'P0001', message = 'That is already the value.', hint = 'UNAVAILABLE';
  end if;
  update private.settings set val = v_val, updated_at = now() where key = p_key;
  perform private.audit(v_admin, 'setting_update', 'setting', '00000000-0000-0000-0000-000000000000', p_reason,
    jsonb_build_object('key', p_key, 'val', v_old), jsonb_build_object('key', p_key, 'val', v_val));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Screen terms (the text blocklist / hold list)
-- ---------------------------------------------------------------------------------------------
create function public.admin_save_screen_term(p_term text, p_lang text, p_action text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_term text := lower(btrim(coalesce(p_term, '')));
  v_lang text := lower(btrim(coalesce(p_lang, '')));
  v_old text;
begin
  if char_length(v_term) not between 2 and 60 then
    raise exception using errcode = 'P0001', message = 'A term is 2 to 60 characters.';
  end if;
  if v_lang !~ '^[a-z]{2,12}$' then
    raise exception using errcode = 'P0001', message = 'Language is a short code like en, hi or hinglish.';
  end if;
  if p_action is null or p_action not in ('reject', 'hold') then
    raise exception using errcode = 'P0001', message = 'Choose reject or hold.';
  end if;
  select action into v_old from private.screen_terms where term = v_term and lang = v_lang;
  insert into private.screen_terms (term, lang, action) values (v_term, v_lang, p_action)
  on conflict (term, lang) do update set action = excluded.action;
  perform private.audit(v_admin, case when v_old is null then 'screen_term_create' else 'screen_term_update' end,
    'screen_term', '00000000-0000-0000-0000-000000000000', p_reason,
    case when v_old is null then null else jsonb_build_object('term', v_term, 'lang', v_lang, 'action', v_old) end,
    jsonb_build_object('term', v_term, 'lang', v_lang, 'action', p_action));
end;
$$;

create function public.admin_delete_screen_term(p_term text, p_lang text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_old text;
begin
  delete from private.screen_terms where term = p_term and lang = p_lang returning action into v_old;
  if v_old is null then
    raise exception using errcode = 'P0001', message = 'Term not found.';
  end if;
  perform private.audit(v_admin, 'screen_term_delete', 'screen_term', '00000000-0000-0000-0000-000000000000', p_reason,
    jsonb_build_object('term', p_term, 'lang', p_lang, 'action', v_old), null);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Cities
-- ---------------------------------------------------------------------------------------------
create function public.admin_save_city(
  p_id uuid, p_name text, p_slug text, p_timezone text, p_center_lat double precision,
  p_center_lng double precision, p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_id uuid;
  v_slug text := lower(btrim(coalesce(p_slug, '')));
begin
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 60 then
    raise exception using errcode = 'P0001', message = 'A city name is 2 to 60 characters.';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 40 then
    raise exception using errcode = 'P0001', message = 'The slug uses lowercase letters, digits and dashes, like new-delhi.';
  end if;
  if p_timezone is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception using errcode = 'P0001', message = 'Unknown time zone. Use a name like Asia/Kolkata.';
  end if;
  if p_center_lat is null or p_center_lng is null or abs(p_center_lat) > 90 or abs(p_center_lng) > 180 then
    raise exception using errcode = 'P0001', message = 'The centre needs a valid latitude and longitude.';
  end if;
  if exists (select 1 from public.cities where slug = v_slug and id is distinct from p_id) then
    raise exception using errcode = 'P0001', message = 'Another city already uses that slug.';
  end if;

  if p_id is null then
    insert into public.cities (name, slug, timezone, center_lat, center_lng)
    values (btrim(p_name), v_slug, p_timezone, p_center_lat, p_center_lng)
    returning id into v_id;
  else
    update public.cities set name = btrim(p_name), slug = v_slug, timezone = p_timezone,
      center_lat = p_center_lat, center_lng = p_center_lng
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception using errcode = 'P0001', message = 'City not found.';
    end if;
  end if;
  perform private.audit(v_admin, case when p_id is null then 'city_create' else 'city_update' end, 'city', v_id, p_reason,
    null, jsonb_build_object('name', btrim(p_name), 'slug', v_slug));
  return v_id;
end;
$$;

create function public.admin_delete_city(p_city_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_name text;
begin
  select name into v_name from public.cities where id = p_city_id for update;
  if v_name is null then
    raise exception using errcode = 'P0001', message = 'City not found.';
  end if;
  if exists (select 1 from public.profiles where city_id = p_city_id)
     or exists (select 1 from public.plans where city_id = p_city_id)
     or exists (select 1 from public.venues where city_id = p_city_id)
     or exists (select 1 from public.colleges where city_id = p_city_id) then
    raise exception using errcode = 'P0001', hint = 'UNAVAILABLE',
      message = 'Members, plans, venues or colleges still use this city. Move or remove them first, or keep it on the waitlist.';
  end if;
  delete from public.waitlist_signups where city_id = p_city_id;
  delete from public.cities where id = p_city_id;
  perform private.audit(v_admin, 'city_delete', 'city', p_city_id, p_reason, jsonb_build_object('name', v_name), null);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Colleges
-- ---------------------------------------------------------------------------------------------
create function public.admin_save_college(p_id uuid, p_city_id uuid, p_name text, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_id uuid;
  v_name text := btrim(coalesce(p_name, ''));
begin
  if char_length(v_name) not between 2 and 120 then
    raise exception using errcode = 'P0001', message = 'A college name is 2 to 120 characters.';
  end if;
  if not exists (select 1 from public.cities where id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'Choose a city.';
  end if;
  if exists (select 1 from public.colleges where city_id = p_city_id and lower(name) = lower(v_name) and id is distinct from p_id) then
    raise exception using errcode = 'P0001', message = 'That college already exists in this city. Merge instead.';
  end if;
  if p_id is null then
    insert into public.colleges (city_id, name) values (p_city_id, v_name) returning id into v_id;
  else
    update public.colleges set city_id = p_city_id, name = v_name where id = p_id returning id into v_id;
    if v_id is null then
      raise exception using errcode = 'P0001', message = 'College not found.';
    end if;
  end if;
  perform private.audit(v_admin, case when p_id is null then 'college_create' else 'college_update' end, 'college', v_id,
    p_reason, null, jsonb_build_object('name', v_name));
  return v_id;
end;
$$;

create function public.admin_set_college_status(p_college_id uuid, p_status text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_before text;
begin
  if p_status is null or p_status not in ('active', 'hidden') then
    raise exception using errcode = 'P0001', message = 'Unsupported status.';
  end if;
  select status into v_before from public.colleges where id = p_college_id for update;
  if v_before is null then
    raise exception using errcode = 'P0001', message = 'College not found.';
  end if;
  update public.colleges set status = p_status where id = p_college_id;
  perform private.audit(v_admin, 'college_' || p_status, 'college', p_college_id, p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

-- Duplicates typed by members ("IIT Kota" / "iit kota") are merged: members and plans move to the kept row.
create function public.admin_merge_college(p_from uuid, p_into uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_from public.colleges;
  v_into public.colleges;
begin
  if p_from = p_into then
    raise exception using errcode = 'P0001', message = 'Choose a different college to merge into.';
  end if;
  select * into v_from from public.colleges where id = p_from for update;
  select * into v_into from public.colleges where id = p_into for update;
  if v_from.id is null or v_into.id is null then
    raise exception using errcode = 'P0001', message = 'College not found.';
  end if;
  if v_from.city_id <> v_into.city_id then
    raise exception using errcode = 'P0001', message = 'Both colleges must be in the same city.';
  end if;
  update public.profiles set college_id = p_into where college_id = p_from;
  update public.plans set college_id = p_into where college_id = p_from;
  delete from public.colleges where id = p_from;
  perform private.audit(v_admin, 'college_merge', 'college', p_into, p_reason,
    jsonb_build_object('merged', v_from.name, 'merged_id', p_from), jsonb_build_object('into', v_into.name));
end;
$$;

create function public.admin_delete_college(p_college_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_name text;
begin
  select name into v_name from public.colleges where id = p_college_id for update;
  if v_name is null then
    raise exception using errcode = 'P0001', message = 'College not found.';
  end if;
  if exists (select 1 from public.profiles where college_id = p_college_id)
     or exists (select 1 from public.plans where college_id = p_college_id) then
    raise exception using errcode = 'P0001', hint = 'UNAVAILABLE',
      message = 'Members or plans still use this college. Merge it into another one, or hide it.';
  end if;
  delete from public.colleges where id = p_college_id;
  perform private.audit(v_admin, 'college_delete', 'college', p_college_id, p_reason, jsonb_build_object('name', v_name), null);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Interests and activities (the pick lists in the app)
-- ---------------------------------------------------------------------------------------------
create function private.check_catalog(p_slug text, p_label text, p_icon text, p_sort int)
returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if p_slug is null or p_slug !~ '^[a-z0-9]+(_[a-z0-9]+)*$' or char_length(p_slug) > 40 then
    raise exception using errcode = 'P0001', message = 'The key uses lowercase letters, digits and underscores, like board_games.';
  end if;
  if char_length(btrim(coalesce(p_label, ''))) not between 2 and 40 then
    raise exception using errcode = 'P0001', message = 'A label is 2 to 40 characters.';
  end if;
  if char_length(btrim(coalesce(p_icon, ''))) not between 1 and 40 then
    raise exception using errcode = 'P0001', message = 'Give an icon (an emoji or an icon name).';
  end if;
  if p_sort is null or p_sort not between 0 and 1000 then
    raise exception using errcode = 'P0001', message = 'Order is a number from 0 to 1000.';
  end if;
end;
$$;

create function public.admin_save_interest(p_slug text, p_label text, p_icon text, p_sort int, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_old public.interests;
begin
  perform private.check_catalog(p_slug, p_label, p_icon, p_sort);
  select * into v_old from public.interests where slug = p_slug;
  insert into public.interests (slug, label, icon, sort) values (p_slug, btrim(p_label), btrim(p_icon), p_sort)
  on conflict (slug) do update set label = excluded.label, icon = excluded.icon, sort = excluded.sort;
  perform private.audit(v_admin, case when v_old.slug is null then 'interest_create' else 'interest_update' end,
    'interest', '00000000-0000-0000-0000-000000000000', p_reason,
    case when v_old.slug is null then null else to_jsonb(v_old) end,
    jsonb_build_object('slug', p_slug, 'label', btrim(p_label), 'icon', btrim(p_icon), 'sort', p_sort));
end;
$$;

-- Members' profiles keep interests as a text array (no foreign key), so the slug is removed there too.
create function public.admin_delete_interest(p_slug text, p_reason text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_old public.interests;
  v_count int;
begin
  delete from public.interests where slug = p_slug returning * into v_old;
  if v_old.slug is null then
    raise exception using errcode = 'P0001', message = 'Interest not found.';
  end if;
  update public.profiles set interests = array_remove(interests, p_slug) where p_slug = any (interests);
  get diagnostics v_count = row_count;
  perform private.audit(v_admin, 'interest_delete', 'interest', '00000000-0000-0000-0000-000000000000', p_reason,
    to_jsonb(v_old), jsonb_build_object('profiles_updated', v_count));
  return v_count;
end;
$$;

create function public.admin_save_activity(p_slug text, p_label text, p_icon text, p_sort int, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_old public.activities;
begin
  perform private.check_catalog(p_slug, p_label, p_icon, p_sort);
  select * into v_old from public.activities where slug = p_slug;
  insert into public.activities (slug, label, icon, sort) values (p_slug, btrim(p_label), btrim(p_icon), p_sort)
  on conflict (slug) do update set label = excluded.label, icon = excluded.icon, sort = excluded.sort;
  perform private.audit(v_admin, case when v_old.slug is null then 'activity_create' else 'activity_update' end,
    'activity', '00000000-0000-0000-0000-000000000000', p_reason,
    case when v_old.slug is null then null else to_jsonb(v_old) end,
    jsonb_build_object('slug', p_slug, 'label', btrim(p_label), 'icon', btrim(p_icon), 'sort', p_sort));
end;
$$;

create function public.admin_delete_activity(p_slug text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_old public.activities;
begin
  if exists (select 1 from public.plans where activity = p_slug) then
    raise exception using errcode = 'P0001', hint = 'UNAVAILABLE',
      message = 'Plans use this activity, so it cannot be deleted. Rename it or move it to the end of the list.';
  end if;
  delete from public.activities where slug = p_slug returning * into v_old;
  if v_old.slug is null then
    raise exception using errcode = 'P0001', message = 'Activity not found.';
  end if;
  perform private.audit(v_admin, 'activity_delete', 'activity', '00000000-0000-0000-0000-000000000000', p_reason,
    to_jsonb(v_old), null);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Venues: hard delete only for venues no plan ever used (otherwise archive)
-- ---------------------------------------------------------------------------------------------
create function public.admin_delete_venue(p_venue_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_name text;
begin
  select name into v_name from public.venues where id = p_venue_id for update;
  if v_name is null then
    raise exception using errcode = 'P0001', message = 'Venue not found.';
  end if;
  if exists (select 1 from public.plans where venue_id = p_venue_id) then
    raise exception using errcode = 'P0001', hint = 'UNAVAILABLE',
      message = 'Plans were held at this venue, so it stays on record. Archive it instead.';
  end if;
  delete from public.venues where id = p_venue_id;
  perform private.audit(v_admin, 'venue_delete', 'venue', p_venue_id, p_reason, jsonb_build_object('name', v_name), null);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Members
-- ---------------------------------------------------------------------------------------------
create function public.admin_update_profile(
  p_user_id uuid, p_first_name text, p_bio text, p_bio_status public.content_status, p_city_id uuid,
  p_college_id uuid, p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_before public.profiles;
  v_name text := btrim(coalesce(p_first_name, ''));
  v_bio text := nullif(btrim(coalesce(p_bio, '')), '');
begin
  select * into v_before from public.profiles where id = p_user_id for update;
  if v_before.id is null then
    raise exception using errcode = 'P0001', message = 'User not found.';
  end if;
  if char_length(v_name) not between 1 and 30 then
    raise exception using errcode = 'P0001', message = 'A first name is 1 to 30 characters.';
  end if;
  if char_length(coalesce(v_bio, '')) > 300 then
    raise exception using errcode = 'P0001', message = 'A bio is at most 300 characters.';
  end if;
  if p_bio_status is null then
    raise exception using errcode = 'P0001', message = 'Choose a bio status.';
  end if;
  if p_city_id is not null and not exists (select 1 from public.cities where id = p_city_id) then
    raise exception using errcode = 'P0001', message = 'Choose a city.';
  end if;
  if p_college_id is not null and not exists (
    select 1 from public.colleges where id = p_college_id and city_id is not distinct from p_city_id
  ) then
    raise exception using errcode = 'P0001', message = 'The college must be in the member''s city.';
  end if;

  update public.profiles
  set first_name = v_name, bio = v_bio, bio_status = p_bio_status, city_id = p_city_id, college_id = p_college_id
  where id = p_user_id;

  perform private.audit(v_admin, 'profile_update', 'user', p_user_id, p_reason,
    jsonb_build_object('first_name', v_before.first_name, 'bio', v_before.bio, 'bio_status', v_before.bio_status,
      'city_id', v_before.city_id, 'college_id', v_before.college_id),
    jsonb_build_object('first_name', v_name, 'bio', v_bio, 'bio_status', p_bio_status,
      'city_id', p_city_id, 'college_id', p_college_id));
end;
$$;

-- Comp, extend or revoke a pass. Free clears the expiry; paid tiers need a future expiry.
create function public.admin_set_entitlement(p_user_id uuid, p_tier public.entitlement, p_until timestamptz, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_before public.profiles;
begin
  if p_tier is null then
    raise exception using errcode = 'P0001', message = 'Choose a plan.';
  end if;
  if p_tier <> 'free' and (p_until is null or p_until <= now()) then
    raise exception using errcode = 'P0001', message = 'A paid plan needs an end date in the future.';
  end if;
  if p_until > now() + interval '3 years' then
    raise exception using errcode = 'P0001', message = 'Choose an end date within three years.';
  end if;
  select * into v_before from public.profiles where id = p_user_id for update;
  if v_before.id is null then
    raise exception using errcode = 'P0001', message = 'User not found.';
  end if;
  update public.profiles
  set entitlement = p_tier, entitlement_until = case when p_tier = 'free' then null else p_until end
  where id = p_user_id;
  perform private.audit(v_admin, 'entitlement_set', 'user', p_user_id, p_reason,
    jsonb_build_object('tier', v_before.entitlement, 'until', v_before.entitlement_until),
    jsonb_build_object('tier', p_tier, 'until', case when p_tier = 'free' then null else p_until end));
end;
$$;

-- Starts the same 30-day deletion the member can request in the app (svc_request_deletion).
create function public.admin_delete_user(p_user_id uuid, p_reason text)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_status public.profile_status;
  v_purge timestamptz;
begin
  if p_user_id = v_admin then
    raise exception using errcode = '42501', message = 'You cannot delete your own account here.', hint = 'FORBIDDEN';
  end if;
  if exists (select 1 from private.admin_roles where user_id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'Remove their console role first.', hint = 'UNAVAILABLE';
  end if;
  select status into v_status from public.profiles where id = p_user_id for update;
  if v_status is null then
    raise exception using errcode = 'P0001', message = 'User not found.';
  end if;
  if v_status = 'deleted' then
    raise exception using errcode = 'P0001', message = 'This account is already being deleted.', hint = 'UNAVAILABLE';
  end if;
  v_purge := public.svc_request_deletion(p_user_id);
  perform private.audit(v_admin, 'user_delete', 'user', p_user_id, p_reason,
    jsonb_build_object('status', v_status), jsonb_build_object('status', 'deleted', 'purge_after', v_purge));
  return v_purge;
end;
$$;

-- Take down or reinstate one profile photo outside the queue (e.g. found while reviewing a report).
create function public.admin_set_photo_status(p_photo_id uuid, p_status public.media_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_photo public.profile_photos;
begin
  if p_status is null or p_status not in ('approved', 'rejected') then
    raise exception using errcode = 'P0001', message = 'Unsupported status.';
  end if;
  select * into v_photo from public.profile_photos where id = p_photo_id for update;
  if v_photo.id is null then
    raise exception using errcode = 'P0001', message = 'Photo not found.';
  end if;
  if p_status = 'approved' and v_photo.path is null then
    raise exception using errcode = 'P0001', message = 'This photo has not passed screening yet.', hint = 'UNAVAILABLE';
  end if;
  update public.profile_photos
  set status = p_status, reject_reason = case when p_status = 'rejected' then btrim(p_reason) else null end
  where id = p_photo_id;
  perform private.audit(v_admin, 'photo_' || p_status::text, 'user', v_photo.user_id, p_reason,
    jsonb_build_object('photo_id', p_photo_id, 'status', v_photo.status), jsonb_build_object('status', p_status));
end;
$$;

create function public.admin_grant_kyc_attempt(p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    raise exception using errcode = 'P0001', message = 'User not found.';
  end if;
  insert into private.kyc_extra_attempts (user_id, granted) values (p_user_id, 1)
  on conflict (user_id) do update set granted = private.kyc_extra_attempts.granted + 1;
  update public.profiles set verification_status = 'unverified'
  where id = p_user_id and verification_status in ('rejected', 'manual_review');
  perform private.audit(v_admin, 'kyc_attempt_grant', 'user', p_user_id, p_reason);
end;
$$;

-- Support lookup by sign-in email (admins only). Returns the user id or null.
create function public.admin_find_user_by_email(p_email text)
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin(true);
  select id into v_id from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) limit 1;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Reports, queue, chat
-- ---------------------------------------------------------------------------------------------
create function public.admin_set_report_status(p_report_id uuid, p_status public.report_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_before public.report_status;
begin
  if p_status is null then
    raise exception using errcode = 'P0001', message = 'Choose a status.';
  end if;
  select status into v_before from public.reports where id = p_report_id for update;
  if v_before is null then
    raise exception using errcode = 'P0001', message = 'Report not found.';
  end if;
  update public.reports set status = p_status where id = p_report_id;
  -- Closing the report also closes its open queue item, so nobody reviews it twice.
  if p_status <> 'open' then
    update public.moderation_queue
    set status = case when p_status = 'dismissed' then 'approved' else 'rejected' end::public.queue_status,
        decided_by = v_admin, decided_at = now(), decision_reason = btrim(p_reason)
    where subject = 'report' and subject_id = p_report_id and status in ('pending', 'in_review', 'escalated')
      and (status <> 'escalated' or app.is_full_admin());
  end if;
  perform private.audit(v_admin, 'report_' || p_status::text, 'report', p_report_id, p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', p_status));
end;
$$;

-- Hand a claimed item back to the queue (your own claim, or anyone's for an admin).
create function public.admin_release_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_item public.moderation_queue;
begin
  select * into v_item from public.moderation_queue where id = p_item_id for update;
  if v_item.id is null or v_item.status <> 'in_review' then
    raise exception using errcode = 'P0001', message = 'This item is not claimed.', hint = 'UNAVAILABLE';
  end if;
  if v_item.assigned_to is distinct from v_admin and not app.is_full_admin() then
    raise exception using errcode = '42501', message = 'Only an admin can release someone else''s claim.', hint = 'FORBIDDEN';
  end if;
  update public.moderation_queue set status = 'pending', assigned_to = null, assigned_at = null where id = p_item_id;
end;
$$;

create function public.admin_restore_message(p_message_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_before public.content_status;
begin
  select status into v_before from public.messages where id = p_message_id for update;
  if v_before is null then
    raise exception using errcode = 'P0001', message = 'Message not found.';
  end if;
  if v_before = 'visible' then
    raise exception using errcode = 'P0001', message = 'This message is already visible.', hint = 'UNAVAILABLE';
  end if;
  update public.messages set status = 'visible' where id = p_message_id;
  perform private.audit(v_admin, 'message_restore', 'message', p_message_id, p_reason,
    jsonb_build_object('status', v_before), jsonb_build_object('status', 'visible'));
end;
$$;

create function public.admin_unmute(p_conversation_id uuid, p_user_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
begin
  delete from public.conversation_mutes where conversation_id = p_conversation_id and user_id = p_user_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'This member is not muted.', hint = 'UNAVAILABLE';
  end if;
  perform private.audit(v_admin, 'unmute', 'user', p_user_id, p_reason, null,
    jsonb_build_object('conversation_id', p_conversation_id));
end;
$$;

create function public.admin_set_conversation_status(p_conversation_id uuid, p_status public.conversation_status, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_before public.conversations;
begin
  if p_status is null then
    raise exception using errcode = 'P0001', message = 'Choose a status.';
  end if;
  select * into v_before from public.conversations where id = p_conversation_id for update;
  if v_before.id is null then
    raise exception using errcode = 'P0001', message = 'Chat not found.';
  end if;
  if v_before.status = p_status then
    raise exception using errcode = 'P0001', message = 'The chat is already ' || p_status::text || '.', hint = 'UNAVAILABLE';
  end if;
  -- Reopening gives the chat another day; the retention job closes it again afterwards.
  update public.conversations
  set status = p_status,
      closes_at = case when p_status = 'open' then greatest(closes_at, now() + interval '24 hours') else least(closes_at, now()) end
  where id = p_conversation_id;
  perform private.audit(v_admin, 'chat_' || p_status::text, 'conversation', p_conversation_id, p_reason,
    jsonb_build_object('status', v_before.status), jsonb_build_object('status', p_status));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Plans
-- ---------------------------------------------------------------------------------------------
create function public.admin_update_plan(p_plan_id uuid, p_title text, p_description text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin();
  v_before public.plans;
  v_title text := btrim(coalesce(p_title, ''));
  v_desc text := nullif(btrim(coalesce(p_description, '')), '');
begin
  select * into v_before from public.plans where id = p_plan_id for update;
  if v_before.id is null then
    raise exception using errcode = 'P0001', message = 'Plan not found.';
  end if;
  if char_length(v_title) not between 3 and 60 then
    raise exception using errcode = 'P0001', message = 'A title is 3 to 60 characters.';
  end if;
  if char_length(coalesce(v_desc, '')) > 500 then
    raise exception using errcode = 'P0001', message = 'A description is at most 500 characters.';
  end if;
  update public.plans set title = v_title, description = v_desc where id = p_plan_id;
  perform private.audit(v_admin, 'plan_update', 'plan', p_plan_id, p_reason,
    jsonb_build_object('title', v_before.title, 'description', v_before.description),
    jsonb_build_object('title', v_title, 'description', v_desc));
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Money
-- ---------------------------------------------------------------------------------------------
-- Queues a refund through the same worker the automatic refunds use (payments-refunds).
create function public.admin_refund_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_pay public.payments;
begin
  select * into v_pay from public.payments where id = p_payment_id for update;
  if v_pay.id is null then
    raise exception using errcode = 'P0001', message = 'Payment not found.';
  end if;
  if v_pay.status <> 'paid' or v_pay.razorpay_payment_id is null then
    raise exception using errcode = 'P0001', message = 'Only a completed payment can be refunded.', hint = 'UNAVAILABLE';
  end if;
  update public.payments set status = 'refund_pending' where id = p_payment_id;
  perform private.notify(v_pay.user_id, 'account', 'admin_refund', 'Refund on its way',
    'We are refunding your payment. It usually reaches you in 5-7 days.', v_pay.plan_id);
  perform private.call_function('payments-refunds', '{}'::jsonb);
  perform private.audit(v_admin, 'payment_refund', 'payment', p_payment_id, p_reason,
    jsonb_build_object('status', v_pay.status, 'amount_paise', v_pay.amount_paise), jsonb_build_object('status', 'refund_pending'));
end;
$$;

-- Records a payout sent to a host outside the app (UPI transfer). Records are kept, never edited.
create function public.admin_record_payout(p_host_id uuid, p_amount_paise int, p_reference text, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_id uuid;
begin
  if not exists (select 1 from public.profiles where id = p_host_id) then
    raise exception using errcode = 'P0001', message = 'Host not found.';
  end if;
  if p_amount_paise is null or p_amount_paise <= 0 or p_amount_paise > 10000000 then
    raise exception using errcode = 'P0001', message = 'Enter an amount between ₹0.01 and ₹1,00,000.';
  end if;
  if char_length(btrim(coalesce(p_reference, ''))) not between 4 and 80 then
    raise exception using errcode = 'P0001', message = 'Add the transfer reference (UTR), 4 to 80 characters.';
  end if;
  insert into public.host_payouts (host_id, amount_paise, reference, paid_by)
  values (p_host_id, p_amount_paise, btrim(p_reference), v_admin)
  returning id into v_id;
  perform private.notify(p_host_id, 'account', 'payout_sent', 'Payout sent',
    'We sent ₹' || to_char(p_amount_paise / 100.0, 'FM9999990.00') || ' to your UPI account.', null);
  perform private.audit(v_admin, 'payout_record', 'user', p_host_id, p_reason, null,
    jsonb_build_object('payout_id', v_id, 'amount_paise', p_amount_paise, 'reference', btrim(p_reference)));
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Announcements: an in-app notification (and push) to one member, one city, or everyone active.
-- ---------------------------------------------------------------------------------------------
create function public.admin_send_notification(p_user_id uuid, p_city_id uuid, p_title text, p_body text, p_reason text)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_title text := btrim(coalesce(p_title, ''));
  v_body text := btrim(coalesce(p_body, ''));
  v_count int;
begin
  if char_length(v_title) not between 3 and 60 then
    raise exception using errcode = 'P0001', message = 'A title is 3 to 60 characters.';
  end if;
  if char_length(v_body) not between 3 and 240 then
    raise exception using errcode = 'P0001', message = 'A message is 3 to 240 characters.';
  end if;
  if p_user_id is not null and p_city_id is not null then
    raise exception using errcode = 'P0001', message = 'Send to one member or one city, not both.';
  end if;

  insert into public.notifications (user_id, category, kind, title, body)
  -- Literals in a SELECT list resolve to text, so the enum needs an explicit cast.
  select p.id, 'account'::public.notification_category, 'announcement', v_title, v_body
  from public.profiles p
  where p.status = 'active'
    and (p_user_id is null or p.id = p_user_id)
    and (p_city_id is null or p.city_id = p_city_id);
  get diagnostics v_count = row_count;
  if v_count = 0 then
    raise exception using errcode = 'P0001', message = 'Nobody matched. Only active members receive messages.', hint = 'UNAVAILABLE';
  end if;

  perform private.audit(v_admin, 'announcement_send',
    case when p_user_id is not null then 'user' when p_city_id is not null then 'city' else 'all' end,
    coalesce(p_user_id, p_city_id, '00000000-0000-0000-0000-000000000000'), p_reason, null,
    jsonb_build_object('title', v_title, 'body', v_body, 'recipients', v_count));
  return v_count;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Staff: grant a role by sign-in email (the account must already exist)
-- ---------------------------------------------------------------------------------------------
create function public.admin_set_role_by_email(p_email text, p_role text, p_reason text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  perform private.require_admin(true);
  select id into v_id from auth.users where lower(email) = lower(btrim(coalesce(p_email, ''))) limit 1;
  if v_id is null then
    raise exception using errcode = 'P0001', message = 'No account uses that email. They need to sign up first.';
  end if;
  perform public.admin_set_role(v_id, p_role, p_reason);
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Landing-page waitlist: remove an entry (erasure request or spam)
-- ---------------------------------------------------------------------------------------------
create function public.admin_delete_web_waitlist(p_id bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin uuid := private.require_admin(true);
  v_city text;
begin
  delete from private.web_waitlist where id = p_id returning city into v_city;
  if v_city is null then
    raise exception using errcode = 'P0001', message = 'Entry not found.';
  end if;
  -- The email itself is not copied into the audit log.
  perform private.audit(v_admin, 'web_waitlist_delete', 'web_waitlist', '00000000-0000-0000-0000-000000000000', p_reason,
    jsonb_build_object('id', p_id, 'city', v_city), null);
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- Grants: every admin_* function is callable by signed-in users only; require_admin does the rest.
-- ---------------------------------------------------------------------------------------------
do $$
declare
  f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'admin\_%'
  loop
    execute format('revoke all on function %s from public, anon', f.sig);
    execute format('grant execute on function %s to authenticated', f.sig);
  end loop;
end;
$$;

revoke all on function private.check_catalog(text, text, text, int) from public, anon, authenticated;

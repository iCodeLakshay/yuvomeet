-- Triggers: housekeeping, text screening (S-20), caps (S-27, S-28), membership counts,
-- notifications and push, audit immutability (S-46), unsafe-rating review (SF-4).

-- -----------------------------------------------------------------------------
-- updated_at
-- -----------------------------------------------------------------------------
create function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['profiles', 'profile_photos', 'profile_stats', 'venues', 'plans', 'plan_members'] loop
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',
      t
    );
  end loop;
end;
$$;

-- -----------------------------------------------------------------------------
-- New auth user -> profile row (phone stays in auth.users only, S-5)
-- -----------------------------------------------------------------------------
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  insert into public.profile_stats (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- -----------------------------------------------------------------------------
-- Outbound calls (push, alerts) via pg_net. Endpoints and secrets live in Vault;
-- when they are absent (tests, fresh projects) the call is skipped.
-- -----------------------------------------------------------------------------
create function private.vault_secret(p_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select ds.decrypted_secret from vault.decrypted_secrets ds where ds.name = p_name limit 1;
$$;

create function private.call_function(p_function text, p_body jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text := private.vault_secret('functions_base_url');
  v_secret text := private.vault_secret('internal_secret');
begin
  if v_base is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_base || '/' || p_function,
    body := p_body,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-internal-secret', v_secret)
  );
end;
$$;

-- Ops pages (severe reports, SOS, queue age, cost guard). docs/environments.md.
create function private.alert(p_kind text, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text := private.vault_secret('alert_webhook_url');
begin
  if v_url is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('kind', p_kind, 'payload', p_payload, 'at', now()),
    headers := jsonb_build_object('Content-Type', 'application/json')
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Notifications (in-app list + push). Push copy is generic (S-48).
-- -----------------------------------------------------------------------------
create function private.notify(
  p_user uuid,
  p_category public.notification_category,
  p_kind text,
  p_title text,
  p_body text,
  p_plan uuid default null
)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.notifications (user_id, category, kind, title, body, plan_id)
  values (p_user, p_category, p_kind, p_title, p_body, p_plan);
$$;

create function private.push_notification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.call_function(
    'push',
    jsonb_build_object(
      'user_ids', jsonb_build_array(new.user_id),
      'title', new.title,
      'body', new.body,
      'data', jsonb_build_object('notification_id', new.id, 'plan_id', new.plan_id)
    )
  );
  return new;
end;
$$;

create trigger push_notification
after insert on public.notifications
for each row execute function private.push_notification();

-- -----------------------------------------------------------------------------
-- Text screening (S-20, VR-4, CH-3). Mirrors packages/shared/src/screening.ts.
-- -----------------------------------------------------------------------------
create function private.normalize_digits(p_text text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := translate(p_text, '०१२३४५६७८९', '0123456789');
  w record;
begin
  for w in
    select * from (values
      ('zero', '0'), ('oh', '0'), ('one', '1'), ('ek', '1'), ('two', '2'), ('do', '2'),
      ('three', '3'), ('teen', '3'), ('four', '4'), ('chaar', '4'), ('char', '4'),
      ('five', '5'), ('paanch', '5'), ('panch', '5'), ('six', '6'), ('chhe', '6'), ('che', '6'),
      ('seven', '7'), ('saat', '7'), ('sat', '7'), ('eight', '8'), ('aath', '8'), ('ath', '8'),
      ('nine', '9'), ('nau', '9')
    ) as t (word, digit)
  loop
    v := regexp_replace(v, '\y' || w.word || '\y', w.digit, 'gi');
  end loop;
  return v;
end;
$$;

-- Returns 'allow', 'hold', or 'reject:<reason>'.
create function private.screen_text(p_text text)
returns text
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_norm text;
  v_lower text;
  v_action text;
begin
  if p_text is null or btrim(p_text) = '' then
    return 'allow';
  end if;

  v_norm := private.normalize_digits(p_text);
  if v_norm ~ '(\+?91[[:space:].-]*)?[6-9]([[:space:].-]*[0-9]){9}'
     or v_norm ~ '([0-9][[:space:].-]*){8,}' then
    return 'reject:phone_number';
  end if;

  if p_text ~* '(https?://|www\.|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\y(bit\.ly|t\.me|wa\.me|instagr\.am)\y)' then
    return 'reject:external_link';
  end if;

  if p_text ~* '(@[a-z0-9_.]{2,}|\y(instagram|insta|snapchat|snap[[:space:]]*id|telegram|whatsapp|dm[[:space:]]*me|text[[:space:]]*me[[:space:]]*on)\y)' then
    return 'reject:social_handle';
  end if;

  v_lower := lower(p_text);
  select st.action into v_action
  from private.screen_terms st
  where case
      when st.term ~ '^[a-z0-9 ]+$' then v_lower ~ ('\y' || st.term || '\y')
      else position(lower(st.term) in v_lower) > 0
    end
  order by st.action = 'reject' desc
  limit 1;

  if v_action = 'reject' then
    return 'reject:restricted_term';
  elsif v_action = 'hold' then
    return 'hold';
  end if;
  return 'allow';
end;
$$;

-- Raises a client-readable error for rejected text. Error text is shown in the app.
create function private.raise_screen_rejection(p_result text)
returns void
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = 'P0001',
    message = case split_part(p_result, ':', 2)
      when 'phone_number' then 'Phone numbers can''t be shared here.'
      when 'external_link' then 'Links and email addresses can''t be shared here.'
      when 'social_handle' then 'Social handles can''t be shared here.'
      else 'This text breaks the community rules.'
    end,
    hint = 'SCREEN_REJECTED';
end;
$$;

create function private.enqueue_text_review(p_subject_id uuid, p_user uuid, p_field text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.moderation_queue (subject, subject_id, user_id, severity, ai_verdict, ai_labels, due_at)
  values ('text', p_subject_id, p_user, 'standard', 'review', jsonb_build_array(p_field), now() + interval '24 hours');
$$;

create function private.screen_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result text := private.screen_text(new.body);
begin
  if v_result like 'reject:%' then
    perform private.raise_screen_rejection(v_result);
  elsif v_result = 'hold' then
    new.status := 'held';
    new.flagged := true;
  end if;
  return new;
end;
$$;

create trigger screen_message
before insert on public.messages
for each row execute function private.screen_message();

create function private.queue_held_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_text_review(new.id, new.sender_id, 'message');
  return new;
end;
$$;

create trigger queue_held_message
after insert on public.messages
for each row when (new.status = 'held')
execute function private.queue_held_message();

-- First names reject on any match; bios are held for review.
create function private.screen_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result text;
begin
  if new.first_name is distinct from old.first_name then
    v_result := private.screen_text(new.first_name);
    if v_result <> 'allow' then
      perform private.raise_screen_rejection(case when v_result = 'hold' then 'reject:restricted_term' else v_result end);
    end if;
  end if;

  if new.bio is distinct from old.bio then
    v_result := private.screen_text(new.bio);
    if v_result like 'reject:%' then
      perform private.raise_screen_rejection(v_result);
    end if;
    new.bio_status := case when v_result = 'hold' then 'held' else 'visible' end::public.content_status;
  end if;
  return new;
end;
$$;

create trigger screen_profile
before update of first_name, bio on public.profiles
for each row execute function private.screen_profile();

create function private.queue_held_bio()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.enqueue_text_review(new.id, new.id, 'bio');
  return new;
end;
$$;

create trigger queue_held_bio
after update of bio_status on public.profiles
for each row when (new.bio_status = 'held' and old.bio_status is distinct from 'held')
execute function private.queue_held_bio();

-- Plan titles and descriptions are public to the city: any match rejects.
create function private.screen_plan()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result text := private.screen_text(coalesce(new.title, '') || E'\n' || coalesce(new.description, ''));
begin
  if v_result <> 'allow' then
    perform private.raise_screen_rejection(case when v_result = 'hold' then 'reject:restricted_term' else v_result end);
  end if;
  return new;
end;
$$;

create trigger screen_plan
before insert or update of title, description on public.plans
for each row execute function private.screen_plan();

create function private.screen_join_note()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_result text := private.screen_text(new.note);
begin
  if v_result <> 'allow' then
    perform private.raise_screen_rejection(case when v_result = 'hold' then 'reject:restricted_term' else v_result end);
  end if;
  return new;
end;
$$;

create trigger screen_join_note
before insert or update of note on public.plan_members
for each row when (new.note is not null)
execute function private.screen_join_note();

-- -----------------------------------------------------------------------------
-- Message caps (S-27: 20/day first 7 days; S-28: 30/min everyone)
-- -----------------------------------------------------------------------------
create function private.enforce_message_caps()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_created timestamptz;
  v_minute int;
  v_today int;
begin
  select p.created_at into v_created from public.profiles p where p.id = new.sender_id;

  select count(*) into v_minute
  from public.messages m
  where m.sender_id = new.sender_id and m.created_at >= now() - interval '1 minute';
  if v_minute >= private.setting_int('max_msg_per_min') then
    raise exception using errcode = 'P0001', message = 'You''re sending messages too fast. Wait a moment.', hint = 'RATE_LIMITED';
  end if;

  if v_created >= now() - make_interval(days => private.setting_int('new_account_days')) then
    v_today := private.bump_counter(new.sender_id, 'message_day', private.ist_today());
    if v_today > private.setting_int('new_msg_per_day') then
      raise exception using errcode = 'P0001',
        message = 'New accounts can send 20 messages a day during their first week.',
        hint = 'CAP_REACHED';
    end if;
  end if;
  return new;
end;
$$;

create trigger enforce_message_caps
before insert on public.messages
for each row execute function private.enforce_message_caps();

-- New chat message -> generic push to other members (S-48).
create function private.push_new_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_users jsonb;
begin
  if new.status <> 'visible' or (tg_op = 'UPDATE' and old.status = 'visible') then
    return new;
  end if;
  select pl.title into v_title
  from public.conversations c join public.plans pl on pl.id = c.plan_id
  where c.id = new.conversation_id;

  select coalesce(jsonb_agg(pm.user_id), '[]'::jsonb) into v_users
  from public.conversations c
  join public.plan_members pm on pm.plan_id = c.plan_id
  where c.id = new.conversation_id
    and pm.status in ('approved', 'attended', 'no_show')
    and pm.user_id <> new.sender_id
    and not app.is_blocked_between(pm.user_id, new.sender_id);

  if jsonb_array_length(v_users) > 0 then
    perform private.call_function(
      'push',
      jsonb_build_object(
        'user_ids', v_users,
        'title', 'New message',
        'body', 'New message in ' || coalesce(v_title, 'your plan'),
        'data', jsonb_build_object('conversation_id', new.conversation_id)
      )
    );
  end if;
  return new;
end;
$$;

create trigger push_new_message
after insert or update of status on public.messages
for each row execute function private.push_new_message();

-- -----------------------------------------------------------------------------
-- Membership -> approved_count, open/full (PL-5), and join notifications
-- -----------------------------------------------------------------------------
create function private.sync_plan_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans%rowtype;
  v_count int;
begin
  select * into v_plan from public.plans where id = new.plan_id for update;

  select count(*) into v_count
  from public.plan_members pm
  where pm.plan_id = new.plan_id and pm.status in ('approved', 'attended');

  update public.plans
  set approved_count = v_count,
      status = case
        when status in ('open', 'full') then
          (case when v_count >= capacity then 'full' else 'open' end)::public.plan_status
        else status
      end
  where id = new.plan_id;

  if new.user_id <> v_plan.host_id and new.status is distinct from old.status then
    if new.status = 'requested' then
      perform private.notify(v_plan.host_id, 'approval', 'join_request',
        'New join request', 'Someone wants to join ' || v_plan.title || '.', v_plan.id);
    elsif new.status = 'approved' then
      perform private.notify(new.user_id, 'approval', 'join_approved',
        'You''re in', 'Your request for ' || v_plan.title || ' was approved. The group chat is open.', v_plan.id);
    elsif new.status = 'declined' then
      -- Principle 5: same neutral copy as an expired request, no reason.
      perform private.notify(new.user_id, 'approval', 'join_declined',
        'Request update', 'This plan couldn''t take you this time.', v_plan.id);
    elsif new.status = 'expired' and old.status = 'requested' then
      perform private.notify(new.user_id, 'approval', 'join_expired',
        'Request update', 'This plan couldn''t take you this time.', v_plan.id);
    end if;
  end if;
  return new;
end;
$$;

create trigger sync_plan_membership
after insert or update of status on public.plan_members
for each row execute function private.sync_plan_membership();

-- -----------------------------------------------------------------------------
-- Account-level notifications: verification result, suspension, appeal answer
-- -----------------------------------------------------------------------------
create function private.notify_profile_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.verification_status is distinct from old.verification_status then
    if new.verification_status = 'verified' then
      perform private.notify(new.id, 'account', 'verification_passed',
        'You''re verified', 'Your 18+ verified badge is active. You can join and host plans.');
    elsif new.verification_status = 'manual_review' then
      perform private.notify(new.id, 'account', 'verification_review',
        'Checking by hand', 'We''re checking your photos by hand. Expect a reply within 24 hours.');
    elsif new.verification_status = 'rejected' then
      perform private.notify(new.id, 'account', 'verification_rejected',
        'Verification not completed', 'We couldn''t verify your account. You can appeal from Settings.');
    end if;
  end if;

  if new.status is distinct from old.status and new.status = 'suspended' then
    perform private.notify(new.id, 'safety', 'account_suspended',
      'Account paused', coalesce(new.status_reason, 'Your account is paused while we review reports.'));
  elsif new.status is distinct from old.status and new.status = 'active' and old.status in ('suspended', 'banned') then
    perform private.notify(new.id, 'safety', 'account_restored', 'Account restored', 'Your account is active again.');
  end if;
  return new;
end;
$$;

create trigger notify_profile_change
after update of verification_status, status on public.profiles
for each row execute function private.notify_profile_change();

create function private.notify_appeal_decision()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status <> 'open' and old.status = 'open' then
    perform private.notify(new.user_id, 'account', 'appeal_' || new.status::text,
      case when new.status = 'upheld' then 'Appeal upheld' else 'Appeal answered' end,
      coalesce(new.response, 'Your appeal has been reviewed.'));
  end if;
  return new;
end;
$$;

create trigger notify_appeal_decision
after update of status on public.appeals
for each row execute function private.notify_appeal_decision();

-- -----------------------------------------------------------------------------
-- SF-4: two "felt unsafe" ratings from different raters in 30 days -> severe review
-- -----------------------------------------------------------------------------
create function private.check_unsafe_ratings()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raters int;
begin
  select count(distinct r.rater_id) into v_raters
  from public.ratings r
  where r.ratee_id = new.ratee_id and r.felt_safe = false and r.created_at >= now() - interval '30 days';

  if v_raters >= 2 and not exists (
    select 1 from public.moderation_queue q
    where q.subject = 'rating_review' and q.user_id = new.ratee_id and q.status in ('pending', 'in_review', 'escalated')
  ) then
    insert into public.moderation_queue (subject, subject_id, user_id, severity, due_at)
    values ('rating_review', new.ratee_id, new.ratee_id, 'severe', now() + interval '12 hours');
    perform private.alert('severe_rating_review', jsonb_build_object('user_id', new.ratee_id));
  end if;
  return new;
end;
$$;

create trigger check_unsafe_ratings
after insert on public.ratings
for each row when (new.felt_safe = false)
execute function private.check_unsafe_ratings();

-- -----------------------------------------------------------------------------
-- Server-side analytics events (implementation-plan §Analytics, S-9: ids and enums only)
-- -----------------------------------------------------------------------------
create function private.track(p_event text, p_user uuid, p_props jsonb)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into private.analytics_outbox (event, distinct_id, city_slug, props)
  select p_event, p_user, coalesce(c.slug, 'unknown'), p_props
  from (select 1) one
  left join public.profiles p on p.id = p_user
  left join public.cities c on c.id = p.city_id;
$$;

create function private.track_verification()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_attempt int;
  v_check public.check_type;
begin
  select coalesce(max(attempt), 1) into v_attempt from public.verification_checks where user_id = new.id;
  if new.verification_status = 'verified' then
    perform private.track('verification_passed', new.id,
      jsonb_build_object('attempt', v_attempt, 'manual', old.verification_status = 'manual_review'));
  elsif new.verification_status in ('rejected', 'manual_review', 'blocked_minor') then
    select vc.type into v_check from public.verification_checks vc
    where vc.user_id = new.id and vc.verdict <> 'pass'
    order by vc.created_at desc limit 1;
    perform private.track('verification_failed', new.id, jsonb_build_object(
      'check_type', coalesce(v_check, 'liveness_face'),
      'outcome', case new.verification_status when 'rejected' then 'fail' when 'blocked_minor' then 'minor' else 'review' end));
  end if;
  return new;
end;
$$;

create trigger track_verification
after update of verification_status on public.profiles
for each row when (new.verification_status is distinct from old.verification_status)
execute function private.track_verification();

-- join_approved is fired for the requester, so it counts even when their app is closed.
create function private.track_join_approved()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.track('join_approved', new.user_id, jsonb_build_object(
    'plan_id', new.plan_id,
    'wait_minutes', greatest(0, round(extract(epoch from (coalesce(new.decided_at, now()) - new.requested_at)) / 60))::int));
  return new;
end;
$$;

create trigger track_join_approved
after update of status on public.plan_members
for each row when (old.status = 'requested' and new.status = 'approved')
execute function private.track_join_approved();

-- -----------------------------------------------------------------------------
-- S-46: audit_log is insert-only for every role
-- -----------------------------------------------------------------------------
create function private.prevent_audit_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is insert-only';
end;
$$;

create trigger audit_log_immutable
before update or delete on public.audit_log
for each row execute function private.prevent_audit_log_mutation();

revoke update, delete, truncate on public.audit_log from public, anon, authenticated, service_role;

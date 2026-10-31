-- Friends, profile likes, pair chats, mentions, reactions, and replies.
-- Pair chats stay open until a block or the friendship is removed.
-- Chat text and photos share one gate: a conversation member, an open chat, and not muted.

-- -----------------------------------------------------------------------------
-- Friendships: one row per unordered pair. requester/addressee are who asked.
-- -----------------------------------------------------------------------------
create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  conversation_id uuid null unique references public.conversations (id) on delete set null,
  pair_low uuid generated always as (least(requester_id, addressee_id)) stored not null,
  pair_high uuid generated always as (greatest(requester_id, addressee_id)) stored not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id),
  constraint friendships_one_pair unique (pair_low, pair_high)
);
create index friendships_addressee_idx on public.friendships (addressee_id, status);
create index friendships_conversation_idx on public.friendships (conversation_id);

alter table public.friendships enable row level security;
revoke all on public.friendships from public, anon, authenticated;
grant select on public.friendships to authenticated;
create policy friendships_read on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid() or app.is_admin());

create table public.profile_likes (
  liker_id uuid not null references public.profiles (id) on delete cascade,
  liked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (liker_id, liked_id),
  constraint profile_likes_no_self check (liker_id <> liked_id)
);
create index profile_likes_liked_idx on public.profile_likes (liked_id);

alter table public.profile_likes enable row level security;
revoke all on public.profile_likes from public, anon, authenticated;
grant select on public.profile_likes to authenticated;
create policy profile_likes_read_own on public.profile_likes for select to authenticated
  using (liker_id = auth.uid());

-- -----------------------------------------------------------------------------
-- Messages: quote, one reaction per person, mention receipts
-- -----------------------------------------------------------------------------
alter table public.messages
  add column reply_to uuid null references public.messages (id) on delete set null,
  add constraint messages_reply_not_self check (reply_to is null or reply_to <> id);
grant insert (reply_to) on public.messages to authenticated;

create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  emoji text not null check (char_length(emoji) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
create index message_reactions_conversation_idx on public.message_reactions (conversation_id);

alter table public.message_reactions enable row level security;
revoke all on public.message_reactions from public, anon, authenticated;
grant select on public.message_reactions to authenticated;
create policy message_reactions_read on public.message_reactions for select to authenticated
  using (app.is_conversation_member(auth.uid(), conversation_id));

create table public.message_mentions (
  message_id uuid not null references public.messages (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.message_mentions enable row level security;
revoke all on public.message_mentions from public, anon, authenticated;

alter table public.notifications
  add column actor_id uuid null references public.profiles (id) on delete set null,
  add column conversation_id uuid null references public.conversations (id) on delete cascade;

-- -----------------------------------------------------------------------------
-- Membership: plan members (approved, attended, no-show) or an accepted pair
-- -----------------------------------------------------------------------------
create or replace function app.is_conversation_member(p_uid uuid, p_conversation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.conversations c
    join public.plan_members pm on pm.plan_id = c.plan_id
    where c.id = p_conversation_id
      and c.kind = 'plan'
      and pm.user_id = p_uid
      and pm.status in ('approved', 'attended', 'no_show')
  )
  or exists (
    select 1
    from public.conversations c
    join public.friendships f on f.conversation_id = c.id
    where c.id = p_conversation_id
      and c.kind = 'pair'
      and f.status = 'accepted'
      and (f.requester_id = p_uid or f.addressee_id = p_uid)
  );
$$;

drop policy if exists messages_insert on public.messages;
create policy messages_insert on public.messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and image_path is null
    and app.is_conversation_member(auth.uid(), conversation_id)
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and c.status = 'open'
    )
    and not exists (
      select 1 from public.conversation_mutes cm
      where cm.conversation_id = messages.conversation_id and cm.user_id = auth.uid()
    )
    and (
      reply_to is null
      or exists (
        select 1 from public.messages parent
        where parent.id = messages.reply_to
          and parent.conversation_id = messages.conversation_id
      )
    )
  );

-- Same gate as text: member (including no-show and pair), open chat, not muted.
-- The old verified-only check rejected members who could already read the thread.
create or replace function public.svc_register_upload(
  p_user uuid, p_kind text, p_quarantine_path text, p_position int default null,
  p_conversation_id uuid default null, p_message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if split_part(p_quarantine_path, '/', 1) <> p_user::text then
    raise exception 'Upload path does not belong to the caller';
  end if;

  if p_kind = 'profile' then
    if (select count(*) from public.profile_photos where user_id = p_user) >= 6 then
      raise exception using errcode = 'P0001', message = 'You can add up to 6 photos.', hint = 'MAX_PHOTOS';
    end if;
    insert into public.profile_photos (user_id, quarantine_path, position)
    values (p_user, p_quarantine_path, coalesce(p_position, 0))
    returning id into v_id;
  elsif p_kind = 'chat' then
    if p_conversation_id is null
      or not exists (
        select 1 from public.conversations c
        where c.id = p_conversation_id and c.status = 'open'
      )
      or not app.is_conversation_member(p_user, p_conversation_id)
      or exists (
        select 1 from public.conversation_mutes cm
        where cm.conversation_id = p_conversation_id and cm.user_id = p_user
      )
    then
      raise exception using errcode = 'P0001', message = 'You can''t post in this chat.', hint = 'FORBIDDEN';
    end if;
    -- Held until moderation passes (CH-2: photos pass AI check before delivery).
    insert into public.messages (id, conversation_id, sender_id, image_path, image_status, status)
    values (p_message_id, p_conversation_id, p_user, null, 'pending', 'held')
    returning id into v_id;
  elsif p_kind = 'plan' then
    if not app.is_verified(p_user) then
      raise exception using errcode = 'P0001', message = 'Verify your account to host plans.', hint = 'VERIFY_REQUIRED';
    end if;
    if (select count(*) from public.plan_covers where user_id = p_user and created_at > now() - interval '1 day') >= 10 then
      raise exception using errcode = 'P0001', message = 'You''ve uploaded a lot of banners today. Try again tomorrow.', hint = 'CAP_REACHED';
    end if;
    insert into public.plan_covers (user_id, quarantine_path)
    values (p_user, p_quarantine_path)
    returning id into v_id;
  else
    raise exception 'Unknown upload kind';
  end if;
  return v_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Closing a pair chat
-- -----------------------------------------------------------------------------
create function private.close_pair_chat(p_conversation uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.conversations
  set status = 'closed'
  where id = p_conversation and kind = 'pair';
$$;

create function private.friendship_close_pair()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status = 'accepted' and old.conversation_id is not null then
      perform private.close_pair_chat(old.conversation_id);
    end if;
    return old;
  end if;
  if old.status = 'accepted' and new.status is distinct from 'accepted' and new.conversation_id is not null then
    perform private.close_pair_chat(new.conversation_id);
  end if;
  return new;
end;
$$;

create trigger friendships_close_pair
after update or delete on public.friendships
for each row execute function private.friendship_close_pair();

-- A block closes the pair chat. Removing the last block between two friends reopens it.
create function private.pair_chat_on_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_a uuid;
  v_b uuid;
  v_conversation uuid;
begin
  if tg_op = 'DELETE' then
    v_a := old.blocker_id;
    v_b := old.blocked_id;
  else
    v_a := new.blocker_id;
    v_b := new.blocked_id;
  end if;

  select f.conversation_id into v_conversation
  from public.friendships f
  where f.pair_low = least(v_a, v_b)
    and f.pair_high = greatest(v_a, v_b)
    and f.status = 'accepted';

  if v_conversation is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    perform private.close_pair_chat(v_conversation);
    return new;
  end if;

  if not app.is_blocked_between(v_a, v_b) then
    update public.conversations
    set status = 'open', closes_at = now() + make_interval(years => 100)
    where id = v_conversation and kind = 'pair';
  end if;
  return old;
end;
$$;

create trigger blocks_pair_chat
after insert or delete on public.blocks
for each row execute function private.pair_chat_on_block();

-- -----------------------------------------------------------------------------
-- Friend requests, likes
-- -----------------------------------------------------------------------------
create function public.send_friend_request(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_friend public.friendships;
  v_name text;
begin
  if p_user_id is null or p_user_id = v_uid then
    perform private.fail('Pick a member to add.');
  end if;
  if app.is_blocked_between(v_uid, p_user_id) then
    perform private.fail('You can''t add this member.', 'FORBIDDEN');
  end if;
  if not app.can_view_profile(v_uid, p_user_id) then
    perform private.fail('This member isn''t available.', 'NOT_FOUND');
  end if;

  select * into v_friend
  from public.friendships f
  where f.pair_low = least(v_uid, p_user_id)
    and f.pair_high = greatest(v_uid, p_user_id)
  for update;

  if v_friend.id is not null then
    if v_friend.status = 'accepted' then
      perform private.fail('You are already friends.', 'DUPLICATE');
    elsif v_friend.status = 'pending' and v_friend.requester_id = v_uid then
      perform private.fail('You already sent a friend request.', 'DUPLICATE');
    elsif v_friend.status = 'pending' then
      perform private.fail('This member already sent you a request.', 'DUPLICATE');
    else
      update public.friendships
      set requester_id = v_uid, addressee_id = p_user_id, status = 'pending', updated_at = now()
      where id = v_friend.id;
    end if;
  else
    begin
      insert into public.friendships (requester_id, addressee_id, status)
      values (v_uid, p_user_id, 'pending');
    exception
      when unique_violation then
        perform private.fail('You already sent a friend request.', 'DUPLICATE');
    end;
  end if;

  select p.first_name into v_name from public.profiles p where p.id = v_uid;
  insert into public.notifications (user_id, category, kind, title, body, actor_id)
  values (
    p_user_id,
    'approval',
    'friend_request',
    'Friend request',
    coalesce(v_name, 'Someone') || ' wants to be friends.',
    v_uid
  );
end;
$$;

create function public.respond_friend_request(p_user_id uuid, p_accept boolean)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_friend public.friendships;
  v_conversation uuid;
  v_name text;
begin
  if p_user_id is null or p_user_id = v_uid then
    perform private.fail('This request is no longer pending.', 'NOT_FOUND');
  end if;

  select * into v_friend
  from public.friendships f
  where f.pair_low = least(v_uid, p_user_id)
    and f.pair_high = greatest(v_uid, p_user_id)
  for update;

  if v_friend.id is null or v_friend.status <> 'pending' or v_friend.addressee_id <> v_uid then
    perform private.fail('This request is no longer pending.', 'NOT_FOUND');
  end if;

  if not p_accept then
    update public.friendships set status = 'declined', updated_at = now() where id = v_friend.id;
    return null;
  end if;

  if app.is_blocked_between(v_uid, p_user_id) then
    perform private.fail('You can''t add this member.', 'FORBIDDEN');
  end if;

  v_conversation := v_friend.conversation_id;
  if v_conversation is null then
    insert into public.conversations (kind, plan_id, status, closes_at)
    values ('pair', null, 'open', now() + make_interval(years => 100))
    returning id into v_conversation;
  else
    update public.conversations
    set status = 'open', closes_at = now() + make_interval(years => 100)
    where id = v_conversation and kind = 'pair';
  end if;

  update public.friendships
  set status = 'accepted', conversation_id = v_conversation, updated_at = now()
  where id = v_friend.id;

  select p.first_name into v_name from public.profiles p where p.id = v_uid;
  insert into public.notifications (user_id, category, kind, title, body, actor_id)
  values (
    v_friend.requester_id,
    'approval',
    'friend_accepted',
    'Friend request accepted',
    coalesce(v_name, 'Someone') || ' accepted your friend request.',
    v_uid
  );
  return v_conversation;
end;
$$;

create function public.like_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  if p_user_id is null or p_user_id = v_uid then
    perform private.fail('Pick a member to like.');
  end if;
  if app.is_blocked_between(v_uid, p_user_id) then
    perform private.fail('You can''t like this member.', 'FORBIDDEN');
  end if;
  if not app.can_view_profile(v_uid, p_user_id) then
    perform private.fail('This member isn''t available.', 'NOT_FOUND');
  end if;
  insert into public.profile_likes (liker_id, liked_id)
  values (v_uid, p_user_id)
  on conflict do nothing;
end;
$$;

create function public.unlike_profile(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
begin
  delete from public.profile_likes where liker_id = v_uid and liked_id = p_user_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Reactions and mentions
-- -----------------------------------------------------------------------------
create function public.set_message_reaction(p_message_id uuid, p_emoji text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_conversation uuid;
  v_sender uuid;
  v_current text;
begin
  if p_emoji is null or not (p_emoji = any (array[
    '👍', '❤️', '😂', '😮', '😢', '🙏',
    '🔥', '✨', '🎉', '👏', '💯', '😍', '🥰', '🤔', '😅', '😭', '😡', '🤣',
    '🤝', '🙌', '💪', '👀', '⭐', '💔', '🤗', '😎', '🥲', '👌'
  ]::text[])) then
    perform private.fail('Pick a reaction from the list.');
  end if;

  select m.conversation_id, m.sender_id into v_conversation, v_sender
  from public.messages m
  where m.id = p_message_id;
  if v_conversation is null then
    perform private.fail('Message not found.', 'NOT_FOUND');
  end if;
  if not app.is_conversation_member(v_uid, v_conversation) then
    perform private.fail('You can''t react in this chat.', 'FORBIDDEN');
  end if;
  if v_sender is not null and app.is_blocked_between(v_uid, v_sender) then
    perform private.fail('You can''t react to this message.', 'FORBIDDEN');
  end if;

  select r.emoji into v_current
  from public.message_reactions r
  where r.message_id = p_message_id and r.user_id = v_uid;

  if v_current = p_emoji then
    delete from public.message_reactions where message_id = p_message_id and user_id = v_uid;
    return null;
  end if;

  insert into public.message_reactions (message_id, user_id, conversation_id, emoji)
  values (p_message_id, v_uid, v_conversation, p_emoji)
  on conflict (message_id, user_id) do update
  set emoji = excluded.emoji, created_at = now();
  return p_emoji;
end;
$$;

create function public.notify_mentions(p_message_id uuid, p_user_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := private.require_uid();
  v_msg public.messages;
  v_name text;
  v_user uuid;
begin
  if coalesce(cardinality(p_user_ids), 0) = 0 then
    return;
  end if;
  if cardinality(p_user_ids) > 30 then
    perform private.fail('Mention up to 30 people.');
  end if;

  select * into v_msg from public.messages m where m.id = p_message_id and m.sender_id = v_uid;
  if v_msg.id is null then
    perform private.fail('Message not found.', 'NOT_FOUND');
  end if;
  if not app.is_conversation_member(v_uid, v_msg.conversation_id) then
    perform private.fail('You can''t post in this chat.', 'FORBIDDEN');
  end if;

  select p.first_name into v_name from public.profiles p where p.id = v_uid;

  for v_user in select distinct uid from unnest(p_user_ids) as t(uid)
  loop
    if v_user is null or v_user = v_uid then
      continue;
    end if;
    if not app.is_conversation_member(v_user, v_msg.conversation_id) then
      continue;
    end if;
    if app.is_blocked_between(v_uid, v_user) then
      continue;
    end if;

    insert into public.message_mentions (message_id, user_id)
    values (v_msg.id, v_user)
    on conflict do nothing;
    if not found then
      continue;
    end if;

    insert into public.notifications (user_id, category, kind, title, body, conversation_id, actor_id)
    values (
      v_user,
      'plan',
      'mention',
      'You were mentioned',
      coalesce(v_name, 'Someone') || ' mentioned you.',
      v_msg.conversation_id,
      v_uid
    );
  end loop;
end;
$$;

revoke all on function
  public.send_friend_request(uuid),
  public.respond_friend_request(uuid, boolean),
  public.like_profile(uuid),
  public.unlike_profile(uuid),
  public.set_message_reaction(uuid, text),
  public.notify_mentions(uuid, uuid[])
from public, anon;
grant execute on function
  public.send_friend_request(uuid),
  public.respond_friend_request(uuid, boolean),
  public.like_profile(uuid),
  public.unlike_profile(uuid),
  public.set_message_reaction(uuid, text),
  public.notify_mentions(uuid, uuid[])
to authenticated;

-- -----------------------------------------------------------------------------
-- Chat list includes pair threads. kind is appended so the view can be replaced.
-- -----------------------------------------------------------------------------
create or replace view public.my_chats
with (security_barrier = true)
as
select
  c.id as conversation_id,
  c.plan_id,
  c.status,
  c.closes_at,
  coalesce(pl.title, peer.first_name, 'Chat') as title,
  pl.starts_at,
  pl.approved_count,
  v.name as venue_name,
  coalesce(
    (select vp.path from public.venue_photos vp
     where vp.venue_id = v.id and vp.status = 'approved' order by vp.position limit 1),
    peer.photo_path
  ) as cover_path,
  lm.body as last_body,
  lm.image_path is not null as last_is_photo,
  lm.created_at as last_at,
  lp.first_name as last_sender_name,
  (lm.sender_id = auth.uid()) as last_is_mine,
  c.kind
from public.conversations c
left join public.plans pl on pl.id = c.plan_id
left join public.venues v on v.id = pl.venue_id
left join lateral (
  select p.first_name,
    (select ph.path from public.profile_photos ph
     where ph.user_id = p.id and ph.status = 'approved' and ph.path is not null
     order by ph.position limit 1) as photo_path
  from public.friendships f
  join public.profiles p on p.id = case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end
  where f.conversation_id = c.id and f.status = 'accepted'
) peer on true
left join lateral (
  select m.body, m.image_path, m.created_at, m.sender_id
  from public.messages m
  where m.conversation_id = c.id
    and (m.status = 'visible' or m.sender_id = auth.uid())
    and not app.is_blocked_between(auth.uid(), m.sender_id)
    and not exists (
      select 1 from public.message_hides h
      where h.message_id = m.id and h.user_id = auth.uid()
    )
  order by m.created_at desc
  limit 1
) lm on true
left join public.profiles lp on lp.id = lm.sender_id
where app.is_conversation_member(auth.uid(), c.id);

create view public.pair_members
with (security_barrier = true)
as
select
  f.conversation_id,
  p.id as user_id,
  p.first_name,
  (select ph.path from public.profile_photos ph
   where ph.user_id = p.id and ph.status = 'approved' and ph.path is not null
   order by ph.position limit 1) as photo_path,
  (p.verification_status = 'verified') as is_verified,
  false as is_host
from public.friendships f
join public.profiles p on p.id in (f.requester_id, f.addressee_id)
where f.status = 'accepted'
  and f.conversation_id is not null
  and app.is_conversation_member(auth.uid(), f.conversation_id)
  and not app.is_blocked_between(auth.uid(), p.id);

grant select on public.pair_members to authenticated;

-- Push for a new message reaches plan members and the other person in a pair chat.
create or replace function private.push_new_message()
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

  select coalesce(pl.title, sender.first_name) into v_title
  from public.conversations c
  left join public.plans pl on pl.id = c.plan_id
  left join public.profiles sender on sender.id = new.sender_id
  where c.id = new.conversation_id;

  select coalesce(jsonb_agg(s.user_id), '[]'::jsonb) into v_users
  from (
    select pm.user_id
    from public.conversations c
    join public.plan_members pm on pm.plan_id = c.plan_id
    where c.id = new.conversation_id
      and pm.status in ('approved', 'attended', 'no_show')
      and pm.user_id <> new.sender_id
      and not app.is_blocked_between(pm.user_id, new.sender_id)
    union
    select case when f.requester_id = new.sender_id then f.addressee_id else f.requester_id end as user_id
    from public.friendships f
    where f.conversation_id = new.conversation_id
      and f.status = 'accepted'
  ) s
  where s.user_id is not null
    and s.user_id <> new.sender_id
    and not app.is_blocked_between(s.user_id, new.sender_id);

  if jsonb_array_length(v_users) > 0 then
    perform private.call_function(
      'push',
      jsonb_build_object(
        'user_ids', v_users,
        'title', 'New message',
        'body', 'New message in ' || coalesce(v_title, 'your chat'),
        'data', jsonb_build_object('conversation_id', new.conversation_id)
      )
    );
  end if;
  return new;
end;
$$;

create or replace function private.push_notification()
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
      'data', jsonb_build_object(
        'notification_id', new.id,
        'plan_id', new.plan_id,
        'actor_id', new.actor_id,
        'conversation_id', new.conversation_id
      )
    )
  );
  return new;
end;
$$;

alter publication supabase_realtime add table public.message_reactions;

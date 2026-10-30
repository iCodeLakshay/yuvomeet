-- Let a member type an area or college that is not in the preset lists.
-- A typed college is reused when the same city already has that name, otherwise inserted.
-- A typed area keeps the display name and a non-geographic placeholder cell (area_cell stays private).

drop function if exists public.save_profile(text, public.gender, text, text[], text[], text, text, uuid, boolean, integer);

create function public.save_profile(
  p_first_name text default null,
  p_declared_gender public.gender default null,
  p_bio text default null,
  p_interests text[] default null,
  p_languages text[] default null,
  p_area_name text default null,
  p_area_cell text default null,
  p_college_id uuid default null,
  p_clear_college boolean default false,
  p_age integer default null,
  p_college_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_year smallint;
  v_college uuid;
  v_college_name text := nullif(btrim(p_college_name), '');
  v_screen text;
begin
  if p_first_name is not null and char_length(btrim(p_first_name)) not between 2 and 30 then
    perform private.fail('First name must be 2 to 30 characters.');
  end if;
  if p_bio is not null and char_length(p_bio) > 300 then
    perform private.fail('Bio can be at most 300 characters.');
  end if;
  if p_interests is not null and (
    cardinality(p_interests) > 8
    or exists (select 1 from unnest(p_interests) i where i not in (select slug from public.interests))
  ) then
    perform private.fail('Pick up to 8 interests from the list.');
  end if;
  if p_languages is not null and (
    cardinality(p_languages) = 0 or not (p_languages <@ array['en', 'hi'])
  ) then
    perform private.fail('Pick at least one language.');
  end if;
  if p_area_name is not null and char_length(btrim(p_area_name)) not between 2 and 40 then
    perform private.fail('Area needs 2 to 40 characters.');
  end if;
  if p_area_name is not null then
    v_screen := private.screen_text(p_area_name);
    if v_screen like 'reject:%' then
      perform private.fail('That area name cannot be saved.');
    end if;
  end if;
  if p_area_cell is not null and p_area_cell !~ '^[0-9a-f]{15}$' then
    perform private.fail('Pick your area from the list.');
  end if;
  if v_college_name is not null then
    if char_length(v_college_name) > 80 then
      perform private.fail('College can be at most 80 characters.');
    end if;
    if char_length(v_college_name) < 2 then
      perform private.fail('College needs at least 2 characters.');
    end if;
    v_screen := private.screen_text(v_college_name);
    if v_screen like 'reject:%' then
      perform private.fail('That college name cannot be saved.');
    end if;
    if v_profile.city_id is null then
      perform private.fail('Pick your city first.');
    end if;
    select c.id into v_college
    from public.colleges c
    where c.city_id = v_profile.city_id
      and c.status = 'active'
      and lower(c.name) = lower(v_college_name)
    limit 1;
    if v_college is null then
      insert into public.colleges (city_id, name)
      values (v_profile.city_id, v_college_name)
      returning id into v_college;
    end if;
  elsif p_college_id is not null and not exists (
    select 1 from public.colleges c
    where c.id = p_college_id and c.status = 'active' and c.city_id = v_profile.city_id
  ) then
    perform private.fail('Pick a college from your city.');
  end if;
  if p_declared_gender is not null and v_profile.declared_gender is not null
     and p_declared_gender <> v_profile.declared_gender then
    perform private.fail('Gender can only be changed through support.', 'GENDER_LOCKED');
  end if;
  if p_age is not null and p_age not between 18 and 99 then
    perform private.fail('Yuvomeet is for members 18 and older. Enter an age between 18 and 99.');
  end if;

  if p_age is not null and v_profile.verification_status <> 'verified' then
    v_year := (extract(year from now())::int - p_age)::smallint;
  end if;

  update public.profiles set
    first_name = coalesce(btrim(p_first_name), first_name),
    declared_gender = coalesce(declared_gender, p_declared_gender),
    bio = case when p_bio is null then bio else nullif(btrim(p_bio), '') end,
    interests = coalesce(p_interests, interests),
    languages = coalesce(p_languages, languages),
    area_name = coalesce(nullif(btrim(p_area_name), ''), area_name),
    area_cell = coalesce(p_area_cell, area_cell),
    college_id = case
      when v_college_name is not null then v_college
      when p_clear_college then null
      else coalesce(p_college_id, college_id)
    end,
    birth_year = coalesce(v_year, birth_year)
  where id = v_profile.id;
end;
$$;

revoke execute on function public.save_profile(text, public.gender, text, text[], text[], text, text, uuid, boolean, integer, text)
  from public, anon;
grant execute on function public.save_profile(text, public.gender, text, text[], text[], text, text, uuid, boolean, integer, text)
  to authenticated;

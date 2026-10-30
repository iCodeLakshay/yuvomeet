-- Age at sign-up, shown on the profile instead of the 18–20 / 21–24 / 25–30 band.
--
-- * save_profile takes p_age. It is stored as birth_year (this year minus the age), so the ID check
--   (svc_kyc_apply) keeps overwriting it with the verified value and nothing else had to change.
-- * Once a member is verified their birth year comes from the ID and p_age is ignored.
-- * public_profiles exposes `age` (whole years). Birth year, gender and area cell stay private (S-18);
--   age_band stays for the places that still use it (plan host line, join requests, reports).
--
-- Rollback: recreate save_profile from 20261026000005_rpcs.sql and drop the `age` column by
-- re-creating public_profiles from 20261026000003_rls_views.sql.

drop function if exists public.save_profile(text, public.gender, text, text[], text[], text, text, uuid, boolean);

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
  p_age integer default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile public.profiles := private.current_profile();
  v_year smallint;
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
  if p_area_cell is not null and p_area_cell !~ '^[0-9a-f]{15}$' then
    perform private.fail('Pick your area from the list.');
  end if;
  if p_college_id is not null and not exists (
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
    area_name = coalesce(p_area_name, area_name),
    area_cell = coalesce(p_area_cell, area_cell),
    college_id = case when p_clear_college then null else coalesce(p_college_id, college_id) end,
    birth_year = coalesce(v_year, birth_year)
  where id = v_profile.id;
end;
$$;

revoke execute on function public.save_profile(text, public.gender, text, text[], text[], text, text, uuid, boolean, integer)
  from public, anon;
grant execute on function public.save_profile(text, public.gender, text, text[], text[], text, text, uuid, boolean, integer)
  to authenticated;

-- `age` is appended last: create or replace view can only add columns at the end.
create or replace view public.public_profiles
with (security_barrier = true)
as
select
  p.id,
  p.first_name,
  app.age_band(p.birth_year) as age_band,
  (p.verification_status = 'verified') as is_verified,
  case when p.bio_status = 'visible' then p.bio end as bio,
  p.interests,
  p.languages,
  p.area_name,
  c.name as college_name,
  coalesce(
    (select array_agg(ph.path order by ph.position)
     from public.profile_photos ph
     where ph.user_id = p.id and ph.status = 'approved' and ph.path is not null),
    '{}'
  ) as photo_paths,
  coalesce(ps.plans_attended, 0) as plans_attended,
  coalesce(ps.plans_hosted, 0) as plans_hosted,
  case
    when coalesce(ps.plans_attended, 0) + coalesce(ps.plans_no_show, 0) >= 3
    then round(ps.plans_attended::numeric * 100 / (ps.plans_attended + ps.plans_no_show))::int
  end as show_up_rate,
  case when p.birth_year is not null then extract(year from now())::int - p.birth_year end as age
from public.profiles p
left join public.colleges c on c.id = p.college_id
left join public.profile_stats ps on ps.user_id = p.id
where app.can_view_profile(auth.uid(), p.id);

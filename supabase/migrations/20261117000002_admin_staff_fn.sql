-- Replace the admin_staff view with a function. The view joined auth.users, which the Supabase linter
-- reports as "Exposed Auth Users" for any view in an API schema, even one gated to admins. A function
-- returns the same columns, refuses anyone who is not a full admin (with an error, not an empty set),
-- and keeps auth.users out of every exposed relation.

drop view if exists public.admin_staff;

create function public.admin_list_staff()
returns table (
  user_id uuid,
  email text,
  role text,
  granted_by uuid,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  first_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform private.require_admin(true);
  return query
    select ar.user_id, u.email::text, ar.role::text, ar.granted_by, ar.created_at, u.last_sign_in_at, p.first_name::text
    from private.admin_roles ar
    join auth.users u on u.id = ar.user_id
    left join public.profiles p on p.id = ar.user_id
    order by ar.created_at;
end;
$$;

revoke all on function public.admin_list_staff() from public, anon;
grant execute on function public.admin_list_staff() to authenticated;

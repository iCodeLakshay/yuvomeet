# Yuvomeet admin console

Next.js App Router console for reviewers and admins (AD-1 to AD-4, VR-6). Deployed on Vercel in `bom1`.

## How access works

- Sign-in is email and password, then a TOTP code (`/mfa`). The first sign-in enrols the authenticator. Admin RLS only accepts `aal2` sessions (S-44).
- The `app_role` claim (`reviewer` or `admin`) comes from the `custom_access_token` hook reading `private.admin_roles` (S-43). Grant the first admin once from SQL:

  ```sql
  insert into private.admin_roles (user_id, role) values ('<auth user id>', 'admin');
  ```

  After that, admins grant roles from `/users/[id]`.
- Every page runs on the admin's own session. Every action calls one `admin_*` RPC that checks the role and writes `audit_log` in the same transaction (S-45). The console holds no service role key.
- Reviewers: queue, appeals, user lookup, suspend, plan and chat moderation. Admins also ban, restore, change gender and roles, and manage venues and cities.

## Run locally

```bash
cp .env.example .env.local      # fill NEXT_PUBLIC_SUPABASE_ANON_KEY from `supabase status`
pnpm --filter @yuvomeet/admin dev
```

Create an admin user in local Studio (Authentication → Add user, email + password), then grant the role with the SQL above.

## Notes

- Media is shown through 5-minute signed URLs under the same storage RLS as the app.
- Phone numbers are never shown (S-6). Verification shows scores and reason codes only (S-47).
- Pages send `no-store`, `X-Frame-Options: DENY` and `noindex`.

# KIITEC Hotspot — Database Export & Migration Guide

This bundle is a **complete copy** of your live database (schema + data) so you can
recreate it in a Supabase project you fully own.

## What's important to understand first
Your current app runs on **Lovable Cloud**, which *is* a managed Supabase database
under the hood. It cannot be detached and handed over as-is — but everything in it
is exported here, and these files reproduce it 1:1 in any Supabase project.

## Files
- `schema.sql` — all tables, enums, functions, triggers, RLS policies and grants
  (built from every migration in the project).
- `data.sql` — all rows as `INSERT` statements, in foreign-key-safe order.
- `*.csv` — one CSV per table (for Table Editor import or spreadsheets).

## Row counts
| Table | Rows |
|-------|------|
| profiles | 5 |
| user_roles | 3 |
| packages | 3 |
| voucher_batches | 1 |
| vouchers | 2 |
| router_settings | 1 |
| router_commands | 6 |
| router_heartbeats | 840 |
| hotspot_sessions | 5 |

## Import steps (your own Supabase project)
1. Create a new project at supabase.com.
2. Open **SQL Editor** → paste & run `schema.sql`. This builds the structure.
3. **Recreate the staff auth users** (see caveat below) so their IDs match.
4. SQL Editor → paste & run `data.sql`. It disables triggers/FK checks during load
   and re-enables them at the end.
5. Point the app at the new project: set `VITE_SUPABASE_URL`,
   `VITE_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
   and `SUPABASE_SERVICE_ROLE_KEY` to the new project's values.

## ⚠️ Auth users caveat
`profiles.id` and `user_roles.user_id` point to Supabase's internal `auth.users`
table (the login accounts). Auth accounts can't be exported with plain SQL because
passwords are hashed in the protected `auth` schema. Two options:

- **Match IDs:** In the new project, create each staff account via the Auth Admin API
  with the **same UUID** shown in `data.sql` (e.g. admin `204ac79e-...`). Then
  `data.sql` loads cleanly.
- **Fresh accounts:** Have staff sign up again, then update `profiles.id` /
  `user_roles.user_id` to the new auth IDs, or just keep the new IDs and skip the
  old profile/user_roles rows.

The `handle_new_user` trigger in `schema.sql` auto-creates a profile + role on signup,
so fresh signups largely self-populate; you mainly need to re-import operational data
(packages, vouchers, router data).

Applying the new voucher/package migrations

This repo added a migration file:

  supabase/migrations/20260619000000_add_package_period_mode_and_defaults.sql

It defines an enum `package_period_mode` and adds `period_mode` to `packages` with default `rolling`.

Apply via Supabase CLI (recommended):

1. Install Supabase CLI: https://supabase.com/docs/guides/cli
2. Login and point to your project, or run from a directory with `supabase` config.
3. Run:

```bash
supabase db push
```

or to run a single SQL file directly using `psql`:

```bash
# Grab your DB connection string from Supabase dashboard
export DATABASE_URL="postgres://..."
psql "$DATABASE_URL" -f supabase/migrations/20260619000000_add_package_period_mode_and_defaults.sql
```

Notes:
- Ensure you have a DB backup before running migrations on production.
- After applying, restart your dev server if necessary.

Simulating active sessions (local dev):

1. Start your app locally: `npm run dev`
2. In another terminal, trigger the activation processing:

```bash
node scripts/simulate_active_sessions.js http://localhost:5173/api/mikrotik/active-sessions
```

3. Check your `vouchers` table in Supabase to see `activated_at` and `expires_at` changes.

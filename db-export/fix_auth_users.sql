-- ============================================================================
-- KIITEC — FIX: "500 Internal Server Error" on sign-in / sign-up
-- ============================================================================
-- Run this ONCE in your NEW Supabase project's SQL Editor.
--
-- WHY: When auth users are inserted directly with SQL (create_auth_users.sql),
-- the token columns (confirmation_token, recovery_token, email_change, ...)
-- default to NULL. Supabase Auth (GoTrue) scans those columns into non-nullable
-- Go strings during login, and a NULL value makes the request crash with a
-- 500 Internal Server Error on /auth/v1/token?grant_type=password.
--
-- The fix: replace every NULL token value with an empty string ''.
-- This is safe to run multiple times.
-- ============================================================================

UPDATE auth.users
SET
  confirmation_token       = COALESCE(confirmation_token, ''),
  recovery_token           = COALESCE(recovery_token, ''),
  email_change             = COALESCE(email_change, ''),
  email_change_token_new   = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  phone_change             = COALESCE(phone_change, ''),
  phone_change_token       = COALESCE(phone_change_token, ''),
  reauthentication_token   = COALESCE(reauthentication_token, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL
   OR phone_change IS NULL
   OR phone_change_token IS NULL
   OR reauthentication_token IS NULL;

-- After running this, sign in with any seeded account, e.g.:
--   email:    admin@kiitec.ac.tz
--   password: ChangeMe123!
-- Then change the password immediately.

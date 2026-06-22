-- ============================================================================
-- KIITEC — Recreate login accounts with the SAME user IDs as the old project
-- ============================================================================
-- Run this in your NEW Supabase project's SQL Editor *before* data.sql.
-- It creates the 5 staff logins with the exact UUIDs your data references,
-- so profiles / user_roles / vouchers all link up perfectly.
--
-- Every account below is created with the SAME temporary password:
--     ChangeMe123!
-- Each person should log in once and change it (or use "Forgot password").
-- ============================================================================

-- IMPORTANT: schema.sql adds an AFTER INSERT trigger on auth.users
-- (on_auth_user_created -> handle_new_user) that auto-creates profiles +
-- user_roles. We disable triggers for this session so those rows are NOT
-- auto-generated here; the real rows are loaded later by data.sql.
SET session_replication_role = replica;

-- Helper: insert one confirmed email/password user with a fixed id.
DO $$
DECLARE
  temp_password text := 'ChangeMe123!';
  staff record;
BEGIN
  FOR staff IN
    SELECT * FROM (VALUES
      ('204ac79e-2a12-4194-8f4f-429675f42b6a'::uuid, 'admin@kiitec.ac.tz',          'KIITEC Admin'),
      ('6df789e2-9382-4f92-8e75-41806c9d1629'::uuid, 'jacksonwambali0@gmail.com',   'Wambali Jackson'),
      ('515eddd6-e3f6-4ee7-9ea7-c0d2bf778488'::uuid, 'jacksonnavigator7@gmail.com', 'Jackson'),
      ('dd9e882e-4540-4695-93df-6ea5517b8d5e'::uuid, 'jacksonnavigator19@gmail.com','Jackson Wambali'),
      ('52acb17d-7a35-4cd0-b686-cc759432b6eb'::uuid, 'test@kiitec.ac.tz',           'Test Admin')
    ) AS t(id, email, full_name)
  LOOP
    -- Skip if this user already exists
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = staff.id) THEN
      CONTINUE;
    END IF;

    INSERT INTO auth.users (
      instance_id, id, aud, role, email,
      encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at,
      -- Token columns MUST be '' (empty string), NOT NULL. Supabase Auth
      -- (GoTrue) scans them into non-nullable strings during sign-in, and a
      -- NULL value crashes login with a 500 Internal Server Error.
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      staff.id,
      'authenticated',
      'authenticated',
      staff.email,
      crypt(temp_password, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      jsonb_build_object('full_name', staff.full_name),
      now(),
      now(),
      '', '', '',
      '', '',
      '', '', ''
    );

    -- Identity row (required for email/password login on newer Supabase)
    INSERT INTO auth.identities (
      id, user_id, identity_data, provider, provider_id,
      last_sign_in_at, created_at, updated_at
    ) VALUES (
      gen_random_uuid(),
      staff.id,
      jsonb_build_object('sub', staff.id::text, 'email', staff.email),
      'email',
      staff.id::text,
      now(), now(), now()
    );
  END LOOP;
END $$;

-- Re-enable triggers for normal operation.
SET session_replication_role = origin;


-- NOTE: The handle_new_user() trigger in schema.sql auto-creates profiles +
-- user_roles for NEW signups. Because we insert directly into auth.users here,
-- that trigger does NOT fire, so data.sql can load the original profile/role
-- rows cleanly without conflicts. Run order: schema.sql -> this file -> data.sql

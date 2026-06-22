-- KIITEC Hotspot Management — full schema export
-- Run this on a fresh Supabase project (SQL editor) BEFORE importing data.
-- Generated Sat Jun 20 14:15:06 UTC 2026

-- ===== migration: 20260615094140_214a8788-e13d-43b9-bc08-75ef7a428b5e.sql =====
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'cashier', 'technician');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (roles MUST be separate from profiles)
CREATE TABLE public.user_roles (
  id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer role check (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile + bootstrap role on signup.
-- The very first registered user becomes admin; subsequent users default to cashier.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assigned_role public.app_role;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.email
  );

  IF NOT EXISTS (SELECT 1 FROM public.user_roles) THEN
    assigned_role := 'admin';
  ELSE
    assigned_role := 'cashier';
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, assigned_role);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
ON public.profiles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
-- ===== migration: 20260615094232_9cb02328-c561-40bb-99b5-8f1dd8528c22.sql =====
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, public.app_role) FROM PUBLIC, anon;
-- ===== migration: 20260615095709_000483e5-cc0c-40da-9e28-3483f2ec003d.sql =====
-- Voucher lifecycle status
CREATE TYPE public.voucher_status AS ENUM ('unused', 'sold', 'active', 'used', 'expired', 'disabled');

-- Helper: is the current user admin or cashier (staff who manage sales)
CREATE OR REPLACE FUNCTION public.is_sales_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin') OR public.has_role(_user_id, 'cashier')
$$;

-- ============ PACKAGES ============
CREATE TABLE public.packages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  duration_minutes integer NOT NULL DEFAULT 1440,
  speed_down_kbps integer,
  speed_up_kbps integer,
  data_limit_mb integer,
  device_limit integer NOT NULL DEFAULT 1,
  mikrotik_profile text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view packages" ON public.packages
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales staff can create packages" ON public.packages
  FOR INSERT TO authenticated WITH CHECK (public.is_sales_staff(auth.uid()));
CREATE POLICY "Sales staff can update packages" ON public.packages
  FOR UPDATE TO authenticated USING (public.is_sales_staff(auth.uid())) WITH CHECK (public.is_sales_staff(auth.uid()));
CREATE POLICY "Admins can delete packages" ON public.packages
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ VOUCHER BATCHES ============
CREATE TABLE public.voucher_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 0,
  prefix text,
  note text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.voucher_batches TO authenticated;
GRANT ALL ON public.voucher_batches TO service_role;
ALTER TABLE public.voucher_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view batches" ON public.voucher_batches
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales staff can create batches" ON public.voucher_batches
  FOR INSERT TO authenticated WITH CHECK (public.is_sales_staff(auth.uid()));
CREATE POLICY "Admins can delete batches" ON public.voucher_batches
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- ============ VOUCHERS ============
CREATE TABLE public.vouchers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code text NOT NULL UNIQUE,
  username text NOT NULL,
  password text NOT NULL,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  batch_id uuid REFERENCES public.voucher_batches(id) ON DELETE SET NULL,
  status public.voucher_status NOT NULL DEFAULT 'unused',
  price numeric(12,2) NOT NULL DEFAULT 0,
  sold_at timestamptz,
  sold_by uuid,
  buyer_name text,
  buyer_phone text,
  activated_at timestamptz,
  expires_at timestamptz,
  used_data_mb integer NOT NULL DEFAULT 0,
  bound_mac text,
  comment text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.vouchers TO authenticated;
GRANT ALL ON public.vouchers TO service_role;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view vouchers" ON public.vouchers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Sales staff can create vouchers" ON public.vouchers
  FOR INSERT TO authenticated WITH CHECK (public.is_sales_staff(auth.uid()));
CREATE POLICY "Sales staff can update vouchers" ON public.vouchers
  FOR UPDATE TO authenticated USING (public.is_sales_staff(auth.uid())) WITH CHECK (public.is_sales_staff(auth.uid()));
CREATE POLICY "Admins can delete vouchers" ON public.vouchers
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_vouchers_status ON public.vouchers(status);
CREATE INDEX idx_vouchers_package ON public.vouchers(package_id);
CREATE INDEX idx_vouchers_batch ON public.vouchers(batch_id);
CREATE INDEX idx_vouchers_created_at ON public.vouchers(created_at);

-- updated_at triggers
CREATE TRIGGER update_packages_updated_at BEFORE UPDATE ON public.packages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_voucher_batches_updated_at BEFORE UPDATE ON public.voucher_batches
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vouchers_updated_at BEFORE UPDATE ON public.vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- ===== migration: 20260615095737_b4f10156-a6b1-4049-834f-dbb54414bae5.sql =====
REVOKE EXECUTE ON FUNCTION public.is_sales_staff(uuid) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.is_sales_staff(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
-- ===== migration: 20260616051322_aeb5a8a0-9cc0-4fe8-9294-e1aedc10f844.sql =====
-- ============ MikroTik integration: control-plane schema ============
-- The cloud app cannot reach the RB951 directly. A connector agent running on
-- the user's Ubuntu VPS (behind WireGuard) pushes telemetry and pulls commands
-- using a connector token. Dashboard users read via RLS; the connector uses the
-- service role through a public API route (bypasses RLS, token-verified).

-- ---------- Enums ----------
CREATE TYPE public.command_status AS ENUM ('pending', 'sent', 'done', 'failed');
CREATE TYPE public.command_type AS ENUM ('disconnect_session', 'disable_user', 'sync_voucher', 'reboot', 'custom');

-- ---------- Router settings (singleton config) ----------
CREATE TABLE public.router_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'KIITEC RB951',
  host text,
  api_port integer NOT NULL DEFAULT 8728,
  api_use_tls boolean NOT NULL DEFAULT false,
  identity text,
  wireguard_endpoint text,
  wireguard_peer_public_key text,
  connector_token_hash text,
  connector_token_hint text,
  last_seen_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.router_settings TO authenticated;
GRANT ALL ON public.router_settings TO service_role;
ALTER TABLE public.router_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view router settings" ON public.router_settings
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'cashier'));
CREATE POLICY "Admins and technicians manage router settings" ON public.router_settings
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician'));

-- ---------- Router heartbeats (health snapshots) ----------
CREATE TABLE public.router_heartbeats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  board_name text,
  os_version text,
  uptime text,
  cpu_load integer,
  free_memory_bytes bigint,
  total_memory_bytes bigint,
  free_hdd_bytes bigint,
  total_hdd_bytes bigint,
  hotspot_active_users integer,
  wireguard_connected boolean,
  recorded_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.router_heartbeats TO authenticated;
GRANT ALL ON public.router_heartbeats TO service_role;
ALTER TABLE public.router_heartbeats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view heartbeats" ON public.router_heartbeats
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'cashier'));
CREATE INDEX idx_router_heartbeats_recorded_at ON public.router_heartbeats (recorded_at DESC);

-- ---------- Hotspot sessions (synced from router) ----------
CREATE TABLE public.hotspot_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_key text NOT NULL UNIQUE,
  username text,
  ip_address text,
  mac_address text,
  login_at timestamptz,
  uptime_seconds bigint,
  bytes_in bigint NOT NULL DEFAULT 0,
  bytes_out bigint NOT NULL DEFAULT 0,
  voucher_id uuid REFERENCES public.vouchers(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.hotspot_sessions TO authenticated;
GRANT ALL ON public.hotspot_sessions TO service_role;
ALTER TABLE public.hotspot_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view sessions" ON public.hotspot_sessions
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'cashier'));
CREATE INDEX idx_hotspot_sessions_active ON public.hotspot_sessions (is_active, last_synced_at DESC);

-- ---------- Router commands (queue from dashboard to connector) ----------
CREATE TABLE public.router_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.command_type NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.command_status NOT NULL DEFAULT 'pending',
  result text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.router_commands TO authenticated;
GRANT ALL ON public.router_commands TO service_role;
ALTER TABLE public.router_commands ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view commands" ON public.router_commands
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'cashier'));
CREATE POLICY "Admins and technicians create commands" ON public.router_commands
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician'));
CREATE POLICY "Admins and technicians delete commands" ON public.router_commands
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'technician'));
CREATE INDEX idx_router_commands_status ON public.router_commands (status, created_at);

-- ---------- updated_at trigger for router_settings ----------
CREATE TRIGGER update_router_settings_updated_at
  BEFORE UPDATE ON public.router_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- Seed the singleton settings row ----------
INSERT INTO public.router_settings (name, api_port) VALUES ('KIITEC RB951', 8728);
-- ===== migration: 20260617212102_cfbd91d8-89f1-4046-a485-b354d1c4e856.sql =====
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voucher_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vouchers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hotspot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.router_commands ENABLE ROW LEVEL SECURITY;
-- ===== migration: 20260619000000_add_package_period_mode_and_defaults.sql =====
-- Add period_mode enum for packages and default to rolling
CREATE TYPE public.package_period_mode AS ENUM ('rolling', 'calendar_day', 'calendar_week', 'calendar_month');

ALTER TABLE public.packages
  ADD COLUMN period_mode public.package_period_mode NOT NULL DEFAULT 'rolling';

GRANT SELECT, UPDATE ON public.packages TO authenticated;

-- Note: existing vouchers use 'activated_at' and 'expires_at' columns; we will set expires_at when first seen in active sessions.

-- ===== migration: 20260620115705_99959a11-63c6-4630-97bb-ff7b379bab33.sql =====
-- Remove public read access that exposes staff emails and voucher credentials
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read vouchers" ON public.vouchers;

-- Lock down trigger-only SECURITY DEFINER functions so signed-in users cannot call them directly.
-- (has_role / is_sales_staff are intentionally kept executable because RLS policies invoke them.)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
-- ===== migration: 20260620115810_36127610-e2e8-4156-9b7d-d9d2ae88312d.sql =====
ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS period_mode text NOT NULL DEFAULT 'rolling';

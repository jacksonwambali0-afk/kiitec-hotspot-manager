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
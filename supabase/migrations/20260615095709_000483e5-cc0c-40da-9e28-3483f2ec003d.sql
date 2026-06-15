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
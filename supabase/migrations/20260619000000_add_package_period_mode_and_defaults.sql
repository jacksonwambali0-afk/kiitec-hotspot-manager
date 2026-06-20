-- Add period_mode enum for packages and default to rolling
CREATE TYPE public.package_period_mode AS ENUM ('rolling', 'calendar_day', 'calendar_week', 'calendar_month');

ALTER TABLE public.packages
  ADD COLUMN period_mode public.package_period_mode NOT NULL DEFAULT 'rolling';

GRANT SELECT, UPDATE ON public.packages TO authenticated;

-- Note: existing vouchers use 'activated_at' and 'expires_at' columns; we will set expires_at when first seen in active sessions.

ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS period_mode text NOT NULL DEFAULT 'rolling';
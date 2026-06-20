-- Remove public read access that exposes staff emails and voucher credentials
DROP POLICY IF EXISTS "Allow public read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow public read vouchers" ON public.vouchers;

-- Lock down trigger-only SECURITY DEFINER functions so signed-in users cannot call them directly.
-- (has_role / is_sales_staff are intentionally kept executable because RLS policies invoke them.)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
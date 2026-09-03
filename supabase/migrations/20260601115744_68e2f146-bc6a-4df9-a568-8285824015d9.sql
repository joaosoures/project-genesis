-- Set search_path and ensure SECURITY DEFINER function is not executable by PUBLIC
ALTER FUNCTION public.get_daily_progress(UUID) SET search_path = public;
REVOKE EXECUTE ON FUNCTION public.get_daily_progress(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_progress(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_progress(UUID) TO service_role;
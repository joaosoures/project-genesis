-- 1. Revoke execute from public/anon for sensitive security definer functions with correct signatures
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_premium(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_subscriber(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.can_use_feature(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_ia_limit() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_referral_code() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_daily_progress(uuid) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.sync_data_congelamento() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_settings() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_users() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.daily_subscription_maintenance() FROM PUBLIC;

-- 2. Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscriber(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_use_feature(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_ia_limit() TO authenticated;
GRANT EXECUTE ON FUNCTION public.gen_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_referral_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_progress(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.sync_data_congelamento() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.daily_subscription_maintenance() TO authenticated;

-- 3. Service role should also have access
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

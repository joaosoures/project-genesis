-- Corrigir políticas que consultavam user_roles diretamente e podiam causar recursão
DROP POLICY IF EXISTS "Admins can manage api keys" ON public.api_keys_pool;
DROP POLICY IF EXISTS "api_keys_pool_admin_manage" ON public.api_keys_pool;
CREATE POLICY "api_keys_pool_admin_manage"
ON public.api_keys_pool
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can do everything on faturamento" ON public.faturamento;
DROP POLICY IF EXISTS "faturamento_admin_all" ON public.faturamento;
CREATE POLICY "faturamento_admin_all"
ON public.faturamento
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update_all" ON public.profiles;
CREATE POLICY "profiles_admin_update_all"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Garantir que as visualizações administrativas respeitem RLS do usuário conectado
ALTER VIEW public.admin_users_view SET (security_invoker = true);
ALTER VIEW public.indicacoes_safe SET (security_invoker = true);

-- Corrigir search_path de funções com aviso de segurança
ALTER FUNCTION public.increment_key_error(uuid, text) SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- Remover execução pública/anon de funções SECURITY DEFINER
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_user_plan(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.can_use_feature(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_premium(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_subscriber(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_daily_progress(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_subscription(uuid, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.toggle_user_ban(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reset_user_data(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.extend_trial(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_key_error(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_expired_users() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.daily_subscription_maintenance() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.check_ia_limit() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.gen_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_settings() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_referral_code() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_data_congelamento() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;

-- Conceder explicitamente apenas o necessário
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_plan(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_use_feature(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_premium(uuid, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_subscriber(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_daily_progress(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_role(uuid, public.app_role) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_subscription(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.toggle_user_ban(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_user_data(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.extend_trial(uuid, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.increment_key_error(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.cleanup_expired_users() TO service_role;
GRANT EXECUTE ON FUNCTION public.daily_subscription_maintenance() TO service_role;
GRANT EXECUTE ON FUNCTION public.check_ia_limit() TO service_role;
GRANT EXECUTE ON FUNCTION public.gen_referral_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user_settings() TO service_role;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_referral_code() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_data_congelamento() TO service_role;
GRANT EXECUTE ON FUNCTION public.set_updated_at() TO service_role;

-- Mover extensão que suporta SET SCHEMA para o schema técnico de extensões
CREATE SCHEMA IF NOT EXISTS extensions;
ALTER EXTENSION pg_trgm SET SCHEMA extensions;
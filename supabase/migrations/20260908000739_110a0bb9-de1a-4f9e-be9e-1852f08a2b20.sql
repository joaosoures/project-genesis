DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
DROP TRIGGER IF EXISTS trg_sync_data_congelamento ON public.assinaturas;
DROP TRIGGER IF EXISTS tr_check_ia_limit ON public.geracoes_ia;
DROP TRIGGER IF EXISTS trg_set_referral_code ON public.profiles;

CREATE OR REPLACE FUNCTION public.tmp_import_exec(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  EXECUTE query;
END;
$$;

REVOKE ALL ON FUNCTION public.tmp_import_exec(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.tmp_import_exec(text) FROM anon;
REVOKE ALL ON FUNCTION public.tmp_import_exec(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.tmp_import_exec(text) TO service_role;
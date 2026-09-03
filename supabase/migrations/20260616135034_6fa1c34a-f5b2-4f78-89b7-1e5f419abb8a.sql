CREATE OR REPLACE FUNCTION public.reset_my_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN
    BEGIN
      v_user := (current_setting('request.jwt.claims', true)::jsonb ->> 'sub')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_user := NULL;
    END;
  END IF;

  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Sessão expirada. Faça login novamente para excluir seus dados.'
      USING ERRCODE = '28000';
  END IF;

  DELETE FROM public.cards_pendentes_revisao WHERE usuario_id = v_user;
  DELETE FROM public.desempenho_cards WHERE usuario_id = v_user;
  DELETE FROM public.favoritos WHERE usuario_id = v_user;
  DELETE FROM public.historico_estudo WHERE usuario_id = v_user;
  DELETE FROM public.material_highlights WHERE user_id = v_user;
  DELETE FROM public.material_notes WHERE user_id = v_user;
  DELETE FROM public.user_excluded_cards WHERE user_id = v_user;
  DELETE FROM public.user_ia_usage WHERE usuario_id = v_user;
  DELETE FROM public.user_settings WHERE usuario_id = v_user;
  DELETE FROM public.temp_oqs WHERE user_id = v_user;
  DELETE FROM public.simulado_respostas_aluno WHERE usuario_id = v_user;
  DELETE FROM public.simulado_tentativas WHERE usuario_id = v_user;
  DELETE FROM public.cards
    WHERE criado_por_usuario_id = v_user AND origem = 'usuario';
END;
$function$;

GRANT EXECUTE ON FUNCTION public.reset_my_data() TO authenticated;
REVOKE EXECUTE ON FUNCTION public.reset_my_data() FROM anon, public;
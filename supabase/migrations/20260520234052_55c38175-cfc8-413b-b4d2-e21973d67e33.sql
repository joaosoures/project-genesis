
-- 1. Profiles: onboarding
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS onboarding_skipped boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS objetivo_principal text,
  ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- 2. Assinaturas: lifecycle de congelamento
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS data_congelamento timestamptz,
  ADD COLUMN IF NOT EXISTS aviso_pre_exclusao_enviado_em timestamptz,
  ADD COLUMN IF NOT EXISTS email_trial_enviado_em timestamptz,
  ADD COLUMN IF NOT EXISTS email_congelamento_enviado_em timestamptz;

-- 3. get_user_plan: retorna 'congelado' quando inativo
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_plano text; v_status text; v_fim_trial timestamptz;
  v_inad timestamptz; v_cancel_eop boolean; v_prox timestamptz;
  v_congel timestamptz;
BEGIN
  SELECT plano, status, data_fim_trial, data_inadimplencia, cancel_at_period_end, proxima_renovacao, data_congelamento
    INTO v_plano, v_status, v_fim_trial, v_inad, v_cancel_eop, v_prox, v_congel
  FROM public.assinaturas WHERE usuario_id = _user_id;

  IF v_plano IS NULL THEN RETURN 'congelado'; END IF;

  -- Trial expirado vira congelado
  IF v_plano = 'trial' AND v_fim_trial < now() THEN RETURN 'congelado'; END IF;

  -- Cancelado mas ainda dentro do período pago: mantém acesso
  IF v_status = 'cancelado' AND v_prox IS NOT NULL AND v_prox > now() THEN
    RETURN v_plano;
  END IF;

  -- Inadimplente OU já congelado explicitamente
  IF v_status IN ('inadimplente','cancelado','expirado') OR v_congel IS NOT NULL THEN
    RETURN 'congelado';
  END IF;

  RETURN v_plano;
END; $function$;

-- 4. can_use_feature: congelado bloqueia tudo exceto visualização básica
CREATE OR REPLACE FUNCTION public.can_use_feature(_user_id uuid, _feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE p text;
BEGIN
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;
  p := public.get_user_plan(_user_id);
  RETURN CASE _feature
    WHEN 'estudo_geral'        THEN p IN ('trial','ouro','prata')
    WHEN 'metricas_basicas'    THEN p IN ('trial','ouro','prata')
    WHEN 'metricas_avancadas'  THEN p IN ('trial','ouro','prata')
    WHEN 'estudo_focado'       THEN p IN ('trial','ouro','prata')
    WHEN 'gerar_oq_planilha'   THEN p IN ('trial','ouro','prata')
    WHEN 'gerar_oq_ia'         THEN p IN ('trial','ouro','prata')
    WHEN 'materiais'           THEN p IN ('trial','ouro')
    ELSE false
  END;
END; $function$;

-- 5. Trigger: ao expirar trial / virar inadimplente, marcar data_congelamento
CREATE OR REPLACE FUNCTION public.sync_data_congelamento()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Marcar data_congelamento se trial expirou ou virou inadimplente
  IF NEW.data_congelamento IS NULL THEN
    IF (NEW.plano = 'trial' AND NEW.data_fim_trial < now())
       OR NEW.status IN ('inadimplente','cancelado','expirado') THEN
      NEW.data_congelamento := COALESCE(NEW.data_inadimplencia, now());
      NEW.excluir_dados_em := NEW.data_congelamento + interval '60 days';
    END IF;
  END IF;

  -- Limpar data_congelamento se reativou
  IF NEW.status = 'ativo' AND NEW.plano IN ('ouro','prata') THEN
    NEW.data_congelamento := NULL;
    NEW.excluir_dados_em := NULL;
    NEW.aviso_pre_exclusao_enviado_em := NULL;
  END IF;

  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_sync_data_congelamento ON public.assinaturas;
CREATE TRIGGER trg_sync_data_congelamento
BEFORE INSERT OR UPDATE ON public.assinaturas
FOR EACH ROW EXECUTE FUNCTION public.sync_data_congelamento();

-- 6. Reescrever cleanup com janela única de 60 dias
CREATE OR REPLACE FUNCTION public.cleanup_expired_users()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_user uuid;
BEGIN
  FOR v_user IN
    SELECT usuario_id FROM public.assinaturas
    WHERE data_congelamento IS NOT NULL
      AND data_congelamento < now() - interval '60 days'
      AND status <> 'ativo'
  LOOP
    DELETE FROM public.historico_estudo WHERE usuario_id = v_user;
    DELETE FROM public.desempenho_cards WHERE usuario_id = v_user;
    DELETE FROM public.favoritos        WHERE usuario_id = v_user;
    DELETE FROM public.geracoes_ia      WHERE usuario_id = v_user;
    DELETE FROM public.temp_oqs         WHERE user_id    = v_user;
    DELETE FROM public.cards_pendentes_revisao WHERE usuario_id = v_user;
    DELETE FROM public.cards
      WHERE criado_por_usuario_id = v_user AND origem = 'usuario';

    UPDATE public.assinaturas
       SET status = 'expirado', atualizado_em = now()
     WHERE usuario_id = v_user;
  END LOOP;
END;
$function$;

-- 7. Manutenção diária consolidada
CREATE OR REPLACE FUNCTION public.daily_subscription_maintenance()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Marca data_congelamento para trial expirado
  UPDATE public.assinaturas
     SET data_congelamento = COALESCE(data_congelamento, data_fim_trial),
         excluir_dados_em  = COALESCE(excluir_dados_em, data_fim_trial + interval '60 days'),
         atualizado_em     = now()
   WHERE plano = 'trial' AND data_fim_trial < now() AND data_congelamento IS NULL;

  -- Marca data_congelamento para inadimplentes
  UPDATE public.assinaturas
     SET data_congelamento = COALESCE(data_congelamento, data_inadimplencia),
         excluir_dados_em  = COALESCE(excluir_dados_em, data_inadimplencia + interval '60 days'),
         atualizado_em     = now()
   WHERE status = 'inadimplente' AND data_inadimplencia IS NOT NULL AND data_congelamento IS NULL;

  -- Atualiza contador de dias inadimplente
  UPDATE public.assinaturas
     SET dias_inadimplente = GREATEST(0, EXTRACT(DAY FROM (now() - data_congelamento))::int),
         atualizado_em = now()
   WHERE data_congelamento IS NOT NULL;

  -- Limpeza dos que passaram dos 60 dias
  PERFORM public.cleanup_expired_users();
END;
$function$;

-- 8. RLS: bloquear gravação de stats quando congelado
DROP POLICY IF EXISTS "Users can insert their own history" ON public.historico_estudo;
CREATE POLICY "Users insert history if active"
ON public.historico_estudo FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = usuario_id
  AND public.get_user_plan(auth.uid()) IN ('trial','ouro','prata')
);

DROP POLICY IF EXISTS "des_all" ON public.desempenho_cards;
CREATE POLICY "des_select_own"
ON public.desempenho_cards FOR SELECT TO authenticated
USING (auth.uid() = usuario_id);

CREATE POLICY "des_insert_if_active"
ON public.desempenho_cards FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() = usuario_id
  AND public.get_user_plan(auth.uid()) IN ('trial','ouro','prata')
);

CREATE POLICY "des_update_if_active"
ON public.desempenho_cards FOR UPDATE TO authenticated
USING (auth.uid() = usuario_id)
WITH CHECK (
  auth.uid() = usuario_id
  AND public.get_user_plan(auth.uid()) IN ('trial','ouro','prata')
);

CREATE POLICY "des_delete_own"
ON public.desempenho_cards FOR DELETE TO authenticated
USING (auth.uid() = usuario_id);

-- 9. Habilitar extensões para cron
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

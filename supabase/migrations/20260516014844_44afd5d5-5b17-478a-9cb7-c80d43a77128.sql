
-- 1) Novas colunas em assinaturas
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS paddle_subscription_id text,
  ADD COLUMN IF NOT EXISTS paddle_customer_id text,
  ADD COLUMN IF NOT EXISTS cancel_at_period_end boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_assinaturas_paddle_sub ON public.assinaturas(paddle_subscription_id);

-- 2) get_user_plan — manter acesso até fim do período pago após cancelar
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_plano text; v_status text; v_fim_trial timestamptz;
  v_inad timestamptz; v_cancel_eop boolean; v_prox timestamptz;
BEGIN
  SELECT plano, status, data_fim_trial, data_inadimplencia, cancel_at_period_end, proxima_renovacao
    INTO v_plano, v_status, v_fim_trial, v_inad, v_cancel_eop, v_prox
  FROM public.assinaturas WHERE usuario_id = _user_id;

  IF v_plano IS NULL THEN RETURN 'gratis_expirado'; END IF;

  -- Trial expirado
  IF v_plano = 'trial' AND v_fim_trial < now() THEN RETURN 'gratis_expirado'; END IF;

  -- Cancelado mas dentro do período já pago: mantém acesso
  IF v_status = 'cancelado' AND v_prox IS NOT NULL AND v_prox > now() THEN
    RETURN v_plano;
  END IF;

  IF v_status = 'inadimplente' AND v_inad IS NOT NULL AND v_inad < now() - interval '30 days' THEN
    RETURN 'gratis_expirado';
  END IF;

  IF v_status IN ('cancelado','expirado') THEN RETURN 'gratis_expirado'; END IF;

  RETURN v_plano;
END; $$;

-- 3) Job diário: incrementa dias_inadimplente, define excluir_dados_em e roda limpeza
CREATE OR REPLACE FUNCTION public.daily_subscription_maintenance()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Incrementa contador e marca data de exclusão para inadimplentes
  UPDATE public.assinaturas
     SET dias_inadimplente = GREATEST(0, EXTRACT(DAY FROM (now() - data_inadimplencia))::int),
         excluir_dados_em = COALESCE(excluir_dados_em, data_inadimplencia + interval '30 days'),
         atualizado_em = now()
   WHERE status = 'inadimplente' AND data_inadimplencia IS NOT NULL;

  -- Marca data de exclusão para trial expirado sem upgrade (15 dias após fim do trial)
  UPDATE public.assinaturas
     SET excluir_dados_em = COALESCE(excluir_dados_em, data_fim_trial + interval '15 days'),
         atualizado_em = now()
   WHERE plano = 'trial' AND data_fim_trial < now();

  -- Limpeza efetiva
  PERFORM public.cleanup_expired_users();
END; $$;

-- 4) Agenda pg_cron diário às 06:00 UTC (03:00 BRT)
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-subscription-maintenance') THEN
    PERFORM cron.unschedule('daily-subscription-maintenance');
  END IF;
END $$;

SELECT cron.schedule(
  'daily-subscription-maintenance',
  '0 6 * * *',
  $$SELECT public.daily_subscription_maintenance()$$
);

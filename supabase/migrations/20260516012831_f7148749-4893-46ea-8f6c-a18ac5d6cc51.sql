
CREATE EXTENSION IF NOT EXISTS pg_cron;

CREATE OR REPLACE FUNCTION public.cleanup_expired_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid;
BEGIN
  -- Coleta usuários elegíveis para limpeza
  FOR v_user IN
    SELECT usuario_id FROM public.assinaturas
    WHERE
      -- Ouro/Prata inadimplentes há > 30 dias
      (plano IN ('ouro','prata') AND status = 'inadimplente'
        AND data_inadimplencia IS NOT NULL
        AND data_inadimplencia < now() - interval '30 days')
      OR
      -- Trial expirado há > 15 dias e ainda não migrou
      (plano = 'trial' AND status IN ('trial','expirado')
        AND data_fim_trial < now() - interval '15 days')
  LOOP
    DELETE FROM public.historico_estudo WHERE usuario_id = v_user;
    DELETE FROM public.desempenho_cards WHERE usuario_id = v_user;
    DELETE FROM public.favoritos        WHERE usuario_id = v_user;
    DELETE FROM public.geracoes_ia      WHERE usuario_id = v_user;
    DELETE FROM public.temp_oqs         WHERE user_id    = v_user;
    DELETE FROM public.cards_pendentes_revisao WHERE usuario_id = v_user;
    -- OQs criados pelo próprio usuário (origem usuario, não verificados pelo admin)
    DELETE FROM public.cards
      WHERE criado_por_usuario_id = v_user
        AND origem = 'usuario';

    UPDATE public.assinaturas
       SET status = 'expirado', atualizado_em = now()
     WHERE usuario_id = v_user;
  END LOOP;
END;
$$;

-- Agenda diária
SELECT cron.unschedule('cleanup_expired_users_daily')
  WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup_expired_users_daily');

SELECT cron.schedule(
  'cleanup_expired_users_daily',
  '0 6 * * *',
  $$SELECT public.cleanup_expired_users();$$
);

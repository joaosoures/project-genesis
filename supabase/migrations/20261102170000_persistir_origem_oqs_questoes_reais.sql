ALTER TABLE public.temp_oqs ADD COLUMN IF NOT EXISTS questoes_reais_item_id uuid;
ALTER TABLE public.temp_oqs ADD COLUMN IF NOT EXISTS questoes_reais_sessao_id uuid;
ALTER TABLE public.temp_oqs ADD COLUMN IF NOT EXISTS questoes_reais_extracao_id uuid;
ALTER TABLE public.temp_oqs ADD COLUMN IF NOT EXISTS questoes_reais_orientacao text;

CREATE INDEX IF NOT EXISTS idx_temp_oqs_user_questao_real
  ON public.temp_oqs (user_id, questoes_reais_item_id)
  WHERE questoes_reais_item_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_temp_oqs_questao_real_extracao
  ON public.temp_oqs (questoes_reais_extracao_id)
  WHERE questoes_reais_extracao_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.temp_oqs TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.temp_oqs TO authenticated;

CREATE OR REPLACE FUNCTION public.questoes_reais_oqs_pendentes(p_item_ids uuid[])
RETURNS TABLE(item_id uuid, pending_count bigint)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT t.questoes_reais_item_id, count(*)::bigint
  FROM public.temp_oqs t
  WHERE t.user_id = auth.uid()
    AND t.questoes_reais_item_id = ANY(p_item_ids)
  GROUP BY t.questoes_reais_item_id;
$$;
GRANT EXECUTE ON FUNCTION public.questoes_reais_oqs_pendentes(uuid[]) TO authenticated;

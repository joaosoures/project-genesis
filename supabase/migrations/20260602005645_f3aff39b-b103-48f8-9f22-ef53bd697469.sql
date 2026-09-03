
-- 1) ASSINATURAS: remover update por usuário (mantém admin/service_role)
DROP POLICY IF EXISTS "ass_update" ON public.assinaturas;
CREATE POLICY "ass_update_admin_only"
  ON public.assinaturas
  FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2) PROFILES: restringir SELECT ao próprio usuário ou admin
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select_own_or_admin"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR has_role(auth.uid(), 'admin'::app_role));

-- 3) INDICACOES: criar view sem IPs e bloquear leitura direta dos IPs
DROP POLICY IF EXISTS "ind_select_own" ON public.indicacoes;
CREATE POLICY "ind_select_own_or_admin"
  ON public.indicacoes
  FOR SELECT
  TO authenticated
  USING (
    (auth.uid() = indicador_id OR auth.uid() = convidado_id OR has_role(auth.uid(), 'admin'::app_role))
  );

CREATE OR REPLACE VIEW public.indicacoes_safe
WITH (security_invoker = on) AS
SELECT
  id,
  indicador_id,
  convidado_id,
  status,
  cupom_aplicado,
  valor_credito_brl,
  stripe_credit_note_id,
  convertido_em,
  recompensado_em,
  criado_em,
  atualizado_em
FROM public.indicacoes;

GRANT SELECT ON public.indicacoes_safe TO authenticated;

-- 4) LISTA_ESPERA: validar entrada
DROP POLICY IF EXISTS "espera_insert_anyone" ON public.lista_espera;
CREATE POLICY "espera_insert_validated"
  ON public.lista_espera
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'
    AND char_length(email) <= 254
    AND (nome IS NULL OR char_length(nome) <= 120)
    AND (whatsapp IS NULL OR char_length(whatsapp) <= 32)
    AND (mensagem IS NULL OR char_length(mensagem) <= 1000)
  );

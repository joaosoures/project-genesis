-- 1. Trava de IP para auto-indicação e unicidade
ALTER TABLE public.indicacoes ADD CONSTRAINT unique_convidado UNIQUE (convidado_id);
-- Removido: UNIQUE (ip_signup) pode bloquear redes compartilhadas legítimas. 
-- Em vez disso, validaremos o IP na Edge Function com mais inteligência.

-- 2. Controle de acesso Back-end (Tiering)
CREATE OR REPLACE FUNCTION public.is_premium(_user_id uuid, _min_plan text DEFAULT 'prata')
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  v_current_plan text;
BEGIN
  v_current_plan := public.get_user_plan(_user_id);
  
  -- Ordem de força: ouro > prata > trial > outros
  IF v_min_plan = 'ouro' THEN
    RETURN v_current_plan = 'ouro';
  ELSIF v_min_plan = 'prata' THEN
    RETURN v_current_plan IN ('ouro', 'prata');
  ELSIF v_min_plan = 'trial' THEN
    RETURN v_current_plan IN ('ouro', 'prata', 'trial');
  END IF;
  
  RETURN v_current_plan != 'congelado';
END;
$$;

-- 3. Auditoria de RLS
-- A tabela 'pagamentos' estava sem políticas claras de SELECT para o usuário
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own payments" ON public.pagamentos;
CREATE POLICY "Users can view own payments" ON public.pagamentos
  FOR SELECT TO authenticated USING (auth.uid() = usuario_id);

-- Restringir 'indicacoes' para inserção apenas via service_role (Edge Function)
-- Atualmente usuários podem inserir, o que é inseguro
DROP POLICY IF EXISTS "indicacoes_insert" ON public.indicacoes;
-- Apenas SELECT permitido para usuários
DROP POLICY IF EXISTS "ind_select_own" ON public.indicacoes;
CREATE POLICY "ind_select_own" ON public.indicacoes
  FOR SELECT TO authenticated USING (auth.uid() = indicador_id OR auth.uid() = convidado_id);

-- Corrigir temp_oqs que estava permitindo acesso publico (anon)
DROP POLICY IF EXISTS "Usuários podem ver seus próprios OQs temporários" ON public.temp_oqs;
CREATE POLICY "Users can view own temp oqs" ON public.temp_oqs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios OQs temporários" ON public.temp_oqs;
CREATE POLICY "Users can insert own temp oqs" ON public.temp_oqs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios OQs temporários" ON public.temp_oqs;
CREATE POLICY "Users can delete own temp oqs" ON public.temp_oqs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

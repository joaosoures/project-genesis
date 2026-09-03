
-- Dropar view que depende das colunas
DROP VIEW IF EXISTS public.admin_users_view;

-- 1. Converter enums para texto
ALTER TABLE public.assinaturas ALTER COLUMN plano TYPE text USING plano::text;
ALTER TABLE public.assinaturas ALTER COLUMN status TYPE text USING status::text;

-- 2. Recriar view
CREATE OR REPLACE VIEW public.admin_users_view AS
SELECT p.id, p.nome, p.email, p.foto_url, p.whatsapp, p.criado_em, p.atualizado_em,
       r.role,
       COALESCE(s.status, 'nenhum') AS plano_status,
       COALESCE(s.plano, 'nenhum')  AS plano_tipo
FROM public.profiles p
LEFT JOIN public.user_roles r ON p.id = r.user_id
LEFT JOIN public.assinaturas s ON p.id = s.usuario_id;

-- 3. Novas colunas
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS valor_mensal numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS metodo_pagamento text,
  ADD COLUMN IF NOT EXISTS proxima_renovacao timestamptz,
  ADD COLUMN IF NOT EXISTS data_inadimplencia timestamptz;

-- 4. Constraints
ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_plano_check;
ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_plano_check
  CHECK (plano IN ('trial','gratis','prata','ouro'));
ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_status_check;
ALTER TABLE public.assinaturas ADD CONSTRAINT assinaturas_status_check
  CHECK (status IN ('trial','ativo','inadimplente','cancelado','expirado'));

-- 5. Tabela pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid NOT NULL,
  valor numeric NOT NULL,
  plano text NOT NULL,
  status text NOT NULL DEFAULT 'pago' CHECK (status IN ('pago','falhou','pendente','reembolsado')),
  metodo text,
  data_pagamento timestamptz NOT NULL DEFAULT now(),
  criado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pagamentos_select_own_or_admin" ON public.pagamentos;
CREATE POLICY "pagamentos_select_own_or_admin" ON public.pagamentos
  FOR SELECT TO authenticated
  USING (auth.uid() = usuario_id OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "pagamentos_admin_all" ON public.pagamentos;
CREATE POLICY "pagamentos_admin_all" ON public.pagamentos
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_pagamentos_usuario ON public.pagamentos(usuario_id, data_pagamento DESC);

-- 6. Funções
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_plano text; v_status text; v_fim_trial timestamptz; v_inad timestamptz;
BEGIN
  SELECT plano, status, data_fim_trial, data_inadimplencia
    INTO v_plano, v_status, v_fim_trial, v_inad
  FROM public.assinaturas WHERE usuario_id = _user_id;
  IF v_plano IS NULL THEN RETURN 'gratis_expirado'; END IF;
  IF v_plano = 'trial' AND v_fim_trial < now() THEN RETURN 'gratis_expirado'; END IF;
  IF v_status = 'inadimplente' AND v_inad IS NOT NULL AND v_inad < now() - interval '30 days' THEN RETURN 'gratis_expirado'; END IF;
  IF v_status IN ('cancelado','expirado') THEN RETURN 'gratis_expirado'; END IF;
  RETURN v_plano;
END; $$;

CREATE OR REPLACE FUNCTION public.can_use_feature(_user_id uuid, _feature text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE p text;
BEGIN
  IF public.has_role(_user_id, 'admin'::app_role) THEN RETURN true; END IF;
  p := public.get_user_plan(_user_id);
  RETURN CASE _feature
    WHEN 'estudo_geral'        THEN true
    WHEN 'metricas_basicas'    THEN true
    WHEN 'metricas_avancadas'  THEN p IN ('trial','ouro','prata')
    WHEN 'estudo_focado'       THEN p IN ('trial','ouro','prata')
    WHEN 'gerar_oq_planilha'   THEN p IN ('trial','ouro','prata')
    WHEN 'gerar_oq_ia'         THEN p IN ('trial','ouro')
    WHEN 'materiais'           THEN p IN ('trial','ouro')
    ELSE false
  END;
END; $$;

CREATE OR REPLACE FUNCTION public.is_subscriber(p_user_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p text;
BEGIN
  p := public.get_user_plan(p_user_id);
  RETURN p IN ('trial','ouro','prata');
END; $$;

-- 7. handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, nome, email, foto_url) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nome', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)),
    NEW.email,
    NEW.raw_user_meta_data->>'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'usuario');
  INSERT INTO public.assinaturas (
    usuario_id, plano, status, valor_mensal,
    data_inicio_trial, data_fim_trial, excluir_dados_em
  ) VALUES (
    NEW.id, 'trial', 'trial', 0,
    now(), now() + interval '7 days', now() + interval '22 days'
  );
  RETURN NEW;
END; $$;

-- 8. RLS reforçada
DROP POLICY IF EXISTS "cards_insert" ON public.cards;
CREATE POLICY "cards_insert" ON public.cards
  FOR INSERT TO authenticated
  WITH CHECK (
    (criado_por_usuario_id = auth.uid() AND public.can_use_feature(auth.uid(), 'gerar_oq_planilha'))
    OR public.has_role(auth.uid(), 'admin'::app_role)
  );

DROP POLICY IF EXISTS "Strict user isolation for IA generations" ON public.geracoes_ia;
DROP POLICY IF EXISTS "geracoes_ia_select_own" ON public.geracoes_ia;
DROP POLICY IF EXISTS "geracoes_ia_insert_with_plan" ON public.geracoes_ia;
DROP POLICY IF EXISTS "geracoes_ia_update_own" ON public.geracoes_ia;
DROP POLICY IF EXISTS "geracoes_ia_delete_own" ON public.geracoes_ia;

CREATE POLICY "geracoes_ia_select_own" ON public.geracoes_ia
  FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "geracoes_ia_insert_with_plan" ON public.geracoes_ia
  FOR INSERT WITH CHECK (auth.uid() = usuario_id AND public.can_use_feature(auth.uid(), 'gerar_oq_ia'));
CREATE POLICY "geracoes_ia_update_own" ON public.geracoes_ia
  FOR UPDATE USING (auth.uid() = usuario_id);
CREATE POLICY "geracoes_ia_delete_own" ON public.geracoes_ia
  FOR DELETE USING (auth.uid() = usuario_id);

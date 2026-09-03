-- 1. Add missing column to materiais
ALTER TABLE public.materiais ADD COLUMN IF NOT EXISTS premium BOOLEAN DEFAULT false;

-- 2. Create or Replace secure functions with CORRECT parameter names
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = _user_id AND role = _role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN public.has_role(auth.uid(), 'admin'::app_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_subscriber(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.assinaturas 
    WHERE usuario_id = p_user_id 
    AND status = 'active'
    AND expiracao > now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.get_daily_progress(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(DISTINCT card_id) INTO v_count
    FROM public.historico_estudo
    WHERE usuario_id = p_user_id
    AND timestamp::date = CURRENT_DATE;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Rate Limiting for AI Generations
CREATE TABLE IF NOT EXISTS public.user_ia_usage (
    usuario_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    count_today INTEGER DEFAULT 0,
    last_reset TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.user_ia_usage ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_ia_limit()
RETURNS TRIGGER AS $$
DECLARE
    v_limit INTEGER := 20; 
    v_usage INTEGER;
BEGIN
    INSERT INTO public.user_ia_usage (usuario_id, count_today, last_reset)
    VALUES (auth.uid(), 0, now())
    ON CONFLICT (usuario_id) DO NOTHING;

    UPDATE public.user_ia_usage 
    SET count_today = 0, last_reset = now()
    WHERE usuario_id = auth.uid() 
    AND last_reset::date < CURRENT_DATE;

    IF NOT public.is_subscriber(auth.uid()) AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'A geração de OQs via IA requer uma assinatura ativa.';
    END IF;

    SELECT count_today INTO v_usage FROM public.user_ia_usage WHERE usuario_id = auth.uid();

    IF v_usage >= v_limit AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'Limite diário de gerações de IA atingido.';
    END IF;

    UPDATE public.user_ia_usage SET count_today = count_today + 1 WHERE usuario_id = auth.uid();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_check_ia_limit ON public.geracoes_ia;
CREATE TRIGGER tr_check_ia_limit
BEFORE INSERT ON public.geracoes_ia
FOR EACH ROW EXECUTE FUNCTION public.check_ia_limit();

-- 4. Refine RLS Policies
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Qualquer um pode ler materiais ativos" ON public.materiais;
DROP POLICY IF EXISTS "mat_select" ON public.materiais;
DROP POLICY IF EXISTS "mat_admin_all" ON public.materiais;

CREATE POLICY "Materiais selection policy" ON public.materiais
FOR SELECT USING (
  (ativo = true AND (premium = false OR public.is_subscriber(auth.uid())))
  OR public.is_admin()
);

CREATE POLICY "Materiais admin all" ON public.materiais
FOR ALL USING (public.is_admin());

ALTER TABLE public.geracoes_ia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ger_all" ON public.geracoes_ia;
CREATE POLICY "Strict user isolation for IA generations" ON public.geracoes_ia
FOR ALL USING (auth.uid() = usuario_id) WITH CHECK (auth.uid() = usuario_id);

ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Qualquer um pode ver cards verificados ou seus próprios" ON public.cards;
DROP POLICY IF EXISTS "Cards visibility" ON public.cards;
DROP POLICY IF EXISTS "Cards visibility policy" ON public.cards;
DROP POLICY IF EXISTS "Cards visibility policy v2" ON public.cards;
DROP POLICY IF EXISTS "Cards visibility policy v3" ON public.cards;
CREATE POLICY "Cards visibility policy v4" ON public.cards
FOR SELECT USING (
  verificado = true 
  OR criado_por_usuario_id = auth.uid()
  OR public.is_admin()
);

-- 5. Revoke Public access
REVOKE EXECUTE ON FUNCTION public.has_role(UUID, app_role) FROM public;
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
REVOKE EXECUTE ON FUNCTION public.is_subscriber(UUID) FROM public;
REVOKE EXECUTE ON FUNCTION public.get_daily_progress(UUID) FROM public;

GRANT EXECUTE ON FUNCTION public.has_role(UUID, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_subscriber(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_progress(UUID) TO authenticated;

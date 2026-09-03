-- 1. Atualizar can_use_feature para alinhar com regras de negócio
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
     WHEN 'gerar_oq_ia'         THEN p IN ('trial','ouro') -- Removido prata
     WHEN 'materiais'           THEN p IN ('trial','ouro')
     WHEN 'trilha'              THEN p IN ('trial','ouro') -- Adicionado trilha
     ELSE false
   END;
 END; $function$;

-- 2. Restringir acesso à tabela materiais via RLS
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Materiais are viewable by authenticated users" ON public.materiais;

CREATE POLICY "Materiais are viewable by eligible users"
ON public.materiais FOR SELECT TO authenticated
USING (
  public.can_use_feature(auth.uid(), 'materiais')
);

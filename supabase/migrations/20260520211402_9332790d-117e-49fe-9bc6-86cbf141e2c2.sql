-- Renomear colunas de integração (preserva dados se houver, mas altera o nome para o novo padrão)
ALTER TABLE public.assinaturas RENAME COLUMN paddle_subscription_id TO stripe_subscription_id;
ALTER TABLE public.assinaturas RENAME COLUMN paddle_customer_id TO stripe_customer_id;

-- Atualizar a função de permissões (RBAC)
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
    WHEN 'estudo_geral'        THEN true
    WHEN 'metricas_basicas'    THEN true
    WHEN 'metricas_avancadas'  THEN p IN ('trial','ouro','prata')
    WHEN 'estudo_focado'       THEN p IN ('trial','ouro','prata')
    WHEN 'gerar_oq_planilha'   THEN p IN ('trial','ouro','prata')
    WHEN 'gerar_oq_ia'         THEN p IN ('trial','ouro','prata') -- PRATA agora pode usar IA
    WHEN 'materiais'           THEN p IN ('trial','ouro')         -- MATERIAIS continua exclusivo OURO/TRIAL
    ELSE false
  END;
END; $function$;
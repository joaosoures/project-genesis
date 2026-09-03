-- 1. Fix admin_users_view to use security_invoker
DROP VIEW IF EXISTS public.admin_users_view;
CREATE VIEW public.admin_users_view WITH (security_invoker = true) AS
 SELECT p.id,
    p.nome,
    p.email,
    p.foto_url,
    p.whatsapp,
    p.criado_em,
    p.atualizado_em,
    p.is_banned,
    r.role,
    COALESCE(s.status, 'nenhum'::text) AS plano_status,
    COALESCE(s.plano, 'nenhum'::text) AS plano_tipo
   FROM ((profiles p
     LEFT JOIN user_roles r ON ((p.id = r.user_id)))
     LEFT JOIN assinaturas s ON ((p.id = s.usuario_id)));

-- 2. Update functions to include SET search_path = public
CREATE OR REPLACE FUNCTION public.aulas_stats()
 RETURNS TABLE(aula_id uuid, nome text, especialidade text, total integer, sem_explicacao integer, irregularidades integer)
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public
AS $function$
BEGIN
    RETURN QUERY
    SELECT
        m.id AS aula_id,
        m.nome,
        m.especialidade::text,
        COUNT(c.id)::integer AS total,
        COUNT(c.id) FILTER (
            WHERE c.explicacao IS NULL 
            OR TRIM(c.explicacao) = '' 
            OR c.explicacao = 'Importado via planilha.'
            OR c.explicacao = 'Explicação não disponível.'
        )::integer AS sem_explicacao,
        COUNT(c.id) FILTER (
            WHERE c.comando IS NULL 
            OR TRIM(c.comando) = ''
            OR c.modo IS NULL
        )::integer AS irregularidades
    FROM public.materiais m
    LEFT JOIN public.cards c ON c.aula_id = m.id
    WHERE m.link_1 IS NOT NULL
      AND m.tipo_1 = 'PDF'
    GROUP BY m.id, m.nome, m.especialidade
    ORDER BY m.nome;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.touch_indicacoes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public
AS $function$
BEGIN NEW.atualizado_em := now(); RETURN NEW; END; $function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY INVOKER
 SET search_path = public
AS $function$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$function$;

-- 3. Update materiais management policy
DROP POLICY IF EXISTS "Admins can manage materiais" ON public.materiais;
CREATE POLICY "Admins can manage materiais" 
ON public.materiais 
FOR ALL 
TO authenticated 
USING (public.is_admin()) 
WITH CHECK (public.is_admin());

-- 4. Clean up reports_erro duplicate policies
DROP POLICY IF EXISTS "Admins podem gerenciar todos os reports" ON public.reports_erro;
DROP POLICY IF EXISTS "Qualquer usuario logado pode criar reports" ON public.reports_erro;

-- Ensure standard policies exist for reports_erro (re-creating them to be sure)
DROP POLICY IF EXISTS "rep_select" ON public.reports_erro;
CREATE POLICY "rep_select" ON public.reports_erro 
FOR SELECT 
TO authenticated 
USING (auth.uid() = usuario_id OR public.is_admin());

DROP POLICY IF EXISTS "rep_insert" ON public.reports_erro;
CREATE POLICY "rep_insert" ON public.reports_erro 
FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = usuario_id);

DROP POLICY IF EXISTS "rep_update" ON public.reports_erro;
CREATE POLICY "rep_update" ON public.reports_erro 
FOR UPDATE 
TO authenticated 
USING (public.is_admin())
WITH CHECK (public.is_admin());

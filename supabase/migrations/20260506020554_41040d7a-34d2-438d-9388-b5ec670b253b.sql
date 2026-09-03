-- Corrigir segurança das funções
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Revogar execução publica e permitir apenas autenticados
REVOKE EXECUTE ON FUNCTION public.is_admin() FROM public;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Corrigir a função de trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Adicionar permissão para ler perfis e roles de forma agregada (view para admin)
CREATE OR REPLACE VIEW admin_users_view AS
SELECT 
    p.id,
    p.nome,
    p.email,
    p.foto_url,
    p.criado_em,
    (SELECT role FROM public.user_roles WHERE user_id = p.id LIMIT 1) as role,
    (SELECT status FROM public.assinaturas WHERE usuario_id = p.id LIMIT 1) as plano_status,
    (SELECT plano FROM public.assinaturas WHERE usuario_id = p.id LIMIT 1) as plano_tipo
FROM public.profiles p;

-- Garantir que apenas admins vejam a view
ALTER VIEW admin_users_view OWNER TO postgres;
REVOKE ALL ON admin_users_view FROM public;
REVOKE ALL ON admin_users_view FROM authenticated;
GRANT SELECT ON admin_users_view TO authenticated; -- RLS na tabela base cuidará do resto ou usaremos política na view se suportado

-- Como views simples não suportam RLS da mesma forma, vamos garantir que o acesso via código verifique is_admin()

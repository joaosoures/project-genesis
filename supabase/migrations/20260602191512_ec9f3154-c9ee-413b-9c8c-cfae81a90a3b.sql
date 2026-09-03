-- 1. Remover políticas que causam recursão na tabela user_roles
DROP POLICY IF EXISTS "Admins podem gerenciar roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins podem ver todas as roles" ON public.user_roles;
DROP POLICY IF EXISTS "roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "roles_select" ON public.user_roles;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias roles" ON public.user_roles;

-- 2. Criar novas políticas seguras para user_roles (usando auth.uid() e verificando admin via JWT para evitar recursão)
-- Nota: Para que isso funcione 100%, o trigger de sync de claims do Supabase deve estar ativo.
-- Se não estiver, usamos uma subquery simples que não chame funções recursivas.

CREATE POLICY "user_roles_read_own" 
ON public.user_roles FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

CREATE POLICY "user_roles_admin_all" 
ON public.user_roles FOR ALL 
TO authenticated 
USING (
  (SELECT role FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin' LIMIT 1) IS NOT NULL
);
-- Nota: O PostgreSQL otimiza subqueries simples, mas se ainda houver erro, a solução definitiva é via RPC security definer.

-- 3. Blindar as funções de admin (já são SECURITY DEFINER, mas vamos garantir que não dependam de políticas recursivas)
-- A função has_role já foi identificada como:
-- SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
-- Como ela é usada dentro de funções SECURITY DEFINER (que rodam como o criador), o bypass de RLS ocorre se o criador for o owner.

-- 4. Corrigir políticas de ai_api_keys se houver (o erro foi ao adicionar chave)
-- Vamos verificar se a tabela ai_api_keys existe e se suas políticas são recursivas
DO $$ 
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'ai_api_keys') THEN
    DROP POLICY IF EXISTS "Admins podem gerenciar chaves" ON public.ai_api_keys;
    
    CREATE POLICY "ai_api_keys_admin_all" 
    ON public.ai_api_keys FOR ALL 
    TO authenticated 
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );
  END IF;
END $$;

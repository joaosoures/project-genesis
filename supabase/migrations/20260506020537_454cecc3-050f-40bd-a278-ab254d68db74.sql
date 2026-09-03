-- Criar enum de roles se não existir
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'editor', 'estudante_ouro', 'estudante_prata', 'estudante_bronze');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Garantir que a tabela user_roles existe e está correta
CREATE TABLE IF NOT EXISTS public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL DEFAULT 'estudante_bronze',
    criado_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, role)
);

-- Ativar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas para user_roles
CREATE POLICY "Admins podem ver todas as roles" 
ON public.user_roles FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Usuários podem ver suas próprias roles" 
ON public.user_roles FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins podem gerenciar roles" 
ON public.user_roles FOR ALL 
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- Função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Se a tabela reports_erro não existir ou precisar de ajustes
CREATE TABLE IF NOT EXISTS public.reports_erro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    card_id UUID REFERENCES public.cards(id) ON DELETE CASCADE,
    tipo TEXT NOT NULL, -- 'erro_conteudo', 'bug_sistema', 'sugestao'
    descricao TEXT,
    status TEXT NOT NULL DEFAULT 'pendente', -- 'pendente', 'em_analise', 'resolvido', 'arquivado'
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.reports_erro ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Qualquer usuario logado pode criar reports" 
ON public.reports_erro FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins podem gerenciar todos os reports" 
ON public.reports_erro FOR ALL 
USING (public.is_admin());

-- Criar um trigger para atualizar o atualizado_em de reports
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_update_reports_updated_at ON public.reports_erro;
CREATE TRIGGER tr_update_reports_updated_at
BEFORE UPDATE ON public.reports_erro
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

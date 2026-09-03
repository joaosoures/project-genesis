-- Habilitar extensão primeiro
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Índices B-tree (rápidos para igualdade e filtros simples)
CREATE INDEX IF NOT EXISTS idx_materiais_ativo ON public.materiais(ativo);
CREATE INDEX IF NOT EXISTS idx_materiais_tipo ON public.materiais(tipo);
CREATE INDEX IF NOT EXISTS idx_materiais_especialidade ON public.materiais(especialidade);

-- Índices para chaves estrangeiras
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_usuario_id ON public.assinaturas(usuario_id);

-- Índice GIN para busca de texto (agora com a extensão habilitada)
CREATE INDEX IF NOT EXISTS idx_materiais_nome_trgm ON public.materiais USING gin (nome gin_trgm_ops);

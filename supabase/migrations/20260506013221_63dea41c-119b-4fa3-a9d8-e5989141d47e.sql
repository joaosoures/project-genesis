-- Adicionar colunas se não existirem
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materiais' AND column_name = 'nome') THEN
        ALTER TABLE public.materiais ADD COLUMN nome TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'materiais' AND column_name = 'link_drive') THEN
        ALTER TABLE public.materiais ADD COLUMN link_drive TEXT;
    END IF;
END $$;

-- Garantir que todos os usuários autenticados possam ler
CREATE POLICY "Qualquer um pode ler materiais ativos" 
ON public.materiais 
FOR SELECT 
USING (ativo = true);

-- Trigger para migrar dados antigos se necessário (opcional, mas bom para consistência)
UPDATE public.materiais SET nome = titulo WHERE nome IS NULL;

-- Tabela para armazenar o pool de chaves de API
CREATE TABLE public.api_keys_pool (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    provider TEXT NOT NULL DEFAULT 'lovable_gateway', -- 'lovable_gateway', 'openai', 'anthropic', 'google'
    key_value TEXT NOT NULL,
    label TEXT, -- Nome para identificar a chave (ex: "OpenAI Pessoal", "Gemini Pro")
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Chaves com maior prioridade (menor número) são usadas primeiro
    last_used_at TIMESTAMP WITH TIME ZONE,
    error_count INTEGER DEFAULT 0,
    last_error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.api_keys_pool TO authenticated;
GRANT ALL ON public.api_keys_pool TO service_role;

-- RLS
ALTER TABLE public.api_keys_pool ENABLE ROW LEVEL SECURITY;

-- Política: Apenas admins podem ver e gerenciar chaves
CREATE POLICY "Admins can manage api keys"
ON public.api_keys_pool
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_api_keys_pool_updated_at
BEFORE UPDATE ON public.api_keys_pool
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

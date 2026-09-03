CREATE TABLE public.temp_oqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pergunta TEXT NOT NULL,
  resposta TEXT NOT NULL,
  modo TEXT NOT NULL CHECK (modo IN ('abcde', 'lacuna', 'oq_falta')),
  opcoes JSONB, -- Para modo abcde
  especialidade TEXT NOT NULL,
  contexto_origem TEXT, -- Referência ao material original
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.temp_oqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver seus próprios OQs temporários" 
ON public.temp_oqs FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir seus próprios OQs temporários" 
ON public.temp_oqs FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios OQs temporários" 
ON public.temp_oqs FOR DELETE USING (auth.uid() = user_id);
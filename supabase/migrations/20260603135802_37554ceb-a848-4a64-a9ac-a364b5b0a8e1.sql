-- Simulados table
CREATE TABLE public.simulados (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    especialidade TEXT,
    criado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Simulados questions
CREATE TABLE public.simulado_questoes (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    simulado_id UUID REFERENCES public.simulados(id) ON DELETE CASCADE,
    especialidade TEXT,
    comando TEXT NOT NULL,
    opcao_a TEXT,
    opcao_b TEXT,
    opcao_c TEXT,
    opcao_d TEXT,
    opcao_e TEXT,
    gabarito CHAR(1) NOT NULL, -- 'A', 'B', 'C', 'D', 'E'
    explicacao_1 TEXT,
    explicacao_2 TEXT,
    explicacao_3 TEXT,
    ordem INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Student attempts
CREATE TABLE public.simulado_tentativas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    simulado_id UUID REFERENCES public.simulados(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    acertos INT DEFAULT 0,
    erros INT DEFAULT 0,
    total_questoes INT DEFAULT 0,
    concluido_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Student individual answers
CREATE TABLE public.simulado_respostas_aluno (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    tentativa_id UUID REFERENCES public.simulado_tentativas(id) ON DELETE CASCADE,
    questao_id UUID REFERENCES public.simulado_questoes(id) ON DELETE CASCADE,
    resposta_marcada CHAR(1),
    acertou BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grants
GRANT SELECT ON public.simulados TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.simulados TO authenticated;
GRANT SELECT ON public.simulado_questoes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.simulado_questoes TO authenticated;
GRANT SELECT, INSERT ON public.simulado_tentativas TO authenticated;
GRANT SELECT, INSERT ON public.simulado_respostas_aluno TO authenticated;

GRANT ALL ON public.simulados TO service_role;
GRANT ALL ON public.simulado_questoes TO service_role;
GRANT ALL ON public.simulado_tentativas TO service_role;
GRANT ALL ON public.simulado_respostas_aluno TO service_role;

-- RLS
ALTER TABLE public.simulados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_questoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_tentativas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulado_respostas_aluno ENABLE ROW LEVEL SECURITY;

-- Policies for simulados
CREATE POLICY "Simulados are viewable by all authenticated" ON public.simulados FOR SELECT USING (true);
CREATE POLICY "Admins can manage simulados" ON public.simulados FOR ALL USING (
    auth.jwt() ->> 'email' = 'joaoresende2603@gmail.com' OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies for simulado_questoes
CREATE POLICY "Questions are viewable by all authenticated" ON public.simulado_questoes FOR SELECT USING (true);
CREATE POLICY "Admins can manage questions" ON public.simulado_questoes FOR ALL USING (
    auth.jwt() ->> 'email' = 'joaoresende2603@gmail.com' OR 
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
);

-- Policies for simulado_tentativas
CREATE POLICY "Users can view their own attempts" ON public.simulado_tentativas FOR SELECT USING (auth.uid() = usuario_id);
CREATE POLICY "Users can create their own attempts" ON public.simulado_tentativas FOR INSERT WITH CHECK (auth.uid() = usuario_id);

-- Policies for simulado_respostas_aluno
CREATE POLICY "Users can view their own answers" ON public.simulado_respostas_aluno FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.simulado_tentativas WHERE id = tentativa_id AND usuario_id = auth.uid())
);
CREATE POLICY "Users can create their own answers" ON public.simulado_respostas_aluno FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.simulado_tentativas WHERE id = tentativa_id AND usuario_id = auth.uid())
);

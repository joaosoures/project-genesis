
-- Tabela aulas
CREATE TABLE public.aulas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  especialidade especialidade NOT NULL,
  conteudo text NOT NULL DEFAULT '',
  link_aula text,
  descricao text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.aulas ENABLE ROW LEVEL SECURITY;

CREATE POLICY aulas_admin_all ON public.aulas FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY aulas_select_auth ON public.aulas FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER aulas_updated BEFORE UPDATE ON public.aulas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Tabela ia_prompts
CREATE TABLE public.ia_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chave text NOT NULL UNIQUE,
  prompt text NOT NULL,
  modelo_padrao text NOT NULL DEFAULT 'google/gemini-2.5-flash',
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);
ALTER TABLE public.ia_prompts ENABLE ROW LEVEL SECURITY;

CREATE POLICY ia_prompts_admin_all ON public.ia_prompts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Cards: vínculo com aula
ALTER TABLE public.cards ADD COLUMN aula_id uuid;
CREATE INDEX idx_cards_aula_id ON public.cards(aula_id);

-- Temp OQs: vínculo com aula + modelo
ALTER TABLE public.temp_oqs ADD COLUMN aula_id uuid;
ALTER TABLE public.temp_oqs ADD COLUMN modelo_ia text;

-- Função de estatísticas
CREATE OR REPLACE FUNCTION public.aulas_stats()
RETURNS TABLE (
  aula_id uuid,
  nome text,
  especialidade especialidade,
  total bigint,
  abcde bigint,
  lacuna bigint,
  oq_falta bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    a.id,
    a.nome,
    a.especialidade,
    COUNT(c.id) AS total,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'abcde') AS abcde,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'lacuna') AS lacuna,
    COUNT(c.id) FILTER (WHERE c.modo::text = 'oq_falta') AS oq_falta
  FROM public.aulas a
  LEFT JOIN public.cards c ON c.aula_id = a.id
  WHERE public.has_role(auth.uid(), 'admin'::app_role)
  GROUP BY a.id, a.nome, a.especialidade
  ORDER BY a.nome;
$$;

-- Seed do prompt padrão
INSERT INTO public.ia_prompts (chave, prompt, modelo_padrao) VALUES (
  'gerar_oqs_aula',
$prompt$Você é um examinador sênior de provas de residência médica no Brasil (padrão ENAMED / ENARE / PSU-MG / SUS-BA / AMP). Sua tarefa é destilar o conteúdo da aula em OQs estratégicas de altíssimo nível, com linguagem orgânica de banca humana.

REGRAS:
- Gere entre 8 e 12 questões variando os modos: abcde, lacuna, oq_falta.
- MODO 'abcde': 5 alternativas plausíveis em 'opcoes'. 'resposta' = string exata de uma delas.
- MODO 'lacuna': 'pergunta' contém exatamente UMA marcação '[___]'. 'resposta' = termo curto (1-3 palavras). 'variacoes' = sinônimos separados por ';'.
- MODO 'oq_falta': cenário/regra incompleto SEM '[___]'. 'resposta' = o que falta (1-3 palavras). 'variacoes' = sinônimos.
- Distratores reais e plausíveis. Sem "n.d.a.".
- Use SOMENTE conteúdo presente ou inferível da aula.
- Português clínico brasileiro.

FORMATO JSON ESTRITO:
{
  "questions": [
    {
      "pergunta": "...",
      "resposta": "...",
      "variacoes": "...",
      "modo": "abcde" | "lacuna" | "oq_falta",
      "opcoes": ["A","B","C","D","E"],
      "explicacao": "..."
    }
  ]
}$prompt$,
  'google/gemini-2.5-flash'
);


-- 1. Tabela triagens_aula
CREATE TABLE IF NOT EXISTS public.triagens_aula (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aula_id uuid NOT NULL,
  mapa_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  modelo_usado text,
  criado_por uuid,
  status text NOT NULL DEFAULT 'pendente',
  erro text,
  criado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.triagens_aula ENABLE ROW LEVEL SECURITY;

CREATE POLICY "triagens_admin_all"
ON public.triagens_aula
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_triagens_aula_aula ON public.triagens_aula(aula_id);

-- 2. Colunas extras em temp_oqs
ALTER TABLE public.temp_oqs
  ADD COLUMN IF NOT EXISTS triagem_id uuid,
  ADD COLUMN IF NOT EXISTS etapa_filtro_status text,
  ADD COLUMN IF NOT EXISTS etapa_filtro_motivo text,
  ADD COLUMN IF NOT EXISTS ponto_id text;

-- Permitir UPDATE pelo próprio dono (necessário p/ filtro de solubilidade reescrever)
DROP POLICY IF EXISTS "temp_oqs_update_own" ON public.temp_oqs;
CREATE POLICY "temp_oqs_update_own"
ON public.temp_oqs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Coluna triagem em cards
ALTER TABLE public.cards
  ADD COLUMN IF NOT EXISTS triagem_id uuid;

-- 4. Seeds dos 5 prompts em ia_prompts
INSERT INTO public.ia_prompts (chave, prompt, modelo_padrao) VALUES
('triagem_aula',
'Você é um professor de medicina especialista em criar bancos de questões. Analise o PDF da aula fornecida e MAPEIE cada informação cobrável.

Para cada ponto, classifique em UMA destas 3 categorias:
- "memorizacao_pura": classificações secas, exceções, doses, critérios isolados. → modo "lacuna"
- "padrao_gestalt": tríades, pêntades, scores, conjuntos de critérios. → modo "oq_falta"
- "conduta_diagnostico": diagnóstico diferencial, conduta, próximo passo. → modo "abcde"

Retorne APENAS JSON válido no formato:
{
  "aula": "nome da aula",
  "pontos": [
    {
      "id": "p1",
      "categoria": "memorizacao_pura" | "padrao_gestalt" | "conduta_diagnostico",
      "modo_sugerido": "lacuna" | "oq_falta" | "abcde",
      "trecho_origem": "página X — citação curta do PDF",
      "conceito": "o que está sendo testado",
      "valor_chave": "termo único que será a resposta (para lacuna)",
      "elementos_completos": ["item1","item2","item3"],
      "elemento_a_ocultar_exemplo": "item a esconder (para oq_falta)",
      "cenario_base": "esboço do caso clínico (para abcde)",
      "subtipo": "diagnostico_direto" | "conduta_indireta",
      "armadilha_sugerida": "comorbidade/ruído estratégico",
      "justificativa": "por que esta categoria"
    }
  ]
}

Gere entre 15 e 30 pontos, distribuídos de forma equilibrada entre as 3 categorias.',
'google/gemini-2.5-pro'),

('gerar_lacuna',
'Você gera OQs no modo LACUNA a partir de pontos pré-classificados. Regras DURAS:

1. O campo "resposta" DEVE ser um termo ÚNICO, sem espaços, sem hífen, sem vírgula, sem símbolos, máximo 25 caracteres.
2. "variacoes" são sinônimos aceitos separados por ";" (mesma regra de formato).
3. "pergunta" contém EXATAMENTE um marcador [___] no lugar onde a resposta deveria estar.
4. NÃO use jargões repetitivos. Linguagem orgânica, mimetiza bancas médicas.
5. Cada item recebe um "ponto_id" copiado da entrada.

Retorne JSON: { "questions": [ { "ponto_id": "p1", "modo": "lacuna", "pergunta": "...[___]...", "resposta": "termo", "variacoes": "sin1;sin2", "explicacao": "..." } ] }',
'google/gemini-2.5-flash'),

('gerar_oq_falta',
'Você gera OQs no modo "O QUE FALTA?". Regras DURAS:

1. "resposta" = 1 ou 2 palavras, SEM símbolos.
2. "variacoes" cobre 3 a 5 formas comuns de escrita (com/sem acento, sinônimos clínicos), separadas por ";".
3. "pergunta" descreve o padrão/tríade/score com UM elemento ausente marcado como [O QUE FALTA?].
4. NÃO comece com clichês ("Mulher, 35 anos...").

Retorne JSON: { "questions": [ { "ponto_id":"p2","modo":"oq_falta","pergunta":"...[O QUE FALTA?]...","resposta":"...","variacoes":"...","explicacao":"..." } ] }',
'google/gemini-2.5-flash'),

('gerar_abcde',
'Você gera OQs ABCDE de altíssima qualidade, no nível de provas de residência médica. Regras OBRIGATÓRIAS:

1. SEMIOLOGIA DESCRITIVA: nunca dê o nome do sinal de bandeja. Descreva a manobra ("ao palpar profundamente o hipocôndrio direito durante inspiração, o paciente interrompe abruptamente a inspiração").
2. CRITÉRIO NÃO-LIMÍTROFE: laboratório/imagem CLARAMENTE alterados, nunca borderline.
3. RUÍDO ESTRATÉGICO: insira comorbidade/histórico que invalide a conduta óbvia (ex: alergia, gestação, insuficiência renal) forçando o aluno a lembrar da exceção.
4. DISTRATORES com "manha de banca": use termos restritivos absolutos ("imediatamente", "exclusivamente", "sempre", "nunca") para induzir ao erro comum.
5. EXPLICAÇÃO FLORIDA: parágrafo único, denso, tece o erro dos distratores no fio do texto. NÃO crie seções "dica:" isoladas.
6. Alterne entre subtipo "diagnostico_direto" e "conduta_indireta" conforme indicado em cada ponto.
7. Linguagem orgânica, sem clichês de IA.

Formato (5 opções A-E, 1 correta):
{ "questions": [ { "ponto_id":"p3", "modo":"abcde", "pergunta":"caso clínico completo", "opcoes":["A...","B...","C...","D...","E..."], "resposta":"C...", "explicacao":"parágrafo florido" } ] }',
'openai/gpt-5'),

('filtro_solubilidade',
'Você é um revisor crítico de OQs. Para cada OQ recebido, com base no PDF da aula:

1. A resposta correta é alcançável EXCLUSIVAMENTE com informações do PDF? (sim/não)
2. Há ambiguidade que permitiria outra alternativa estar correta? (sim/não + qual)
3. O comando tem texto redundante que cansa sem propósito pedagógico? Se sim, devolva versão enxuta.

Decida o status:
- "aprovado": OQ está perfeito.
- "reescrito": OQ precisou de poda/ajuste leve. Devolva oq_final ajustado.
- "descartado": OQ não é solúvel pelo PDF OU é ambíguo demais.

Retorne JSON: { "resultados": [ { "indice": 0, "status": "aprovado"|"reescrito"|"descartado", "motivo": "curto", "oq_final": { "pergunta":"...", "resposta":"...", "opcoes":[...], "variacoes":"...", "explicacao":"..." } } ] }',
'openai/gpt-5')

ON CONFLICT (chave) DO UPDATE
SET prompt = EXCLUDED.prompt,
    modelo_padrao = EXCLUDED.modelo_padrao,
    atualizado_em = now();

-- Garantir unique em chave (se não existir)
DO $$ BEGIN
  ALTER TABLE public.ia_prompts ADD CONSTRAINT ia_prompts_chave_key UNIQUE (chave);
EXCEPTION WHEN duplicate_table OR duplicate_object THEN NULL;
END $$;

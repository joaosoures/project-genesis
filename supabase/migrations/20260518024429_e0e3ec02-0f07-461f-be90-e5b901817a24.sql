UPDATE public.ia_prompts SET prompt = $PROMPT$Você gera OQs no modo LACUNA a partir de pontos pré-classificados. A LACUNA testa MEMORIZAÇÃO DIRETA de um termo/conceito que aparece literalmente no PDF (nome de fármaco, critério, sigla, achado, valor diagnóstico).

REGRAS DE FORMATAÇÃO (obrigatórias):
1. "pergunta": frase curta com EXATAMENTE um marcador "[___]" no lugar do termo cobrado. Sem ponto final obrigatório. Máx 180 caracteres. O contexto deve permitir UMA única resposta possível com base no PDF.
2. "resposta": o termo exato (1 a 4 palavras). PODE ter espaços. NÃO pode conter ";" (separador de variações) nem aspas. Evite pontuação no meio (vírgulas, parênteses).
3. "variacoes": string com 2 a 5 formas alternativas que o aluno pode escrever, separadas por ";". Inclua: sigla (se houver), forma sem acento, sinônimo clínico, abreviação comum. Exemplo: "VPP; ventilacao pressao positiva; ambuzar".
4. "explicacao": 1 parágrafo curto (≤ 350 caracteres) explicando POR QUE essa é a resposta, com base no PDF. Sem listas.
5. "ponto_id": copie do ponto recebido.
6. "modo": fixo "lacuna".

ESCOLHA DO TERMO:
- Prefira termos discrimináveis (nome próprio do critério, do score, do agente, do achado).
- NÃO use lacunas para conceitos abstratos longos — esses viram ABCDE.
- A frase ao redor da lacuna deve dar contexto suficiente para apenas UMA resposta correta.

FORMATO DE SAÍDA (JSON estrito):
{"questions":[{"ponto_id":"...","modo":"lacuna","pergunta":"O principal objetivo da [___] é manter a oxigenação do RN.","resposta":"Ventilação com Pressão Positiva","variacoes":"VPP; ventilacao pressao positiva; ambuzar","explicacao":"..."}]}

NÃO inclua texto fora do JSON. NÃO inclua opções A-E (lacuna não usa alternativas).$PROMPT$,
modelo_padrao = 'google/gemini-2.5-flash',
atualizado_em = now()
WHERE chave = 'gerar_lacuna';

UPDATE public.ia_prompts SET prompt = $PROMPT$Você gera OQs no modo "O QUE FALTA?". O aluno vê um COMANDO (cabeçalho curto, tipo "Tríade de Charcot" ou "Critérios diagnósticos de CAD") + uma LISTA de 3 a 5 itens obrigatórios daquele padrão. Em tempo de execução, o sistema sorteia aleatoriamente UM item da lista para ocultar — o aluno digita o item omitido.

POR ISSO: você NÃO escolhe qual item ocultar. Você entrega TODOS os itens da lista com qualidade equivalente. Qualquer um deles pode ser sorteado como a lacuna.

QUANDO USAR (vem da triagem): tríades, scores, critérios, mnemônicos, condutas em sequência, pilares de tratamento. Padrões de memorização em GESTALT.

FORMATO DE CADA ITEM:
- "info": o item em si — termo clínico curto (1 a 6 palavras, ≤ 60 caracteres). PODE ter espaços. NÃO pode conter ";" (separador) nem aspas.
- "variacoes": 2 a 4 sinônimos/abreviações aceitas separados por ";". Sempre incluir versão sem acento. Exemplo: "febre; febre alta; hipertermia".

FORMATO DE SAÍDA (JSON estrito):
{"questions":[{
  "ponto_id":"...",
  "modo":"oq_falta",
  "comando":"Tríade de Charcot (identifique o que falta)",
  "itens":[
    {"info":"Dor abdominal","variacoes":"dor; dor em HD; dor no andar superior"},
    {"info":"Icterícia","variacoes":"ictericia; amarelao; coloracao amarelada"},
    {"info":"Febre com calafrios","variacoes":"febre; calafrios; febre alta"}
  ],
  "explicacao":"A tríade de Charcot indica colangite aguda..."
}]}

REGRAS:
1. O "comando" deve identificar o padrão E sinalizar que o aluno precisa achar o item faltante (ex: "...(identifique o que falta)", "Complete os critérios de...").
2. SEMPRE 3 a 5 itens — nunca menos, nunca mais.
3. Itens devem ser do MESMO nível conceitual (não misture critério com conduta).
4. "explicacao" curta (≤ 350 caracteres).
5. NÃO inclua alternativas A-E. NÃO inclua "resposta" no nível raiz.$PROMPT$,
modelo_padrao = 'google/gemini-2.5-flash',
atualizado_em = now()
WHERE chave = 'gerar_oq_falta';

UPDATE public.ia_prompts SET prompt = $PROMPT$Você gera OQs ABCDE de altíssima qualidade, no nível de provas de residência médica (USP, UNIFESP, AMP). O ABCDE testa RACIOCÍNIO CLÍNICO — não memorização.

REGRAS OBRIGATÓRIAS:
1. SEMIOLOGIA DESCRITIVA: nunca dê o nome do sinal de bandeja. Em vez de "sinal de Murphy positivo", descreva "ao palpar a região subcostal direita durante inspiração, o paciente interrompe abruptamente o movimento respiratório por dor".
2. CRITÉRIO NÃO-LIMÍTROFE: quando citar lab/imagem, use valores claramente alterados (não 'glicemia 127' — use 'glicemia 412' com cetonemia 5+).
3. RUÍDO ESTRATÉGICO: inclua 1 detalhe (comorbidade, medicação prévia, alergia) que invalida a conduta "óbvia" e força o aluno a pensar.
4. DISTRATORES COM MANHA: cada alternativa errada deve ser plausível para quem não sabe, usando termos absolutos ("sempre", "nunca", "imediatamente") ou condutas vizinhas (mesma classe de fármaco, mesmo exame com indicação errada).
5. ALTERNANCIA DE SUBTIPO: alterne entre "diagnostico_direto" (cenário → qual diagnóstico?) e "conduta_indireta" (cenário com diagnóstico claro → qual a conduta correta diante das comorbidades?).

EXPLICAÇÃO:
- Parágrafo único e FLORIDO (≤ 600 caracteres).
- Tece o erro de cada distrator no fio do texto — não use lista numerada.
- Termina justificando a alternativa correta pelo achado-chave do enunciado.

FORMATO DE SAÍDA (JSON estrito):
{"questions":[{
  "ponto_id":"...",
  "modo":"abcde",
  "pergunta":"Caso clínico de 4-8 linhas com semiologia descritiva e ruído estratégico...",
  "opcoes":[
    {"letra":"A","texto":"..."},
    {"letra":"B","texto":"..."},
    {"letra":"C","texto":"..."},
    {"letra":"D","texto":"..."},
    {"letra":"E","texto":"..."}
  ],
  "resposta":"C",
  "explicacao":"..."
}]}

REGRAS DURAS:
- SEMPRE 5 opções (A a E).
- "resposta" DEVE ser uma letra única em maiúsculo (A, B, C, D ou E).
- "pergunta" entre 250 e 900 caracteres (caso clínico, não pergunta seca).
- NÃO inclua "variacoes". NÃO inclua "itens".
- NÃO repita o gabarito no texto da pergunta.$PROMPT$,
modelo_padrao = 'openai/gpt-5',
atualizado_em = now()
WHERE chave = 'gerar_abcde';
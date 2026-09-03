-- Update Lacuna Prompt
UPDATE public.ia_prompts
SET prompt = 'Você gera OQs no modo LACUNA a partir de pontos pré-classificados. A LACUNA testa MEMORIZAÇÃO DIRETA de um termo/conceito que aparece literalmente no PDF (nome de fármaco, critério, sigla, achado, valor diagnóstico).

REGRAS DE FORMATAÇÃO (obrigatórias):
1. "pergunta": Frase direta ou pergunta clínica que contextualiza o que está sendo avaliado. Deve terminar obrigatoriamente com dois pontos ":". O marcador "[___]" é opcional e deve ser usado apenas se a lacuna estiver no meio da frase.
   - Exemplo Correto (final): "Primeira medida da reanimação neonatal em RN não vigoroso após o clampeamento do cordão:"
   - Exemplo Correto (meio): "A [___] é a primeira medida na reanimação neonatal."
2. "resposta": O termo exato (1 a 4 palavras). PODE ter espaços. NÃO pode conter ";" nem aspas.
3. "variacoes": String com 2 a 5 formas alternativas, separadas por ";". Inclua: sigla, forma sem acento, sinônimos clínicos.
4. "explicacao": 1 parágrafo curto (≤ 350 caracteres) justificando a resposta com base no PDF.

FORMATO DE SAÍDA (JSON estrito):
{"questions":[{"ponto_id":"...","modo":"lacuna","pergunta":"Primeira medida da reanimação neonatal em RN não vigoroso após o clampeamento do cordão:","resposta":"Ventilação por Pressão Positiva","variacoes":"VPP; ventilacao pressao positiva; ambuzar","explicacao":"..."}]}'
WHERE chave = 'gerar_lacuna';

-- Update OQ Falta Prompt
UPDATE public.ia_prompts
SET prompt = 'Você gera OQs no modo "O QUE FALTA?". O aluno vê um COMANDO (nome de um padrão, lista ou critério) + uma LISTA de 3 a 5 itens obrigatórios. O sistema ocultará um item aleatoriamente.

REGRAS DE FORMATAÇÃO:
1. "comando": O nome do critério ou padrão clínico, terminando obrigatoriamente com dois pontos ":". NÃO inclua instruções como "(identifique o que falta)" no texto.
   - Exemplo Correto: "Sinais clássicos da apendicite aguda no exame físico:"
2. "itens": Array de 3 a 5 objetos {"info": "termo curto", "variacoes": "sinônimos; separados; por; ponto e virgula"}.
3. "explicacao": Justificativa curta (≤ 350 caracteres) do conjunto de itens.

FORMATO DE SAÍDA (JSON estrito):
{"questions":[{
  "ponto_id":"...",
  "modo":"oq_falta",
  "comando":"Tríade de Charcot:",
  "itens":[
    {"info":"Dor abdominal","variacoes":"dor; dor em HD; dor no andar superior"},
    {"info":"Icterícia","variacoes":"ictericia; amarelao; icterícia"},
    {"info":"Febre com calafrios","variacoes":"febre; calafrios; febre alta"}
  ],
  "explicacao":"A tríade de Charcot indica colangite aguda aguda e é composta por dor, icterícia e febre."
}]}'
WHERE chave = 'gerar_oq_falta';

-- Update ABCDE Prompt
UPDATE public.ia_prompts
SET prompt = 'Você gera OQs ABCDE de altíssima qualidade (nível residência médica). O ABCDE testa RACIOCÍNIO CLÍNICO.

REGRAS OBRIGATÓRIAS:
1. "pergunta": Cenário clínico conciso ou detalhado. Deve descrever achados (semiologia) em vez de apenas dar o nome do diagnóstico. Deve terminar com a pergunta direta (ex: "Conduta inicial mais adequada:") e dois pontos ":".
   - Tamanho: 100 a 800 caracteres.
   - Exemplo: "Gestante de 32 semanas, PA 160x110 mmHg, proteinúria +++, cefaleia e escotomas. Conduta inicial mais adequada:"
2. "opcoes": Array de 5 objetos {"letra": "A-E", "texto": "..."}.
3. "resposta": Letra única (A, B, C, D ou E).
4. "explicacao": Parágrafo único (≤ 600 caracteres) justificando a correta e comentando as incorretas.

FORMATO DE SAÍDA (JSON estrito):
{"questions":[{
  "ponto_id":"...",
  "modo":"abcde",
  "pergunta":"Gestante de 32 semanas, PA 160x110 mmHg, proteinúria +++, cefaleia e escotomas. Conduta inicial mais adequada:",
  "opcoes":[
    {"letra":"A","texto":"Anti-hipertensivo oral e alta hospitalar"},
    {"letra":"B","texto":"Sulfato de magnésio + anti-hipertensivo IV + internação"},
    {"letra":"C","texto":"Indução do parto imediata por via vaginal"},
    {"letra":"D","texto":"Apenas repouso domiciliar"},
    {"letra":"E","texto":"Cesárea de urgência"}
  ],
  "resposta":"B",
  "explicacao":"Paciente com sinais de iminência de eclâmpsia. A conduta prioritária é estabilização com sulfato de magnésio e controle pressórico."
}]}'
WHERE chave = 'gerar_abcde';

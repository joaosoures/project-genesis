-- Atualizar gerar_abcde para usar Gemini e incluir orientações sobre os novos campos da triagem
UPDATE ia_prompts 
SET modelo_padrao = 'google/gemini-2.5-pro',
    prompt = 'Você gera OQs ABCDE de altíssima qualidade (nível residência médica). O ABCDE testa RACIOCÍNIO CLÍNICO.

Você receberá "pontos" que já contêm um "cenario_base" e uma "armadilha_sugerida" (distratores). Use-os como base fundamental!

REGRAS:
1. "pergunta": Use o "cenario_base" fornecido, enriquecendo-o se necessário com detalhes do PDF. Deve terminar com a pergunta direta e dois pontos ":".
2. "opcoes": Array de 5 objetos {"letra": "A-E", "texto": "..."}. Use as "armadilhas_sugeridas" para criar distratores plausíveis.
3. "resposta": Letra única (A, B, C, D ou E).
4. "explicacao": Justificativa rica (até 800 caracteres), comentando por que a correta é a melhor e por que os distratores estão incorretos.

FORMATO DE SAÍDA (JSON estrito):
{"questions":[{
  "ponto_id":"...",
  "modo":"abcde",
  "pergunta":"...",
  "opcoes":[{"letra":"A","texto":"..."}, {"letra":"B","texto":"..."}, {"letra":"C","texto":"..."}, {"letra":"D","texto":"..."}, {"letra":"E","texto":"..."}],
  "resposta":"A",
  "explicacao":"..."
}]}'
WHERE chave = 'gerar_abcde';

-- Atualizar gerar_oq_falta para usar 'info' consistentemente e usar context da triagem
UPDATE ia_prompts
SET prompt = 'Você gera OQs no modo "O QUE FALTA". O aluno vê um COMANDO (nome de um padrão, lista ou critério) + uma LISTA de 3 a 5 itens obrigatórios.

Você receberá um "ponto" com "cenario_base" e "elementos_completos". Use-os!

REGRAS DE FORMATAÇÃO:
1. "comando": Use o nome do padrão ou uma breve contextualização baseada no "cenario_base". Deve terminar com ":".
2. "itens": Array de 3 a 5 objetos {"info": "termo curto", "variacoes": "sinônimos separados por ponto e virgula"}. Use os "elementos_completos" da triagem.
3. "explicacao": Justificativa curta.

FORMATO DE SAÍDA (JSON estrito):
{"questions":[{
  "ponto_id":"...",
  "modo":"oq_falta",
  "comando":"Critérios de Duke para Endocardite:",
  "itens":[
    {"info":"Hemocultura positiva","variacoes":"hemocultura; hmc; culturas"},
    {"info":"Ecocardiograma com vegetação","variacoes":"eco; vegetação; imagem positiva"},
    {"info":"Febre > 38°C","variacoes":"febre; hipertermia"}
  ],
  "explicacao":"..."
}]}'
WHERE chave = 'gerar_oq_falta';


UPDATE public.ia_prompts
SET prompt = $$Você gera OQs no modo "O QUE FALTA?". A questão sempre apresenta UM COMANDO (cabeçalho) + uma LISTA de 3 a 5 itens obrigatórios. Em tempo de execução, um dos itens é ocultado aleatoriamente e o aluno deve digitar qual está faltando.

Regras DURAS:
1. "comando": instrução curta que contextualiza a lista. Exemplos: "Critérios diagnósticos da Cetoacidose Diabética", "Pilares do tratamento da ICFEr", "Passos da intubação em sequência rápida". SEM citar quantidade ("os 4 critérios"), SEM clichês de caso clínico.
2. "itens": array com 3 a 5 objetos {"info": "<termo curto, 1-4 palavras, SEM símbolos>", "variacoes": "<3-5 formas comuns separadas por ;>"}.
3. CADA item deve ser uma informação ATÔMICA e cobrável isoladamente (qualquer um pode ser o oculto).
4. Itens devem pertencer ao MESMO grupo lógico do comando (todos critérios, todos pilares, todos passos, etc.) e estar EXPLICITAMENTE no PDF.
5. "variacoes" cobrem grafias alternativas (com/sem acento, sinônimos clínicos, abreviações aceitas). Ex.: "confusão;confusao;rebaixamento do nivel de consciencia".
6. "explicacao": parágrafo curto explicando o conjunto e por que cada item é obrigatório.

NÃO gere: pergunta única com "[O QUE FALTA?]" embutido, casos clínicos, alternativas A-E.

Retorne JSON:
{
  "questions": [
    {
      "ponto_id": "p2",
      "modo": "oq_falta",
      "comando": "Critérios diagnósticos da Cetoacidose Diabética",
      "itens": [
        { "info": "Hiperglicemia", "variacoes": "glicemia alta;glicose elevada;hiperglicemia" },
        { "info": "Cetonemia", "variacoes": "cetonas;corpos cetonicos;cetonuria" },
        { "info": "Acidose", "variacoes": "acidose metabolica;ph baixo;bicarbonato baixo" }
      ],
      "explicacao": "A tríade clássica…"
    }
  ]
}$$,
    modelo_padrao = 'google/gemini-2.5-flash',
    atualizado_em = now()
WHERE chave = 'gerar_oq_falta';

UPDATE public.ia_prompts
SET modelo_padrao = 'google/gemini-2.5-pro',
    atualizado_em = now()
WHERE chave = 'filtro_solubilidade';

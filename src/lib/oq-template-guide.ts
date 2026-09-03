import ExcelJS from "exceljs";

export const TEMPLATE_HEADERS = [
  "Especialidade", "Modo", "comando",
  "resposta 1", "variações 1",
  "resposta 2", "variações 2",
  "resposta 3", "variações 3",
  "resposta 4", "variações 4",
  "resposta 5", "variações 5",
  "gabarito", "explicação",
];

export const TEMPLATE_COLUMNS = [
  { width: 22 }, { width: 12 }, { width: 45 },
  { width: 28 }, { width: 24 },
  { width: 28 }, { width: 24 },
  { width: 28 }, { width: 24 },
  { width: 28 }, { width: 24 },
  { width: 28 }, { width: 24 },
  { width: 14 }, { width: 45 },
];

export const TEMPLATE_ROWS: (string | number)[][] = [
  // ABCDE: resposta 1..5 = alternativas A..E; gabarito = letra (A-E) ou texto exato da correta
  [
    "Clínica Médica", "ABCDE",
    "Qual o principal achado eletrocardiográfico na pericardite aguda?",
    "Infradesnivelamento do segmento PR", "",
    "Supradesnivelamento de ST convexo", "",
    "Onda T apiculada", "",
    "Complexo QRS largo", "",
    "Onda U proeminente", "",
    "A",
    "Na pericardite aguda, o infra de PR é altamente específico na fase inicial.",
  ],
  // Lacuna: usa apenas resposta 1 + variações 1; demais respostas/variações em branco; gabarito vazio
  [
    "Pediatria", "Lacuna",
    "O principal objetivo da ____ é manter a oxigenação e ventilação do recém-nascido.",
    "Ventilação com Pressão Positiva", "VPP; ventilacao de pressao positiva; ambuzar",
    "", "", "", "", "", "", "", "",
    "",
    "A VPP é a medida mais importante na reanimação neonatal.",
  ],
  // OQ Falta: todos os 5 pares preenchidos; gabarito vazio (app sorteia qual omitir)
  [
    "Cirurgia Geral", "OQ Falta",
    "Critérios de Ranson na admissão da pancreatite aguda:",
    "Idade maior que 55 anos", "idade>55; idade acima de 55",
    "Leucócitos acima de 16.000", "leuco>16000; leucocitose >16k",
    "Glicemia acima de 200 mg/dL", "glicemia>200; hiperglicemia >200",
    "LDH acima de 350 U/L", "LDH>350",
    "AST acima de 250 U/L", "AST>250; TGO>250",
    "",
    "Os 5 critérios de Ranson na admissão avaliam gravidade inicial da pancreatite aguda.",
  ],
];

export function addGuideSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet("Guia de Preenchimento");
  ws.columns = [{ width: 28 }, { width: 90 }];

  const rows: [string, string][] = [
    ["COLUNAS OBRIGATÓRIAS", "Especialidade | Modo | comando | resposta 1..5 | variações 1..5 | gabarito | explicação (15 colunas)"],
    ["", ""],
    ["Especialidade", "Use exatamente: Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia e Obstetrícia ou Medicina Preventiva."],
    ["Modo", "Use exatamente: ABCDE, Lacuna ou OQ Falta."],
    ["comando", "Enunciado da questão. Use ____ (4 underscores) para marcar a lacuna no modo Lacuna."],
    ["", ""],
    ["MODO ABCDE", ""],
    ["resposta 1..5", "Texto de cada alternativa A, B, C, D, E (todas obrigatórias)."],
    ["variações 1..5", "Deixe em BRANCO (não são usadas no modo ABCDE)."],
    ["gabarito", "Letra da correta (A, B, C, D ou E) OU o texto exato de uma das alternativas."],
    ["explicação", "Justificativa completa do gabarito e, idealmente, dos distratores."],
    ["", ""],
    ["MODO LACUNA", ""],
    ["comando", "Frase com ____ no local da palavra a ser preenchida."],
    ["resposta 1", "Termo principal aceito como correto."],
    ["variações 1", "Sinônimos, siglas e formas alternativas separadas por ; (ex: VPP; ventilacao de pressao positiva). Opcional."],
    ["resposta 2..5 / variações 2..5", "Deixe em BRANCO."],
    ["gabarito", "Deixe em BRANCO (o app considera resposta 1 + variações 1)."],
    ["explicação", "Justificativa do termo correto."],
    ["", ""],
    ["MODO OQ FALTA", ""],
    ["resposta 1..5", "Os 5 itens do grupo/critério/tríade/conjunto. Todos preenchidos."],
    ["variações 1..5", "Para CADA item, liste sinônimos/siglas separados por ;. Opcional, mas recomendado."],
    ["gabarito", "Deixe em BRANCO. O app sorteia qual dos 5 itens será omitido a cada estudo."],
    ["explicação", "Contexto geral do conjunto (o que define o grupo)."],
    ["", ""],
    ["INTELIGÊNCIA DE ACEITAÇÃO", "O app usa Distância de Levenshtein e normalização (ignora acentos, caixa e espaços extras). Variações ampliam ainda mais a tolerância."],
    ["SÍMBOLOS PROIBIDOS", "Não use <, >, ≥, ≤ ou LaTeX. Escreva por extenso (ex: maior ou igual a, menor que)."],
    ["LIMITE POR UPLOAD (aluno)", "Máximo de 20 OQs por planilha. Admin: sem limite."],
  ];

  const header = ws.addRow(["Campo / Regra", "Como preencher"]);
  header.font = { bold: true };
  header.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE8F0FF" } }; });

  rows.forEach((r) => {
    const row = ws.addRow(r);
    row.alignment = { vertical: "top", wrapText: true };
    if (!r[1] && r[0] && r[0] === r[0].toUpperCase()) {
      row.font = { bold: true };
      row.eachCell((c) => { c.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF5F5F5" } }; });
    }
  });
}

export const PROMPT_MESTRE = `VOCÊ É UM ESPECIALISTA EM PREPARAÇÃO DE ALTO RENDIMENTO PARA RESIDÊNCIA MÉDICA.
Sua missão é transformar o resumo anexado em 25 questões estratégicas (OQs) para revisão espaçada, cobrindo 100% do conteúdo com foco em temas ouro, conceitos complexos e casos clínicos.

FORMATO DE SAÍDA OBRIGATÓRIO:
Gere EXATAMENTE 1 tabela com 15 colunas e 25 linhas de dados, nesta ordem:
Especialidade | Modo | comando | resposta 1 | variações 1 | resposta 2 | variações 2 | resposta 3 | variações 3 | resposta 4 | variações 4 | resposta 5 | variações 5 | gabarito | explicação

VALORES PERMITIDOS:
- Especialidade: Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia e Obstetrícia ou Medicina Preventiva.
- Modo: ABCDE, Lacuna ou OQ Falta.

REGRAS POR MODO (NUNCA INVENTE OUTROS FORMATOS):

1) ABCDE
- resposta 1..5 = alternativas A, B, C, D, E (todas preenchidas).
- variações 1..5 = VAZIAS.
- gabarito = letra (A-E) OU o texto idêntico de uma das respostas.

2) Lacuna
- comando contém "____" (4 underscores) no local da lacuna.
- resposta 1 = termo principal correto.
- variações 1 = sinônimos/siglas separados por ";" (mínimo 3 quando aplicável).
- resposta 2..5 e variações 2..5 = VAZIAS.
- gabarito = VAZIO.

3) OQ Falta
- resposta 1..5 = os 5 itens do conjunto (tríade/critério/lista), todos preenchidos.
- variações 1..5 = sinônimos/siglas de CADA item, separados por ";".
- gabarito = VAZIO (o app sorteia qual item omitir).

DIRETRIZES DE CONTEÚDO:
- Explicação com no mínimo 5 linhas, justificando o gabarito e, em ABCDE, por que cada distrator está errado.
- Foque em "temas ouro": difíceis, muito cobrados, fáceis de esquecer.
- Priorize casos clínicos para diagnóstico/conduta.
- NUNCA use símbolos matemáticos (<, >, ≥, ≤) nem LaTeX. Escreva por extenso ("maior ou igual a", "menor que").
- Separadores dentro de "variações": ponto-e-vírgula ";".

[ANEXE OU COLE SEU RESUMO ABAIXO E GERE A TABELA]`;

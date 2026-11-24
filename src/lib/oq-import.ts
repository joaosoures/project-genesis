import type { Especialidade, Modo } from "@/lib/oq";

export interface ImportedOq {
  modo: Modo;
  especialidade: Especialidade;
  comando: string;
  respostas: string[];
  gabarito: string | null;
  variacoes: string[];
  explicacao: string;
}

export type CardImportPayload = {
  modo: Modo;
  especialidade: Especialidade;
  comando: string;
  alternativa_a: string | null;
  alternativa_b: string | null;
  alternativa_c: string | null;
  alternativa_d: string | null;
  alternativa_e: string | null;
  alternativa_correta: string | null;
  info_1: string | null;
  info_2: string | null;
  info_3: string | null;
  info_4: string | null;
  info_5: string | null;
  var_1: string | null;
  var_2: string | null;
  var_3: string | null;
  var_4: string | null;
  var_5: string | null;
  explicacao: string;
  origem: "admin";
  criado_por_usuario_id: null;
  verificado: true;
  aula_id: string;
};

const specialtyLabels: Record<string, Especialidade> = {
  clinicamedica: "clinica_medica", clinica: "clinica_medica", clinica_medica: "clinica_medica",
  cirurgiageral: "cirurgia_geral", cirurgia: "cirurgia_geral", cirurgia_geral: "cirurgia_geral",
  pediatria: "pediatria", ginecologiaobstetricia: "ginecologia_obstetricia", obstetriciaeginecologia: "ginecologia_obstetricia",
  ginecologia_obstetricia: "ginecologia_obstetricia", medicinapreventivaesocial: "medicina_preventiva", medicina_preventiva: "medicina_preventiva",
  saudemental: "saude_mental", saude_mental: "saude_mental",
};

const cleanKey = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const get = (value: Record<string, unknown>, ...names: string[]) => {
  const entries = Object.entries(value).map(([key, item]) => [cleanKey(key), item] as const);
  for (const name of names) {
    const item = entries.find(([key]) => key === cleanKey(name))?.[1];
    if (item !== undefined && item !== null && item !== "") return item;
  }
  return undefined;
};
const asText = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value).trim() : "";

function cleanMarkdownJson(source: string) {
  return source
    .replace(/&#x20;|&#32;|&nbsp;/gi, " ")
    .replace(/\\\r?\n/g, "\n")
    .replace(/(?<!\\)\\([_*#\-\[\]])/g, "$1");
}

function extractJson(source: string) {
  const text = cleanMarkdownJson(source).replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "");
  let quote: string | null = null;
  let escaped = false;
  let start = -1;
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quote) {
      if (quote === '"' && escaped) escaped = false;
      else if (quote === '"' && char === "\\") escaped = true;
      else if ((quote === '"' && char === '"') || (quote === '“' && char === '”') || (quote === '„' && (char === '”' || char === '‟'))) quote = null;
      continue;
    }
    if (char === '"' || char === '“' || char === '„' || char === '‟') { quote = char; continue; }
    if (start < 0 && (char === "[" || char === "{")) {
      start = index;
      depth = 1;
      continue;
    }
    if (start >= 0) {
      if (char === "[" || char === "{") depth += 1;
      if (char === "]" || char === "}") {
        depth -= 1;
        if (depth === 0) return text.slice(start, index + 1);
      }
    }
  }
  if (start >= 0) return text.slice(start);
  throw new Error("Não foi encontrado um bloco JSON (array ou objeto) no texto informado.");
}

function normalizeJsonFragment(fragment: string) {
  let output = "";
  let quote: string | null = null;
  let escaped = false;
  for (let index = 0; index < fragment.length; index += 1) {
    const char = fragment[index];
    if (quote) {
      if (quote === '"' && escaped) { output += char; escaped = false; continue; }
      if (quote === '"' && char === "\\") { output += char; escaped = true; continue; }
      if ((quote === '"' && char === '"') || (quote === '“' && char === '”') || (quote === '„' && (char === '”' || char === '‟'))) { output += '"'; quote = null; continue; }
      if (char === "\n" || char === "\r" || char === "\t") { output += char === "\t" ? "\\t" : "\\n"; continue; }
      output += char;
      continue;
    }
    if (char === '“' || char === '„') { output += '"'; quote = char; continue; }
    if (char === '”' || char === '‟') { output += '"'; continue; }
    if (char === '‘' || char === '’') { output += "'"; continue; }
    if (char === '"') { output += char; quote = char; continue; }
    output += char;
  }
  return output.replace(/,\s*([}\]])/g, "$1");
}

function modeFrom(value: unknown, index: number): Modo {
  const mode = cleanKey(asText(value));
  if (["abcde", "multiplaescolha", "multipla", "multiplechoice"].includes(mode)) return "abcde";
  if (["lacuna", "fillblank", "preenchimentodelacuna"].includes(mode)) return "lacuna";
  if (["oqfalta", "faltante", "elementofaltante"].includes(mode)) return "oq_falta";
  throw new Error(`Item ${index}: campo "modo" inválido ou ausente. Use ABCDE, Lacuna ou OQ Falta.`);
}

function stringList(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(asText).filter(Boolean);
  if (typeof value === "string") return value.split(/[;|\n]/).map(item => item.trim()).filter(Boolean);
  return [];
}

function normalizeItem(raw: unknown, index: number, targetSpecialty: Especialidade): ImportedOq {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new Error(`Item ${index}: esperado um objeto.`);
  const item = record(raw);
  const modo = modeFrom(get(item, "modo", "tipo", "formato"), index);
  const rawSpecialty = get(item, "especialidade", "specialty", "area");
  const specialty = rawSpecialty === undefined ? targetSpecialty : specialtyLabels[cleanKey(asText(rawSpecialty))];
  if (!specialty) throw new Error(`Item ${index}: especialidade desconhecida.`);
  if (specialty !== targetSpecialty) throw new Error(`Item ${index}: especialidade ${asText(rawSpecialty)} diverge da aula selecionada (${targetSpecialty}).`);

  const comando = asText(get(item, "comando", "questao", "pergunta", "enunciado", "question"));
  if (!comando) throw new Error(`Item ${index}: campo "comando" ausente ou vazio.`);
  const explanation = asText(get(item, "explicacao", "explicação", "justificativa", "explanation")) || "Explicação não disponível.";
  const answersValue = get(item, "respostas", "alternativas", "opcoes", "opções", "itens");
  const answersRecord = record(answersValue);
  let respostas: string[] = [];
  let gabarito: string | null = null;

  if (modo === "abcde") {
    const source = Object.keys(answersRecord).length ? answersRecord : item;
    respostas = ["a", "b", "c", "d", "e"].map((letter, answerIndex) => asText(get(source, letter, `alternativa_${letter}`, `alternativa ${letter}`, `resposta ${answerIndex + 1}`, `opcao_${letter}`, `opção ${letter}`)));
    if (Array.isArray(answersValue)) respostas = [0, 1, 2, 3, 4].map(position => asText(answersValue[position]));
    if (respostas.slice(0, 4).some(answer => !answer)) throw new Error(`Item ${index}: ABCDE exige as alternativas A, B, C e D.`);
    const rawKey = asText(get(item, "gabarito", "alternativa_correta", "correta", "resposta_correta", "correct" ) ?? get(answersRecord, "correta", "gabarito"));
    if (!rawKey) throw new Error(`Item ${index}: campo "gabarito" ausente.`);
    const letter = rawKey.toUpperCase().replace(/[^A-E]/g, "");
    const answerIndex = /^[A-E]$/.test(rawKey.toUpperCase()) ? "ABCDE".indexOf(rawKey.toUpperCase()) : respostas.findIndex(answer => answer.toLocaleLowerCase() === rawKey.toLocaleLowerCase());
    if (answerIndex < 0 || answerIndex > 4) throw new Error(`Item ${index}: gabarito deve ser A–E ou corresponder exatamente a uma alternativa.`);
    if (!respostas[answerIndex]) throw new Error(`Item ${index}: o gabarito aponta para a alternativa ${letter || "E"}, mas ela está vazia.`);
    gabarito = "ABCDE"[answerIndex];
  } else {
    const values = Array.isArray(answersValue) ? answersValue : [];
    if (modo === "lacuna") {
      if (!comando.includes("____")) throw new Error(`Item ${index}: modo Lacuna exige o marcador ____ no comando.`);
      const answer = asText(get(answersRecord, "resposta", "resposta 1", "info_1", "info 1") ?? get(item, "resposta", "resposta 1", "info_1", "info 1") ?? values[0]);
      if (!answer) throw new Error(`Item ${index}: campo "resposta" da Lacuna ausente.`);
      respostas = [answer];
    } else {
      const sourceList = Array.isArray(answersValue) ? values : [];
      respostas = sourceList.map(value => typeof value === "object" ? asText(get(record(value), "resposta", "resposta correta", "item")) : asText(value)).filter(Boolean);
      if (respostas.length === 0) respostas = [1, 2, 3, 4, 5].map(number => asText(get(answersRecord, `resposta ${number}`, `info_${number}`, `info ${number}`) ?? get(item, `resposta ${number}`, `info_${number}`, `info ${number}`))).filter(Boolean);
      if (respostas.length < 2 || respostas.length > 5) throw new Error(`Item ${index}: OQ Falta exige de 2 a 5 respostas/itens.`);
    }
  }

  const variationsValue = get(item, "variacoes", "variações", "variations");
  let variacoes = Array.isArray(variationsValue)
    ? variationsValue.map(value => typeof value === "object" ? asText(get(record(value), "variacoes", "variações", "variacao", "variação", "var")) : asText(value))
    : stringList(variationsValue);
  if (modo === "abcde") variacoes = [];
  if (!variacoes.length) {
    const variationRecord = record(variationsValue);
    const maximum = modo === "oq_falta" ? respostas.length : 1;
    variacoes = Array.from({ length: maximum }, (_, position) => asText(get(variationRecord, `var_${position + 1}`, `variacao ${position + 1}`, `variações ${position + 1}`) ?? get(item, `var_${position + 1}`, `variacao ${position + 1}`, `variações ${position + 1}`)));
  }
  if (modo === "lacuna" && !variacoes[0]) throw new Error(`Item ${index}: campo "variações" é obrigatório para Lacuna.`);
  if (modo === "oq_falta" && respostas.some((_, position) => !variacoes[position])) throw new Error(`Item ${index}: informe uma variação para cada resposta do OQ Falta.`);
  return { modo, especialidade: specialty, comando, respostas, gabarito, variacoes, explicacao: explanation };
}

export function parseOqsJson(rawInput: string, targetSpecialty: Especialidade): ImportedOq[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalizeJsonFragment(extractJson(rawInput)));
  } catch (error) {
    const message = error instanceof Error ? error.message : "sintaxe inválida";
    throw new Error(`JSON inválido: ${message}`);
  }
  const values = Array.isArray(parsed) ? parsed : record(parsed).oqs;
  if (!Array.isArray(values)) throw new Error('O JSON deve ser um array direto ou um objeto com a propriedade "oqs".');
  if (!values.length) throw new Error("O JSON não contém OQs para importar.");
  return values.map((item, position) => normalizeItem(item, position + 1, targetSpecialty));
}

export function toCardImportPayload(oq: ImportedOq, aulaId: string): CardImportPayload {
  const empty = { alternativa_a: null, alternativa_b: null, alternativa_c: null, alternativa_d: null, alternativa_e: null, alternativa_correta: null, info_1: null, info_2: null, info_3: null, info_4: null, info_5: null, var_1: null, var_2: null, var_3: null, var_4: null, var_5: null };
  const payload: CardImportPayload = { ...empty, modo: oq.modo, especialidade: oq.especialidade, comando: oq.comando, explicacao: oq.explicacao, origem: "admin", criado_por_usuario_id: null, verificado: true, aula_id: aulaId };
  if (oq.modo === "abcde") {
    ["a", "b", "c", "d", "e"].forEach((letter, index) => { payload[`alternativa_${letter}` as "alternativa_a"] = oq.respostas[index] as never; });
    payload.alternativa_correta = oq.gabarito;
  } else {
    oq.respostas.forEach((answer, index) => {
      payload[`info_${index + 1}` as "info_1"] = answer as never;
      payload[`var_${index + 1}` as "var_1"] = (oq.variacoes[index] || null) as never;
    });
    if (oq.modo === "lacuna" && !payload.comando.includes("[___]")) payload.comando = payload.comando.replace("____", "[___]");
  }
  return payload;
}

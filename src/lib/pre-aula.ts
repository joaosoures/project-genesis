import ExcelJS from "exceljs";
import type { CardRow, Especialidade } from "@/lib/oq";

export interface PreAulaSpreadsheetRow {
  rowNumber: number;
  materia: string;
  questao: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string | null;
  gabarito: string;
  justificativa: string;
}

export interface InvalidPreAulaRow {
  rowNumber: number;
  errors: string[];
}

export interface ParsedPreAulaSheet {
  validRows: PreAulaSpreadsheetRow[];
  invalidRows: InvalidPreAulaRow[];
}

export interface PreAulaQuestionRow {
  id: string;
  material_id: string;
  especialidade: Especialidade;
  questao: string;
  alternativa_a: string;
  alternativa_b: string;
  alternativa_c: string;
  alternativa_d: string;
  alternativa_e: string | null;
  gabarito: string;
  justificativa: string;
  ordem: number;
  ativo: boolean;
}

export interface MaterialMatchCandidate {
  id: string;
  nome: string;
  especialidade: string;
}

const REQUIRED_HEADERS = [
  "materia",
  "questao",
  "alt_a",
  "alt_b",
  "alt_c",
  "alt_d",
  "gabarito",
  "justificativa",
] as const;

const HEADER_ALIASES: Record<string, string> = {
  materia: "materia",
  matéria: "materia",
  questao: "questao",
  questão: "questao",
  alt_a: "alt_a",
  alternativa_a: "alt_a",
  alta: "alt_a",
  alt_b: "alt_b",
  alternativa_b: "alt_b",
  altb: "alt_b",
  alt_c: "alt_c",
  alternativa_c: "alt_c",
  altc: "alt_c",
  alt_d: "alt_d",
  alternativa_d: "alt_d",
  altd: "alt_d",
  alt_e: "alt_e",
  alternativa_e: "alt_e",
  alte: "alt_e",
  gabarito: "gabarito",
  justificativa: "justificativa",
  justificativa_do_gabarito: "justificativa",
};

export function normalizePreAulaText(value: string): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/^\uFEFF/, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function normalizeHeader(value: string): string {
  const normalized = normalizePreAulaText(value).replace(/\s+/g, "_");
  return HEADER_ALIASES[normalized] ?? normalized;
}

function cellText(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "object" && "text" in value) {
    return String((value as { text?: unknown }).text ?? "").trim();
  }
  if (typeof value === "object" && "result" in value) {
    return String((value as { result?: unknown }).result ?? "").trim();
  }
  return String(value).trim();
}

function detectCsvDelimiter(source: string): "," | ";" {
  let commas = 0;
  let semicolons = 0;
  let quoted = false;
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (char === '"') {
      if (quoted && source[i + 1] === '"') i += 1;
      else quoted = !quoted;
    } else if (!quoted && char === "\n") break;
    else if (!quoted && char === ",") commas += 1;
    else if (!quoted && char === ";") semicolons += 1;
  }
  return semicolons > commas ? ";" : ",";
}

export function parsePreAulaCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const source = text.replace(/^\uFEFF/, "");
  const delimiter = detectCsvDelimiter(source);

  for (let i = 0; i < source.length; i += 1) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') quoted = true;
    else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}

async function readSpreadsheet(file: File): Promise<string[][]> {
  if (file.name.toLowerCase().endsWith(".csv")) {
    return parsePreAulaCsv(await file.text());
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const worksheet = workbook.worksheets[0];
  if (!worksheet) throw new Error("A planilha não possui nenhuma aba.");

  const rows: string[][] = [];
  worksheet.eachRow({ includeEmpty: true }, (excelRow) => {
    const values: string[] = [];
    for (let col = 1; col <= excelRow.cellCount; col += 1) {
      values.push(cellText(excelRow.getCell(col).value));
    }
    rows.push(values);
  });
  return rows;
}

export async function parsePreAulaFile(file: File): Promise<ParsedPreAulaSheet> {
  if (!/\.(xlsx|csv)$/i.test(file.name)) {
    throw new Error("Envie um arquivo .xlsx ou .csv.");
  }

  const rows = await readSpreadsheet(file);
  if (rows.length < 2) throw new Error("A planilha não contém questões.");

  const headers = rows[0].map(normalizeHeader);
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length > 0) {
    throw new Error(`Colunas obrigatórias ausentes: ${missing.join(", ")}.`);
  }

  const validRows: PreAulaSpreadsheetRow[] = [];
  const invalidRows: InvalidPreAulaRow[] = [];

  rows.slice(1).forEach((values, index) => {
    if (values.every((value) => !String(value ?? "").trim())) return;
    const data = Object.fromEntries(headers.map((header, column) => [header, cellText(values[column])])) as Record<string, string>;
    const rowNumber = index + 2;
    const answer = data.gabarito?.trim().toUpperCase() ?? "";
    const errors: string[] = [];

    if (!data.materia) errors.push("Materia não informada");
    if (!data.questao) errors.push("Questao não informada");
    ["alt_a", "alt_b", "alt_c", "alt_d"].forEach((key) => {
      if (!data[key]) errors.push(`${key.toUpperCase()} não informada`);
    });
    if (!/^[A-E]$/.test(answer)) errors.push("Gabarito deve ser uma letra de A a E");
    if (answer === "E" && !data.alt_e) errors.push("Alt_E é obrigatória quando o gabarito é E");
    if (!data.justificativa) errors.push("Justificativa não informada");

    if (errors.length > 0) {
      invalidRows.push({ rowNumber, errors });
      return;
    }

    validRows.push({
      rowNumber,
      materia: data.materia,
      questao: data.questao,
      alternativa_a: data.alt_a,
      alternativa_b: data.alt_b,
      alternativa_c: data.alt_c,
      alternativa_d: data.alt_d,
      alternativa_e: data.alt_e || null,
      gabarito: answer,
      justificativa: data.justificativa,
    });
  });

  return { validRows, invalidRows };
}

function levenshtein(a: string, b: string): number {
  const previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    let diagonal = previous[0];
    previous[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const above = previous[j];
      previous[j] = Math.min(previous[j] + 1, previous[j - 1] + 1, diagonal + (a[i - 1] === b[j - 1] ? 0 : 1));
      diagonal = above;
    }
  }
  return previous[b.length];
}

export function similarityScore(source: string, target: string): number {
  const a = normalizePreAulaText(source);
  const b = normalizePreAulaText(target);
  if (!a || !b) return 0;
  if (a === b) return 1;
  const distanceScore = 1 - levenshtein(a, b) / Math.max(a.length, b.length);
  const aWords = new Set(a.split(" "));
  const bWords = new Set(b.split(" "));
  const intersection = [...aWords].filter((word) => bWords.has(word)).length;
  const union = new Set([...aWords, ...bWords]).size;
  return Math.max(0, Math.min(1, distanceScore * 0.7 + (intersection / union) * 0.3));
}

export function suggestMaterialMatches(materia: string, materials: MaterialMatchCandidate[]) {
  return materials
    .map((material) => ({ ...material, score: similarityScore(materia, material.nome) }))
    .sort((a, b) => b.score - a.score || a.nome.localeCompare(b.nome, "pt-BR"));
}

export function preAulaToCard(question: PreAulaQuestionRow): CardRow {
  return {
    id: question.id,
    modo: "abcde",
    especialidade: question.especialidade,
    comando: question.questao,
    alternativa_a: question.alternativa_a,
    alternativa_b: question.alternativa_b,
    alternativa_c: question.alternativa_c,
    alternativa_d: question.alternativa_d,
    alternativa_e: question.alternativa_e,
    alternativa_correta: question.gabarito.trim(),
    info_1: null,
    var_1: null,
    info_2: null,
    var_2: null,
    info_3: null,
    var_3: null,
    info_4: null,
    var_4: null,
    info_5: null,
    var_5: null,
    explicacao: question.justificativa,
    peso_importancia: 0,
    origem: "pre_aula",
    verificado: true,
    aula_id: question.material_id,
  };
}

export function buildPreAulaImportPayload(
  rows: PreAulaSpreadsheetRow[],
  matches: Record<string, string>,
  specialty: Especialidade,
) {
  const orderByMaterial = new Map<string, number>();
  return rows.map((row) => {
    const materialId = matches[row.materia];
    const nextOrder = (orderByMaterial.get(materialId) ?? 0) + 1;
    orderByMaterial.set(materialId, nextOrder);
    return {
      material_id: materialId,
      especialidade: specialty,
      questao: row.questao,
      alternativa_a: row.alternativa_a,
      alternativa_b: row.alternativa_b,
      alternativa_c: row.alternativa_c,
      alternativa_d: row.alternativa_d,
      alternativa_e: row.alternativa_e,
      gabarito: row.gabarito,
      justificativa: row.justificativa,
      ordem: nextOrder,
    };
  });
}

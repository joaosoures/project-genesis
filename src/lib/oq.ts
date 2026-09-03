// Lógica central dos OQs: normalização, validação, sorteio, score

export type Modo = "abcde" | "lacuna" | "oq_falta";
export type Especialidade =
  | "clinica_medica" | "cirurgia_geral" | "pediatria"
  | "ginecologia_obstetricia" | "medicina_preventiva" | "saude_mental";

export const ESPECIALIDADE_LABEL: Record<Especialidade, string> = {
  clinica_medica: "Clínica Médica",
  cirurgia_geral: "Cirurgia Geral",
  pediatria: "Pediatria",
  ginecologia_obstetricia: "Ginecologia e Obstetrícia",
  medicina_preventiva: "Medicina Preventiva",
  saude_mental: "Saúde Mental",
};

export const MODO_LABEL: Record<Modo, string> = {
  abcde: "ABCDE",
  lacuna: "Lacuna",
  oq_falta: "OQ Falta",
};

export interface CardRow {
  id: string;
  modo: Modo;
  especialidade: Especialidade;
  comando: string;
  alternativa_a: string | null; alternativa_b: string | null;
  alternativa_c: string | null; alternativa_d: string | null;
  alternativa_e: string | null;
  alternativa_correta: string | null;
  info_1: string | null; var_1: string | null;
  info_2: string | null; var_2: string | null;
  info_3: string | null; var_3: string | null;
  info_4: string | null; var_4: string | null;
  info_5: string | null; var_5: string | null;
  explicacao?: string; // Loaded lazily
  peso_importancia: number;
  origem: string;
  verificado: boolean;
  criado_por_usuario_id?: string | null;
  baralho?: string | null;
  aula_id?: string | null;
}


export function normalize(s: string): string {
  if (!s) return "";
  return s
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // Mantém apenas letras, números e espaços
    .trim()
    .replace(/\s+/g, " "); // Colapsa múltiplos espaços
}

/** 
 * Calcula a distância de Levenshtein para tolerar pequenos erros ortográficos.
 * Útil para termos médicos complexos.
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/** Checa se a resposta do aluno bate com info principal ou variações. Altamente tolerante. */
export function matchAnswer(answer: string, info: string, vars: string | null): boolean {
  if (!answer.trim()) return false;
  const a = normalize(answer);
  if (!a) return false;
  
  const targets = [info, ...(vars ? vars.split(/[;|]/) : [])]
    .map((s) => s.trim())
    .filter(Boolean)
    .map(normalize);

  for (const t of targets) {
    if (!t) continue;
    
    // 1. Match exato ou sem espaços
    if (a === t) return true;
    if (a.replace(/\s/g, "") === t.replace(/\s/g, "")) return true;
    
    // 2. Containment (útil para frases longas)
    if (a.length >= 4 && t.includes(a) && a.length / t.length >= 0.7) return true;
    if (t.length >= 4 && a.includes(t) && t.length / a.length >= 0.7) return true;

    // 3. Tolerância a erro ortográfico (Levenshtein)
    // Permite 1 erro para palavras de 4-7 letras, 2 erros para 8-11, etc.
    const distance = levenshteinDistance(a, t);
    const maxErrors = Math.floor(t.length / 4);
    if (distance <= maxErrors) return true;
  }
  return false;
}

export function getInfos(card: CardRow): { info: string; vars: string | null; idx: number }[] {
  const out: { info: string; vars: string | null; idx: number }[] = [];
  for (let i = 1; i <= 5; i++) {
    const info = (card as any)[`info_${i}`] as string | null;
    const vars = (card as any)[`var_${i}`] as string | null;
    if (info && info.trim()) out.push({ info, vars, idx: i });
  }
  return out;
}

export function sortearLacuna(card: CardRow): number {
  const infos = getInfos(card);
  if (infos.length === 0) return 1;
  return infos[Math.floor(Math.random() * infos.length)].idx;
}

/** Nota 0-4 de acordo com comportamento. */
export function calcularNota(opts: { acertou: boolean; nivelPista: number; tentativas: number }): number {
  const { acertou, nivelPista, tentativas } = opts;
  if (!acertou) return 4;
  if (nivelPista === 0 && tentativas <= 1) return 1;
  if (nivelPista === 0) return 1;
  if (nivelPista === 1) return 2;
  if (nivelPista === 2) return 3;
  return 3;
}

/** Score de prioridade: maior = mais urgente para revisar. */
export function calcularScore(opts: {
  pesoImportancia: number;
  contadorErros: number;
  contadorAcertos: number;
  nivelPistaUltima: number;
  diasDesdeUltima: number;
  isNovo: boolean;
}): number {
  const { pesoImportancia, contadorErros, contadorAcertos, nivelPistaUltima, diasDesdeUltima, isNovo } = opts;
  return (
    pesoImportancia * 2 +
    contadorErros * 5 +
    nivelPistaUltima * 3 +
    diasDesdeUltima * 0.5 +
    (isNovo ? 10 : 0) -
    contadorAcertos * 2
  );
}

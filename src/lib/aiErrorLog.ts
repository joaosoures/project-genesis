// Registro local (no navegador do aluno) das últimas mensagens de erro da IA.
// Sem termos técnicos — só o que o aluno viu.

const KEY = "oqmed_ai_error_log_v1";
const MAX = 10;

export interface AiErrorEntry {
  at: string;          // ISO
  message: string;     // mensagem amigável
  context?: string;    // ex.: "Gerar OQs por IA"
}

export function logAiError(message: string, context?: string) {
  try {
    const list = readAiErrors();
    list.unshift({ at: new Date().toISOString(), message, context });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {}
}

export function readAiErrors(): AiErrorEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function clearAiErrors() {
  try { localStorage.removeItem(KEY); } catch {}
}

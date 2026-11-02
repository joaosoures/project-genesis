import { supabase } from "@/integrations/supabase/client";

export const QUESTOES_REAIS_AREAS = [
  { value: "clinica_medica", label: "Clínica Médica" },
  { value: "pediatria", label: "Pediatria" },
  { value: "ginecologia_obstetricia", label: "Ginecologia e Obstetrícia" },
  { value: "medicina_preventiva", label: "Medicina Preventiva" },
  { value: "cirurgia_geral", label: "Cirurgia" },
] as const;

export type QuestaoRealArea = (typeof QUESTOES_REAIS_AREAS)[number]["value"];
export type QuestaoRealFase = "base" | "decisao_castigo" | "castigo";
export type QuestaoRealTipo = "base" | "castigo";

export interface QuestaoRealItem {
  id: string; tipo: QuestaoRealTipo; posicao: number; questao_original_id: string;
  castigo_filha_id: string | null; prova?: string | null; area?: string | null;
  questao_base_posicao?: number | null; resposta_marcada: string | null;
  acertou: boolean | null; confirmado_em: string | null; questao: string;
  alternativas: Array<string | null>; gabarito: string | null;
  explicacoes: Array<string | null>; image_url: string | null;
}

export interface QuestaoRealSessao {
  id: string; usuario_id: string; quantidade_solicitada: number; quantidade_efetiva: number;
  areas: QuestaoRealArea[]; fase: QuestaoRealFase;
  status: "ativa" | "concluida" | "descartada" | "pulada"; posicao_base: number;
  posicao_castigo: number; criado_em: string; atualizado_em: string; encerrado_em: string | null;
}
export interface QuestaoRealState { sessao: QuestaoRealSessao; itens: QuestaoRealItem[]; erros_base: number; castigo_total?: number; indisponivel?: boolean; }
export interface LaboratorioSession { sessao: QuestaoRealSessao; itens: QuestaoRealItem[]; }
export type ExtractedOQ = { modo: "lacuna" | "oq_falta"; comando: string; info: string[]; variacoes: string[]; explicacao: string; aula_id: string | null; aula_titulo: string | null; draftKey?: string; saved?: boolean; saving?: boolean; error?: string };

const rpc = async <T>(name: string, args?: Record<string, unknown>) => {
  const { data, error } = await supabase.rpc(name as never, args as never);
  if (error) throw error;
  return data as T;
};

export const questoesReaisApi = {
  ativa: () => rpc<QuestaoRealState | null>("questoes_reais_sessao_ativa"),
  criar: (quantidade: number, areas: QuestaoRealArea[]) => rpc<QuestaoRealState>("questoes_reais_criar_sessao", { p_quantidade: quantidade, p_areas: areas }),
  confirmar: (itemId: string, resposta: string) => rpc<QuestaoRealState>("questoes_reais_confirmar", { p_item: itemId, p_resposta: resposta }),
  avancar: (itemId: string) => rpc<QuestaoRealState>("questoes_reais_avancar", { p_item: itemId }),
  prepararCastigo: (sessaoId: string) => rpc<QuestaoRealState | { indisponivel: true }>("questoes_reais_preparar_castigo", { p_sessao: sessaoId }),
  encerrar: (sessaoId: string, acao: "descartar" | "pular" | "concluir") => rpc<void>("questoes_reais_encerrar", { p_sessao: sessaoId, p_acao: acao }),
  historico: (limit = 10, offset = 0) => rpc<LaboratorioSession[]>("questoes_reais_sessoes_historico", { p_limit: limit, p_offset: offset }),
  metrica: () => rpc<number>("questoes_reais_metrica"),
  salvarCard: (payload: Record<string, unknown>) => rpc<{ card_id: string }>("questoes_reais_salvar_card", payload),
};

export async function extrairOQs(itemId: string, quantidade: number) {
  const { data, error } = await supabase.functions.invoke("extrair-oqs-questao", { body: { item_id: itemId, quantidade } });
  if (error) throw error;
  return data as { extraction_id: string; oqs: ExtractedOQ[]; remaining: number | null };
}
export function punishmentIntensity(position: number, total: number) { if (total <= 1) return 0; return Math.max(0, Math.min(1, 1 - position / (total - 1))); }
export function currentItem(state: QuestaoRealState) { const tipo = state.sessao.fase === "castigo" ? "castigo" : "base"; const position = tipo === "base" ? state.sessao.posicao_base : state.sessao.posicao_castigo; return state.itens.find((item) => item.tipo === tipo && item.posicao === position) ?? null; }
export function answerText(item: QuestaoRealItem) { const index = "ABCDE".indexOf(item.gabarito ?? ""); return index >= 0 ? item.alternativas[index] ?? item.gabarito : item.gabarito; }

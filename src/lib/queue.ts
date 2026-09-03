import { supabase } from "@/integrations/supabase/client";
import { CardRow, calcularScore, Especialidade } from "./oq";
import { addToSyncQueue } from "./sync";

const POOL_SIZE = 20;


export async function getDailyProgress(userId: string): Promise<number> {
  const { data, error } = await supabase.rpc("get_daily_progress", { p_user_id: userId });
  if (error) {
    console.error("Error fetching daily progress:", error);
    return 0;
  }
  return (data as number) || 0;
}


export type QueueFilter =
  | { tipo: "todas" }
  | { tipo: "especialidade"; especialidade: Especialidade }
  | { tipo: "favoritos"; especialidade?: Especialidade }
  | { tipo: "criticos"; especialidade?: Especialidade }
  | { tipo: "dificeis"; especialidade?: Especialidade }
  | { tipo: "novos"; especialidade?: Especialidade }
  | { tipo: "esquecidos"; especialidade?: Especialidade }
  | { tipo: "retrogrado"; especialidade?: Especialidade }
  | { tipo: "aula"; aulaId: string }
  | { tipo: "baralho"; baralho: string };

export async function buscarPool(userId: string, filter: QueueFilter): Promise<CardRow[]> {
  const fields = "id, modo, especialidade, comando, alternativa_a, alternativa_b, alternativa_c, alternativa_d, alternativa_e, alternativa_correta, info_1, var_1, info_2, var_2, info_3, var_3, info_4, var_4, info_5, var_5, peso_importancia, origem, verificado, criado_por_usuario_id, aula_id, baralho";

  // FAST PATH: modo retrógrado — só OQs já realizados, scoring direto do desempenho
  if (filter.tipo === "retrogrado") {
    const [{ data: desempenhos }, { data: excluded }] = await Promise.all([
      supabase
        .from("desempenho_cards")
        .select("card_id, contador_erros, contador_acertos, nivel_pista_ultima, ultima_nota, timestamp_ultima, proxima_revisao")
        .eq("usuario_id", userId)
        .order("proxima_revisao", { ascending: true })
        .limit(500),
      supabase.from("user_excluded_cards").select("card_id").eq("user_id", userId),
    ]);
    const excludedIds = new Set((excluded ?? []).map((e: any) => e.card_id));
    const desempFiltered = (desempenhos ?? []).filter((d: any) => !excludedIds.has(d.card_id));
    if (desempFiltered.length === 0) return [];

    const agora = Date.now();
    const scoredIds = desempFiltered.map((d: any) => {
      const ultima = d.timestamp_ultima ? new Date(d.timestamp_ultima).getTime() : agora;
      const proxima = d.proxima_revisao ? new Date(d.proxima_revisao).getTime() : ultima;
      const overdueDias = Math.max(0, (agora - proxima) / 86400000);
      const diasUltima = (agora - ultima) / 86400000;
      const erros = d.contador_erros ?? 0;
      const acertos = d.contador_acertos ?? 0;
      const pista = d.nivel_pista_ultima ?? 0;
      const ultimaNota = d.ultima_nota ?? 0;
      const score =
        overdueDias * 6 + erros * 8 + pista * 7 + ultimaNota * 4 + diasUltima * 0.4 - acertos * 1.5;
      return { card_id: d.card_id, score };
    });
    scoredIds.sort((a, b) => b.score - a.score);
    const topIds = scoredIds.slice(0, POOL_SIZE * 2).map((s) => s.card_id);

    let cq: any = supabase.from("cards").select(fields).in("id", topIds);
    if (filter.especialidade) cq = cq.eq("especialidade", filter.especialidade);
    const { data: cardsRetro } = await cq;
    if (!cardsRetro) return [];

    const cardMap = new Map<string, any>(cardsRetro.map((c: any) => [c.id, c]));
    const ordered: CardRow[] = [];
    for (const s of scoredIds) {
      const c = cardMap.get(s.card_id);
      if (c) ordered.push(c as CardRow);
      if (ordered.length >= POOL_SIZE) break;
    }
    return ordered;
  }

  // 1. Carrega todos os cards visíveis (verificados ou próprios)
  let q: any = supabase.from("cards").select(fields).limit(500);
  if (filter.tipo === "especialidade") q = q.eq("especialidade", filter.especialidade);
  if (filter.tipo === "aula") q = q.eq("aula_id", filter.aulaId);
  if (filter.tipo === "baralho") q = q.eq("baralho", filter.baralho).eq("criado_por_usuario_id", userId);
  const { data: cards, error } = await q;
  if (error || !cards) return [];


  // 1.1 Filtrar cards excluídos pelo usuário
  const { data: excluded } = await supabase.from("user_excluded_cards").select("card_id").eq("user_id", userId);
  const excludedIds = new Set((excluded ?? []).map(e => e.card_id));
  const activeCards = cards.filter(c => !excludedIds.has(c.id));


  // 2. Carrega desempenhos do usuário
  const { data: desempenhos } = await supabase
    .from("desempenho_cards")
    .select("*")
    .eq("usuario_id", userId);

  // 3. Filtros especiais por desempenho
  const desempMap = new Map<string, any>();
  (desempenhos ?? []).forEach((d: any) => desempMap.set(d.card_id, d));

  let pool = activeCards as CardRow[];

  if (filter.tipo === "favoritos") {
    const { data: favs } = await supabase.from("favoritos").select("card_id").eq("usuario_id", userId);
    const favIds = new Set((favs ?? []).map((f: any) => f.card_id));
    pool = pool.filter((c) => favIds.has(c.id));
    if (filter.especialidade) {
      pool = pool.filter((c) => c.especialidade === filter.especialidade);
    }
  }
  if (filter.tipo === "criticos") {
    pool = pool.filter((c) => {
      const d = desempMap.get(c.id);
      return d && d.ultima_nota === 4;
    });
    if (filter.especialidade) {
      pool = pool.filter((c) => c.especialidade === filter.especialidade);
    }
  }
  if (filter.tipo === "dificeis") {
    pool = pool.filter((c) => {
      const d = desempMap.get(c.id);
      return d && d.ultima_nota >= 3;
    });
    if (filter.especialidade) {
      pool = pool.filter((c) => c.especialidade === filter.especialidade);
    }
  }
  if (filter.tipo === "novos") {
    pool = pool.filter((c) => !desempMap.has(c.id));
    if (filter.especialidade) {
      pool = pool.filter((c) => c.especialidade === filter.especialidade);
    }
  }
  if (filter.tipo === "esquecidos") {
    const agora = Date.now();
    pool = pool.filter((c) => {
      const d = desempMap.get(c.id);
      if (!d || !d.timestamp_ultima) return false;
      const dias = (agora - new Date(d.timestamp_ultima).getTime()) / 86400000;
      return dias > 7;
    });
    if (filter.especialidade) {
      pool = pool.filter((c) => c.especialidade === filter.especialidade);
    }
  }
  // (modo "retrogrado" tratado no fast path acima)

  // 4. Calcular score atual de cada card
  const scored = pool.map((c) => {
    const d = desempMap.get(c.id);
    const isNovo = !d;
    const dias = d?.timestamp_ultima
      ? (Date.now() - new Date(d.timestamp_ultima).getTime()) / 86400000
      : 0;
    const score = calcularScore({
      pesoImportancia: c.peso_importancia,
      contadorErros: d?.contador_erros ?? 0,
      contadorAcertos: d?.contador_acertos ?? 0,
      nivelPistaUltima: d?.nivel_pista_ultima ?? 0,
      diasDesdeUltima: dias,
      isNovo,
    });
    return { card: c, score, ultima: d?.timestamp_ultima ?? null };
  });

  // 5. Ordena: score desc, depois mais antigo primeiro
  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    if (!a.ultima && !b.ultima) return Math.random() - 0.5;
    if (!a.ultima) return -1;
    if (!b.ultima) return 1;
    return new Date(a.ultima).getTime() - new Date(b.ultima).getTime();
  });

  return scored.slice(0, POOL_SIZE).map((s) => s.card);
}

export async function fetchExplicacao(cardId: string): Promise<string> {
  const { data, error } = await supabase
    .from("cards")
    .select("explicacao")
    .eq("id", cardId)
    .single();
  
  if (error || !data) return "Explicação não disponível.";
  return data.explicacao;
}

export async function registrarDesempenho(opts: {
  userId: string;
  cardId: string;
  acertou: boolean;
  nivelPista: number;
  nota: number;
  pesoImportancia: number;
  timestamp?: string;
}) {
  // Offline resilience - only queue if it's a new result (not already from sync)
  if (!navigator.onLine && !opts.timestamp) {
    addToSyncQueue(opts);
    return;
  }

  const { userId, cardId, acertou, nivelPista, nota, pesoImportancia, timestamp } = opts;

  // Busca atual
  const { data: existing } = await supabase
    .from("desempenho_cards")
    .select("*")
    .eq("usuario_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  const contador_vezes = (existing?.contador_vezes ?? 0) + 1;
  const contador_acertos = (existing?.contador_acertos ?? 0) + (acertou ? 1 : 0);
  const contador_erros = (existing?.contador_erros ?? 0) + (acertou ? 0 : 1);

  const dias = existing?.timestamp_ultima
    ? (Date.now() - new Date(existing.timestamp_ultima).getTime()) / 86400000
    : 0;
  const score_prioridade = calcularScore({
    pesoImportancia, contadorErros: contador_erros, contadorAcertos: contador_acertos,
    nivelPistaUltima: nivelPista, diasDesdeUltima: dias, isNovo: false,
  });

  const intervalDays = nota === 1 ? 7 : nota === 2 ? 3 : nota === 3 ? 1 : nota === 4 ? 0.5 : 14;
  const proxima = new Date(Date.now() + intervalDays * 86400000).toISOString();

  const now = timestamp || new Date().toISOString();

  const payload = {
    usuario_id: userId,
    card_id: cardId,
    contador_vezes,
    contador_acertos,
    contador_erros,
    nivel_pista_ultima: nivelPista,
    ultima_nota: nota,
    score_prioridade,
    timestamp_ultima: now,
    proxima_revisao: proxima,
  };

  if (existing) {
    const { error: upError } = await supabase.from("desempenho_cards").update(payload).eq("id", existing.id);
    if (upError) {
      console.error("Erro ao atualizar desempenho:", upError);
      throw upError;
    }
  } else {
    const { error: inError } = await supabase.from("desempenho_cards").insert(payload);
    if (inError) {
      console.error("Erro ao inserir desempenho:", inError);
      throw inError;
    }
  }

  // Registrar no histórico detalhado
  const { error: histError } = await supabase.from("historico_estudo").insert({
    usuario_id: userId,
    card_id: cardId,
    acertou,
    nota,
    nivel_pista: nivelPista,
    timestamp: now
  });

  if (histError) {
    console.error("Erro ao registrar histórico:", histError);
    throw histError;
  }
}

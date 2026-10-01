import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";

export type TrilhaPerfil = "medico" | "interno_4" | "interno_geral";

export interface RodizioItem {
  especialidade: string;
  semanas: number;
  /** Nome para rodízios personalizados (ex: "Urgência"). */
  nome?: string;
  /** IDs de aulas selecionadas (apenas em rodízios personalizados). */
  aulas_ids?: string[];
}

export const rodizioKey = (r: RodizioItem) =>
  r.aulas_ids && r.aulas_ids.length ? `custom:${r.nome ?? ""}` : r.especialidade;

export interface TrilhaRedistribuido {
  aula_id: string;
  aula_nome: string;
  semana_iso: string;
  ja_redistribuido: boolean;
}

export type FocoIncidencia = "todas" | "alta_media" | "alta";

export interface TrilhaSettings {
  setup_done: boolean;
  prova_data: string | null;
  prova_nome: string;
  perfil: TrilhaPerfil;
  rodizio_atual: RodizioItem | null;
  proximos_rodizios: RodizioItem[];
  disponibilidade: { dias: boolean[]; horas: number; horas_por_dia?: number[] };
  redistribuidos: TrilhaRedistribuido[];
  /** Estratégia de cobertura: todas, alta+média ou apenas alta incidência. */
  foco_incidencia?: FocoIncidencia;
  /** Data (YYYY-MM-DD) em que o plano começou — define a "semana 1". */
  data_inicio_plano?: string | null;
  /** Override de semana_index (0-based) por aula_id, após redistribuição. */
  plano_overrides?: Record<string, number>;
  /** Aulas que o aluno deixou de fazer (ficam em "Estudos que você perdeu"). */
  perdidos?: string[];
  /** Aulas marcadas como concluídas pelo aluno. */
  completos?: string[];
  /** Semana em que uma aula foi concluída, sem mover sua posição no plano. */
  completos_semana?: Record<string, number>;
  /** Snapshot imutável das aulas efetivamente apresentadas em cada semana. */
  planos_semanais?: Record<string, string[]>;
  /** Capacidade fixa de matérias por semana da configuração atual. */
  limite_materias_semana?: number;
  /** Cache das estatísticas globais para evitar processamento pesado. */
  stats_cache?: Record<string, { count: number; acertos: number }>;
  /** Timestamp da última sincronização do histórico. */
  last_sync_timestamp?: string | null;
  /** Agendamentos de simulados definidos pelo aluno, incluindo o reforço posterior. */
  simulados?: { id: string; data: string; nome: string; data_castigo?: string }[];
  /** Cache do plano calculado para evitar recalculação pesada. */
  plano_cache?: {
    hash: string;
    planoSemanaPorAula: Record<string, number>;
    baselinePlano: Record<string, number>;
    pendenciasIds: string[];
  };
}

export const TRILHA_DEFAULT: TrilhaSettings = {
  setup_done: false,
  prova_data: null,
  prova_nome: "",
  perfil: "interno_geral",
  rodizio_atual: null,
  proximos_rodizios: [],
  disponibilidade: { dias: [true, true, true, true, true, true, true], horas: 2, horas_por_dia: [2, 2, 2, 2, 2, 2, 2] },
  redistribuidos: [],
  foco_incidencia: "todas",
  data_inicio_plano: null,
  plano_overrides: {},
  perdidos: [],
  completos: [],
  completos_semana: {},
  planos_semanais: {},
  limite_materias_semana: undefined,
  stats_cache: {},
  last_sync_timestamp: null,
};

export function maxTierFor(foco: FocoIncidencia | undefined): number {
  if (foco === "alta") return 1;
  if (foco === "alta_media") return 2;
  return 3;
}

export interface AulaPlano {
  id: string;
  nome: string;
  especialidade: string;
  tier: number;
  key_words: string | null;
  total_oqs: number;
  link_material: string | null;
}

export function getAulaNumero(nome: string): number | null {
  const match = nome.trim().match(/^(\d+)\s*[-–—]/);
  return match ? Number(match[1]) : null;
}

export function compareAulasByNumero(a: AulaPlano, b: AulaPlano): number {
  const numeroA = getAulaNumero(a.nome);
  const numeroB = getAulaNumero(b.nome);

  if (numeroA === null && numeroB === null) return 0;
  if (numeroA === null) return 1;
  if (numeroB === null) return -1;
  return numeroA - numeroB;
}

export function calcularLimiteMateriasSemana(
  disponibilidade: TrilhaSettings["disponibilidade"],
  necessidade: number,
  duracaoMediaHoras = 1.8,
): number {
  const horas = disponibilidade.dias.reduce(
    (total, ativo, index) => total + (ativo ? (disponibilidade.horas_por_dia?.[index] ?? disponibilidade.horas) : 0),
    0,
  );
  if (necessidade <= 0) return 1;
  return Math.max(1, Math.min(necessidade, Math.floor(horas / duracaoMediaHoras)));
}

export interface NormalizacaoSemanasResult {
  distribuicao: Record<string, number>;
  deslocamentos: { aula_id: string; de: number; para: number }[];
  excessoUltimaSemana: string[];
}

export function normalizarSemanas(
  distribuicao: Record<string, number>,
  aulas: AulaPlano[],
  completos: Set<string>,
  limite: number,
  totalSemanas: number,
): NormalizacaoSemanasResult {
  const validos = new Map(aulas.map((aula) => [aula.id, aula]));
  const resultado: Record<string, number> = {};
  Object.entries(distribuicao).forEach(([id, semana]) => {
    if (validos.has(id) && Number.isInteger(semana) && semana >= 0) resultado[id] = Math.min(semana, Math.max(0, totalSemanas - 1));
  });
  const deslocamentos: NormalizacaoSemanasResult["deslocamentos"] = [];
  const excessoUltimaSemana: string[] = [];
  const capacidade = Math.max(1, limite);
  const maxIteracoes = Math.max(1, aulas.length * Math.max(1, totalSemanas));
  let iteracoes = 0;

  while (iteracoes++ < maxIteracoes) {
    let mudou = false;
    for (let semana = 0; semana < totalSemanas; semana++) {
      const ids = Object.entries(resultado).filter(([, wk]) => wk === semana).map(([id]) => id);
      if (ids.length <= capacidade) continue;
      const candidatos = ids
        .filter((id) => !completos.has(id))
        .sort((a, b) => compareAulasByNumero(validos.get(b)!, validos.get(a)!));
      const deslocar = candidatos[0];
      if (!deslocar) continue;
      if (semana >= totalSemanas - 1) {
        excessoUltimaSemana.push(deslocar);
        continue;
      }
      resultado[deslocar] = semana + 1;
      deslocamentos.push({ aula_id: deslocar, de: semana, para: semana + 1 });
      mudou = true;
    }
    if (!mudou) break;
  }
  return { distribuicao: resultado, deslocamentos, excessoUltimaSemana: Array.from(new Set(excessoUltimaSemana)) };
}

function isoWeek(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export const META_OQS_POR_AULA = 20;
export const ACERTO_MINIMO = 0.6;

export function useTrilhaPlano() {
  const { user } = useAuth();
  const { dailyGoal } = useSettings();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TrilhaSettings>(TRILHA_DEFAULT);
  const [aulas, setAulas] = useState<AulaPlano[]>([]);
  const [studiedThisWeek, setStudiedThisWeek] = useState(0);
  const [studiedLastWeek, setStudiedLastWeek] = useState(0);
  const [aulaStatsSemana, setAulaStatsSemana] = useState<Record<string, { count: number; acertos: number }>>({});
  const [aulaStatsGlobal, setAulaStatsGlobal] = useState<Record<string, { count: number; acertos: number }>>({});

  const carregar = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let inicioSemana = new Date();
    let currentSettings = settings;

    try {
      const { data: us, error } = await supabase
        .from("user_settings")
        .select("settings")
        .eq("usuario_id", user.id)
        .maybeSingle();

      if (error) throw error;

      const raw = (us?.settings as any)?.trilha;
      currentSettings = raw ? { ...TRILHA_DEFAULT, ...raw } : TRILHA_DEFAULT;
      setSettings(currentSettings);

      if (currentSettings.data_inicio_plano) {
        const inicioRef = new Date(currentSettings.data_inicio_plano + "T00:00:00");
        inicioSemana = new Date(inicioRef);
        inicioSemana.setHours(0, 0, 0, 0);
        const day = (inicioSemana.getDay() + 6) % 7;
        inicioSemana.setDate(inicioSemana.getDate() - day);
      }
    } catch (err) {
      console.error("Error loading trilha settings:", err);
    }

    const { data: mats, error: matsError } = await supabase
      .from("materiais")
      .select("id, nome, especialidade, tier, key_words, link_1, cards(count)")
      .order("tier", { ascending: true });

    if (matsError) {
      console.error("Erro ao carregar materiais:", matsError);
    }

    setAulas(
      (mats ?? []).map((m: any) => ({
        id: m.id,
        nome: m.nome,
        especialidade: m.especialidade,
        tier: m.tier,
        key_words: m.key_words,
        total_oqs: m.cards?.[0]?.count ?? 0,
        link_material: m.link_1,
      })),
    );

    // As estatísticas da trilha são derivadas do histórico persistido. Isso evita
    // perder respostas quando a janela é atualizada antes de um cache local ser salvo.
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const lastMonday = new Date(monday);
    lastMonday.setDate(monday.getDate() - 7);

    const { data: history, error: historyError } = await supabase
      .from("historico_estudo")
      .select("card_id, timestamp, acertou, conta_meta_diaria")
      .eq("usuario_id", user.id);

    if (historyError) {
      console.error("Erro ao carregar histórico da trilha:", historyError);
    }

    const historyRows = history ?? [];
    const cardIds = Array.from(new Set(historyRows.map((h) => h.card_id as string)));
    const aulaByCard: Record<string, string> = {};
    if (cardIds.length > 0) {
      const { data: cardsWithAula } = await supabase
        .from("cards")
        .select("id, aula_id")
        .in("id", cardIds);
      (cardsWithAula ?? []).forEach((card: any) => {
        if (card.aula_id) aulaByCard[card.id] = card.aula_id;
      });
    }

    let cw = 0;
    let lw = 0;
    const recentAulaStats: Record<string, { count: number; acertos: number }> = {};
    const globalStats: Record<string, { count: number; acertos: number }> = {};

    historyRows.forEach((h) => {
      const timestamp = new Date(h.timestamp!);
      if (h.conta_meta_diaria) {
        if (timestamp >= monday) cw++;
        else if (timestamp >= lastMonday) lw++;
      }

      const aulaId = aulaByCard[h.card_id as string];
      if (!aulaId) return;
      globalStats[aulaId] ??= { count: 0, acertos: 0 };
      globalStats[aulaId].count++;
      if (h.acertou) globalStats[aulaId].acertos++;

      if (timestamp >= monday) {
        recentAulaStats[aulaId] ??= { count: 0, acertos: 0 };
        recentAulaStats[aulaId].count++;
        if (h.acertou) recentAulaStats[aulaId].acertos++;
      }
    });

    setStudiedThisWeek(cw);
    setStudiedLastWeek(lw);
    setAulaStatsSemana(recentAulaStats);
    setAulaStatsGlobal(globalStats);
    setSettings((prev) => ({
      ...prev,
      stats_cache: globalStats,
      last_sync_timestamp: new Date().toISOString(),
    }));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvarSettings = useCallback(
    async (next: TrilhaSettings) => {
      if (!user) return;
      
      try {
        setSettings(next);
        const { data: us, error: fetchError } = await supabase
          .from("user_settings")
          .select("settings")
          .eq("usuario_id", user.id)
          .maybeSingle();
        
        if (fetchError) throw fetchError;

        const all = { ...((us?.settings as any) || {}), trilha: next };
        const { error: upsertError } = await supabase.from("user_settings").upsert(
          { usuario_id: user.id, settings: all, atualizado_em: new Date().toISOString() },
          { onConflict: "usuario_id" },
        );

        if (upsertError) throw upsertError;
        console.log("Trilha settings saved successfully");
      } catch (err) {
        console.error("Error saving trilha settings:", err);
      }
    },
    [user],
  );

  const marcarConcluida = useCallback(async (aulaId: string) => {
    const list = Array.from(new Set([...(settings.completos ?? []), aulaId]));
    const semanaAtual = (() => {
      const startOfWeek = (date: Date) => {
        const value = new Date(date);
        value.setHours(0, 0, 0, 0);
        value.setDate(value.getDate() - ((value.getDay() + 6) % 7));
        return value;
      };
      const inicio = settings.data_inicio_plano
        ? startOfWeek(new Date(`${settings.data_inicio_plano}T00:00:00`))
        : startOfWeek(new Date());
      return Math.max(0, Math.floor((startOfWeek(new Date()).getTime() - inicio.getTime()) / (7 * 86400000)));
    })();
    await salvarSettings({
      ...settings,
      completos: list,
      completos_semana: { ...(settings.completos_semana ?? {}), [aulaId]: semanaAtual },
    });
  }, [settings, salvarSettings]);

  const desmarcarConcluida = useCallback(async (aulaId: string) => {
    const list = (settings.completos ?? []).filter((x) => x !== aulaId);
    const completosSemana = { ...(settings.completos_semana ?? {}) };
    delete completosSemana[aulaId];
    await salvarSettings({ ...settings, completos: list, completos_semana: completosSemana });
  }, [settings, salvarSettings]);

  /** Marca aula como "dominada": registra até 20 OQs com nota 70 e adiciona a completos. */
  const marcarDominada = useCallback(async (aulaId: string) => {
    if (!user) return;
    try {
      const { data: cs } = await supabase
        .from("cards")
        .select("id")
        .eq("aula_id", aulaId)
        .eq("verificado", true)
        .limit(META_OQS_POR_AULA);
      const rows = (cs ?? []).map((c: any) => ({
        usuario_id: user.id,
        card_id: c.id,
        nota: 70,
        acertou: true,
        nivel_pista: 0,
        conta_meta_diaria: false,
      }));
      if (rows.length) {
        await supabase.from("historico_estudo").insert(rows);
      }
      await marcarConcluida(aulaId);
      await carregar();
    } catch (e) {
      console.error("marcarDominada falhou", e);
    }
  }, [user, marcarConcluida, carregar]);


  // Plano da semana
  const rodAtual = settings.perfil !== "medico" ? settings.rodizio_atual : null;
  const espRodizio = rodAtual && !(rodAtual.aulas_ids && rodAtual.aulas_ids.length)
    ? rodAtual.especialidade
    : null;
  const focoAulas = rodAtual
    ? (rodAtual.aulas_ids && rodAtual.aulas_ids.length
        ? aulas.filter((a) => rodAtual.aulas_ids!.includes(a.id) && a.total_oqs > 0)
        : aulas.filter((a) => a.especialidade === rodAtual.especialidade && a.total_oqs > 0))
    : [];
  const focoIds = new Set(focoAulas.map((a) => a.id));
  
  // Agora incluímos Tier 3 também
  const baseAulas = aulas.filter(
    (a) => a.tier <= 3 && a.total_oqs > 0 && !focoIds.has(a.id),
  );

  const diasAtivos = settings.disponibilidade.dias.filter(Boolean).length;
  const metaSemana = Math.max(10, dailyGoal * diasAtivos);

  // ============ NOVO: Plano de aulas por semana (Algoritmo Estratégico) ============
  function startOfWeekMon(d: Date) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    const day = (x.getDay() + 6) % 7;
    x.setDate(x.getDate() - day);
    return x;
  }

  const hoje = new Date();
  const inicioRef = settings.data_inicio_plano ? new Date(settings.data_inicio_plano + "T00:00:00") : hoje;
  const inicioSemana = startOfWeekMon(inicioRef);
  const semanaAtualSemana = startOfWeekMon(hoje);
  const provaSemana = settings.prova_data ? startOfWeekMon(new Date(settings.prova_data + "T00:00:00")) : null;

  const currentWeekIndex = Math.max(
    0,
    Math.round((semanaAtualSemana.getTime() - inicioSemana.getTime()) / (7 * 86400000)),
  );

  const totalSemanas = provaSemana
    ? Math.max(currentWeekIndex + 1, Math.ceil((provaSemana.getTime() - inicioSemana.getTime()) / (7 * 86400000)))
    : Math.max(currentWeekIndex + 12, 24);

  const getRodizioItemForWeek = (wkIdx: number): RodizioItem | null => {
    if (wkIdx < currentWeekIndex) return null;
    let relativeWk = wkIdx - currentWeekIndex;
    if (settings.rodizio_atual && relativeWk < settings.rodizio_atual.semanas) {
      return settings.rodizio_atual;
    }
    let totalPrev = settings.rodizio_atual?.semanas ?? 0;
    for (const r of settings.proximos_rodizios) {
      if (relativeWk < totalPrev + r.semanas) return r;
      totalPrev += r.semanas;
    }
    return null;
  };

  const getRodizioForWeek = (wkIdx: number): string | null => {
    const r = getRodizioItemForWeek(wkIdx);
    return r ? rodizioKey(r) : null;
  };

  const perdidosSet = new Set(settings.perdidos ?? []);
  const completosSet = useMemo(() => {
    const set = new Set(settings.completos ?? []);
    // Adicionar automaticamente aulas que atingiram a meta global de OQs
    Object.entries(aulaStatsGlobal).forEach(([aid, stat]) => {
      if (stat.count >= META_OQS_POR_AULA) {
        set.add(aid);
      }
    });
    return set;
  }, [settings.completos, aulaStatsGlobal]);
  const overrides = settings.plano_overrides ?? {};

  const tierMax = maxTierFor(settings.foco_incidencia);

  const { planoSemanaPorAula, baselinePlano, pendenciasIds, currentWeekIds } = useMemo(() => {
    if (!aulas.length || !settings.setup_done) {
      return { planoSemanaPorAula: {}, baselinePlano: {}, pendenciasIds: new Set<string>(), currentWeekIds: [] as string[] };
    }

    const elegiveis = aulas
      .filter((a) => a.total_oqs > 0 && a.tier <= tierMax && !perdidosSet.has(a.id))
      .sort(compareAulasByNumero);
    const idsValidos = new Set(aulas.filter((a) => a.total_oqs > 0 && !perdidosSet.has(a.id)).map((a) => a.id));
    const snapshots = settings.planos_semanais ?? {};
    const maiorSemanaPersistida = Math.max(
      -1,
      ...Object.keys(snapshots).map(Number).filter(Number.isInteger),
    );
    const maiorSemanaRemapeada = Math.max(
      -1,
      ...Object.values(overrides).filter((week) => Number.isInteger(week)),
    );
    const semanas = Math.max(1, totalSemanas, maiorSemanaPersistida + 1, maiorSemanaRemapeada + 1);
    const capacidadeFixa = settings.limite_materias_semana ?? Math.max(1, Math.floor((settings.disponibilidade.horas * settings.disponibilidade.dias.filter(Boolean).length) / 1.8));
    const baseline: Record<string, number> = {};
    const res: Record<string, number> = {};

    // O baseline usa a capacidade gravada e preenche as semanas em ordem.
    // O passado só é exibido como fato quando há snapshot persistido.
    elegiveis.forEach((aula, index) => {
      const semana = Math.min(semanas - 1, Math.floor(index / capacidadeFixa));
      baseline[aula.id] = semana;
      res[aula.id] = semana;
    });

    Object.entries(snapshots).forEach(([weekKey, ids]) => {
      const week = Number(weekKey);
      if (!Number.isInteger(week) || week < 0) return;
      ids.filter((id) => idsValidos.has(id)).forEach((id) => {
        res[id] = week;
      });
    });

    // Um remapeamento explícito tem precedência sobre o baseline e o snapshot.
    Object.entries(overrides).forEach(([id, week]) => {
      if (idsValidos.has(id) && Number.isInteger(week) && week >= 0) {
        res[id] = week;
      }
    });

    const normalizado = normalizarSemanas(
      res,
      elegiveis,
      completosSet,
      capacidadeFixa,
      semanas,
    );
    Object.keys(res).forEach((id) => delete res[id]);
    Object.assign(res, normalizado.distribuicao);

    const pendSet = new Set<string>();
    Object.entries(snapshots).forEach(([weekKey, ids]) => {
      const week = Number(weekKey);
      if (week >= currentWeekIndex) return;
      ids.forEach((id) => {
        if (idsValidos.has(id) && !completosSet.has(id) && (overrides[id] === undefined || overrides[id] >= currentWeekIndex)) {
          pendSet.add(id);
        }
      });
    });

    const currentWeekIds = Object.entries(res)
      .filter(([, week]) => week === currentWeekIndex)
      .map(([id]) => id);

    return { planoSemanaPorAula: res, baselinePlano: baseline, pendenciasIds: pendSet, currentWeekIds };
  }, [
    aulas,
    settings.setup_done,
    settings.planos_semanais,
    settings.rodizio_atual,
    settings.proximos_rodizios,
    currentWeekIndex,
    totalSemanas,
    overrides,
    completosSet,
    perdidosSet,
    tierMax,
  ]);

  // Congela a composição da semana assim que ela é apresentada. A virada semanal
  // passa a usar esse snapshot, em vez de reconstruir retroativamente o passado.
  useEffect(() => {
    if (!settings.setup_done || currentWeekIds.length === 0) return;
    const key = String(currentWeekIndex);
    if (settings.planos_semanais?.[key]) return;
    const timer = setTimeout(() => {
      salvarSettings({
        ...settings,
        planos_semanais: { ...(settings.planos_semanais ?? {}), [key]: currentWeekIds },
        plano_cache: undefined,
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [settings, currentWeekIndex, currentWeekIds, salvarSettings]);



  const aulasPorIndice = (wk: number) =>
    aulas
      .filter((a) =>
        a.total_oqs > 0 &&
        !perdidosSet.has(a.id) &&
        planoSemanaPorAula[a.id] === wk,
      )
      .sort(compareAulasByNumero);

  const aulasSemanaAtual = aulasPorIndice(currentWeekIndex);

  // Pendências só podem ser declaradas quando a semana de origem foi persistida.
  // Sem snapshot não inventamos uma composição histórica.
  const pendenciasAulas = aulas.filter(
    (a) => a.total_oqs > 0 &&
      pendenciasIds.has(a.id) &&
      !perdidosSet.has(a.id) &&
      !completosSet.has(a.id) &&
      !(overrides[a.id] !== undefined && overrides[a.id] >= currentWeekIndex),
  );

  function proximasSemanasDisponiveis(qtd: number): number[] {
    const slots: number[] = [];
    let wk = currentWeekIndex + 1;
    while (slots.length < qtd && wk < totalSemanas + 10) {
      slots.push(wk);
      wk++;
    }
    return slots;
  }

  const perdidosAulas = aulas.filter((a) => a.total_oqs > 0 && perdidosSet.has(a.id));
  const limiteMateriasSemana = settings.limite_materias_semana ?? Math.max(1, Math.floor((settings.disponibilidade.horas * diasAtivos) / 1.8));

  const moverAulaParaSemana = useCallback(async (aulaId: string, semanaDestino: number) => {
    if (!aulas.some((aula) => aula.id === aulaId) || totalSemanas < 1) return { deslocamentos: [], excessoUltimaSemana: [] };
    const distribuicao = { ...planoSemanaPorAula, [aulaId]: Math.max(0, Math.min(semanaDestino, totalSemanas - 1)) };
    const normalizado = normalizarSemanas(
      distribuicao,
      aulas.filter((aula) => aula.total_oqs > 0 && !perdidosSet.has(aula.id)),
      completosSet,
      limiteMateriasSemana,
      totalSemanas,
    );
    const novosOverrides = { ...(settings.plano_overrides ?? {}) };
    Object.entries(normalizado.distribuicao).forEach(([id, semana]) => { novosOverrides[id] = semana; });
    await salvarSettings({
      ...settings,
      plano_overrides: novosOverrides,
      perdidos: (settings.perdidos ?? []).filter((id) => id !== aulaId),
    });
    return normalizado;
  }, [aulas, totalSemanas, planoSemanaPorAula, perdidosSet, completosSet, limiteMateriasSemana, settings, salvarSettings]);

  // Compatibilidade: déficit "antigo" baseado em meta semanal
  const deficitAnterior = Math.max(0, metaSemana - studiedLastWeek);
  const semanaIsoAtual = isoWeek(new Date());

  const AULAS_POR_SEMANA = limiteMateriasSemana; // Alias de compatibilidade para consumidores antigos.

  // Cálculo de puxadas e redistribuições para a análise
  const analiseEstrategica = useMemo(() => {
    const puxadas = aulas.filter(a => 
      planoSemanaPorAula[a.id] === currentWeekIndex && 
      baselinePlano[a.id] > currentWeekIndex
    );
    const redistribuidas = aulas.filter(a => 
      baselinePlano[a.id] === currentWeekIndex && 
      planoSemanaPorAula[a.id] > currentWeekIndex
    );
    return { puxadas, redistribuidas };
  }, [aulas, planoSemanaPorAula, baselinePlano, currentWeekIndex]);

  return {
    loading,
    settings,
    salvarSettings,
    aulas,
    focoAulas,
    baseAulas,
    metaSemana,
    studiedThisWeek,
    deficitAnterior,
    semanaIsoAtual,
    // novos:
    currentWeekIndex,
    totalSemanas,
    aulasSemanaAtual,
    pendenciasAulas,
    perdidosAulas,
    proximasSemanasDisponiveis,
    aulasPorIndice,
    AULAS_POR_SEMANA,
    limiteMateriasSemana,
    moverAulaParaSemana,
    recarregar: carregar,
    getRodizioForWeek,
    analiseEstrategica,
    aulaStatsSemana,
    aulaStatsGlobal,
    marcarConcluida,
    desmarcarConcluida,
    marcarDominada,
    focoSemana: aulasSemanaAtual.filter((a) => focoIds.has(a.id) || overrides[a.id] === currentWeekIndex),
    rodizioSemana: aulasSemanaAtual.filter((a) => focoIds.has(a.id)),
    direcionadoSemana: aulasSemanaAtual.filter((a) => overrides[a.id] === currentWeekIndex && !focoIds.has(a.id)),
    baseSemana: aulasSemanaAtual.filter((a) => !focoIds.has(a.id) && overrides[a.id] !== currentWeekIndex),
  };
}

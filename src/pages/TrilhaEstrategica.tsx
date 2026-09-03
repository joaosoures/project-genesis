import { useEffect, useMemo, useRef, useState, useCallback, memo } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Settings as SettingsIcon,
  Flame,
  Target,
  AlertCircle,
  Sparkles,
  Trophy,
  Crown,
  GhostIcon,
  ChevronDown,
  Plus,
  Search,
  Check,
  ArrowDown,
  ArrowUp,
  Lock,
  FileText,
  AlertTriangle,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrilhaPlano } from "@/hooks/useTrilhaPlano";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import SetupDialog from "@/components/trilha/SetupDialog";
import BlocoAula from "@/components/trilha/BlocoAula";
import CalendarioEstudos from "@/components/trilha/CalendarioEstudos";
import RedistribuirDialog from "@/components/trilha/RedistribuirDialog";
import ExplicacaoTrilha from "@/components/trilha/ExplicacaoTrilha";
import RodizioRapido from "@/components/trilha/RodizioRapido";
import IncidenciaBadge, { getIncidencia } from "@/components/trilha/IncidenciaBadge";
import { useNavigate, Link } from "react-router-dom";
import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// Componentes memorizados para evitar re-renderizações duplicadas
const MemoizedRoadLines = memo(RoadLines);
const MemoizedSparkline = memo(Sparkline);



/* ============================================================
   Trilha Estratégica — versão "estrada"
   Duas linhas pontilhadas verticais cruzando o centro,
   blocos encaixados sobre elas, neblina nas extremidades.
   ============================================================ */

function RoadLines() {
  // Duas linhas pontilhadas verticais paralelas, com máscara de gradiente
  // suavizando topo/rodapé. Posicionadas absolutamente no centro.
  // z-0 para ficar atrás dos cards
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden md:block -z-10"
      style={{
        maskImage:
          "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to bottom, transparent, black 12%, black 88%, transparent)",
      }}
    >
      <div className="absolute top-0 bottom-0 left-[calc(50%-14px)] border-l-2 border-dashed border-[hsl(var(--primary))]/25" />
      <div className="absolute top-0 bottom-0 left-[calc(50%+14px)] border-l-2 border-dashed border-[hsl(var(--primary))]/25" />
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: "default" | "accent" | "danger";
}) {
  return (
    <div
      className={cn(
        "paper-card px-4 py-3 flex flex-col justify-between min-h-[88px]",
        tone === "danger" && "ring-1 ring-destructive/30",
      )}
    >
      <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
        {label}
      </span>
      <span
        className={cn(
          "text-2xl md:text-3xl font-black tabular-nums leading-none mt-1",
          tone === "accent" && "text-[hsl(var(--accent))]",
          tone === "danger" && "text-[hsl(var(--destructive))]",
        )}
      >
        {value}
      </span>
      {hint && (
        <span className="text-[10px] text-muted-foreground mt-1 truncate">
          {hint}
        </span>
      )}
    </div>
  );
}

/* Mini gráfico SVG sparkline para "OQs por dia" — leve, sem libs */
function Sparkline({ data, height = 36 }: { data: number[]; height?: number }) {
  const max = Math.max(1, ...data);
  const w = 120;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data
    .map((v, i) => `${i * step},${height - (v / max) * (height - 4) - 2}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full h-9">
      <polyline
        fill="none"
        stroke="hsl(var(--accent))"
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        points={points}
      />
      {data.map((v, i) => (
        <circle
          key={i}
          cx={i * step}
          cy={height - (v / max) * (height - 4) - 2}
          r="1.6"
          fill="hsl(var(--primary))"
        />
      ))}
    </svg>
  );
}

export default function TrilhaEstrategica() {
  const {
    loading,
    settings,
    salvarSettings,
    aulas,
    focoAulas,
    baseAulas,
    metaSemana,
    studiedThisWeek,
    pendenciasAulas,
    perdidosAulas,
    currentWeekIndex,
    totalSemanas,
    aulasSemanaAtual,
    proximasSemanasDisponiveis,
    aulasPorIndice,
    AULAS_POR_SEMANA,
    getRodizioForWeek,
    analiseEstrategica,
    focoSemana,
    rodizioSemana,
    direcionadoSemana,
    baseSemana,
    aulaStatsSemana,
    aulaStatsGlobal,
    marcarConcluida,
    desmarcarConcluida,
    marcarDominada,
  } = useTrilhaPlano();

  const settingsCtx = useSettings();
  const reduceMotion = settingsCtx?.reduceMotion;

  const META_OQS = 20;
  const ACERTO_MIN = 0.6;

  const [setupOpen, setSetupOpen] = useState(false);
  const [redistOpen, setRedistOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);
  const [revealCount, setRevealCount] = useState(0); 
  const futureOpen = revealCount > 0;
  const [searchOpen, setSearchOpen] = useState(false);

  const [searchQ, setSearchQ] = useState("");
  const [confirmAula, setConfirmAula] = useState<null | { id: string; nome: string }>(null);
  const semanaAtualRef = useRef<HTMLDivElement | null>(null);
  const [fabVisible, setFabVisible] = useState(false);

  useEffect(() => {
    const update = () => {
      const el = semanaAtualRef.current;
      if (!el) {
        setFabVisible(false);
        return;
      }
      const r = el.getBoundingClientRect();
      // Mostra o FAB apenas se o topo da semana atual estiver acima da zona visível do viewport (rolagem passou dele)
      // E garante que não mostramos se o elemento nem estiver perto de entrar na tela por baixo
      const threshold = 80;
      const isHeaderVisible = r.top > threshold;
      setFabVisible(!isHeaderVisible && r.bottom > threshold);
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);


  const completosSet = useMemo(() => new Set(settings.completos ?? []), [settings.completos]);
  const getStats = (id: string) => aulaStatsSemana[id] ?? { count: 0, acertos: 0 };
  const getGlobalStats = (id: string) => aulaStatsGlobal[id] ?? { count: 0, acertos: 0 };
  const isAulaDone = (id: string) => completosSet.has(id) || getGlobalStats(id).count >= META_OQS;
  const isAulaInsuficiente = (id: string) => {
    const s = getGlobalStats(id);
    return isAulaDone(id) && s.count > 0 && (s.acertos / s.count) < ACERTO_MIN;
  };

  const navigate = useNavigate();
  const { canUse } = useUserPlan();
  const { isAdmin } = useAuth();
  const podeDirecionamento = canUse("trilha") || isAdmin;

  useEffect(() => {
    document.title = "Trilha Estratégica — OQ MED";
    if (!loading && !settings.setup_done) setSetupOpen(true);
  }, [loading, settings.setup_done]);

  const progresso = Math.min(
    100,
    Math.round((studiedThisWeek / Math.max(1, metaSemana)) * 100),
  );
  const isMedico = settings.perfil === "medico";
  const rodAtualObj = !isMedico ? settings.rodizio_atual : null;
  const isCustomRod = !!(rodAtualObj?.aulas_ids && rodAtualObj.aulas_ids.length);
  const espRodizio = rodAtualObj && !isCustomRod ? rodAtualObj.especialidade : null;
  const espLabel = isCustomRod
    ? (rodAtualObj?.nome ?? "Personalizado")
    : espRodizio
      ? ESPECIALIDADE_LABEL[espRodizio as keyof typeof ESPECIALIDADE_LABEL] ?? espRodizio
      : null;
  const diasProva = settings.prova_data
    ? Math.max(
        0,
        Math.ceil(
          (new Date(settings.prova_data).getTime() - Date.now()) / 86400000,
        ),
      )
    : null;

  const proximasSemanas = useMemo(() => {
    if (revealCount === 0) return [];
    const arr: { wk: number; aulas: typeof aulas }[] = [];
    for (let i = 1; i <= revealCount; i++) {
      const wk = currentWeekIndex + i;
      if (wk >= totalSemanas) break;
      arr.push({ wk, aulas: aulasPorIndice(wk) });
    }
    return arr;
  }, [revealCount, currentWeekIndex, totalSemanas, aulasPorIndice]);



  // Sparkline mock — usa OQs do dia (poderia vir do hook futuramente)
  const sparkData = [4, 7, 6, 9, 5, 12, studiedThisWeek];

  // Pesquisa local para "estudos livres"
  const filtradas =
    searchQ.trim().length < 2
      ? []
      : aulas
          .filter((a) => {
            const t = searchQ.toLowerCase();
            return (
              a.nome.toLowerCase().includes(t) ||
              a.especialidade.toLowerCase().includes(t) ||
              (a.key_words ?? "").toLowerCase().includes(t)
            );
          })
          .slice(0, 6);

  function aplicarRedistribuicao(params: {
    redistribuir: { aula_id: string; semana_index: number }[];
    perder: string[];
  }) {
    const novosOverrides = { ...(settings.plano_overrides ?? {}) };
    params.redistribuir.forEach(({ aula_id, semana_index }) => {
      novosOverrides[aula_id] = semana_index;
    });
    const novosPerdidos = Array.from(
      new Set([...(settings.perdidos ?? []), ...params.perder]),
    );
    salvarSettings({
      ...settings,
      plano_overrides: novosOverrides,
      perdidos: novosPerdidos,
    });
  }

  function fazerAgoraPendencia(aulaId: string) {
    // Move a aula para a semana atual (override = currentWeekIndex)
    const novosOverrides = { ...(settings.plano_overrides ?? {}) };
    novosOverrides[aulaId] = currentWeekIndex;
    salvarSettings({ ...settings, plano_overrides: novosOverrides });
  }

  function handleCheckClick(aula: { id: string; nome: string }) {
    const id = aula.id;
    const done = isAulaDone(id);
    if (done) {
      if (completosSet.has(id)) {
        desmarcarConcluida(id);
        toast.success("Marcação removida");
      } else {
        toast.info("Esta matéria já foi concluída (20 OQs estudadas).");
      }
      return;
    }
    const c = getStats(id).count;
    if (c >= META_OQS) return;
    setConfirmAula(aula);
  }

  if (loading && aulas.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8 md:py-10 space-y-8 animate-pulse">
        <div className="paper-card p-5 h-48 bg-muted/20" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
           <div className="paper-card h-24 bg-muted/10" />
           <div className="paper-card h-24 bg-muted/10" />
           <div className="paper-card h-24 bg-muted/10" />
           <div className="paper-card h-24 bg-muted/10" />
        </div>
        <div className="space-y-4">
           <div className="h-20 bg-muted/10 rounded-3xl" />
           <div className="h-64 bg-muted/20 rounded-3xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-w-5xl mx-auto px-4 py-8 md:py-10">
      {/* ====== Estrada (linhas pontilhadas centrais com neblina) ====== */}
      <MemoizedRoadLines />

      <div className="relative z-10 space-y-8">
        {/* ============ PAINEL DE CONTROLE (TOPO) ============ */}
        <header className="paper-card p-5 md:p-6 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold flex items-center gap-2">
                Mapa de guerra <Sparkles className="h-3 w-3 text-accent" />
              </p>
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mt-1">
                Trilha Estratégica
              </h1>
              <p className="text-xs md:text-sm text-muted-foreground mt-1.5 max-w-md">
                Sua estrada de estudos —{" "}
                <strong>semana {currentWeekIndex + 1}</strong> de {totalSemanas}.
              </p>
            </div>

            <Button
              onClick={() => setSetupOpen(true)}
              className="tactile-btn rounded-2xl bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white border-none font-bold text-xs uppercase tracking-wider h-11 px-4 gap-2 shadow-lg"
            >
              <SettingsIcon className="h-4 w-4" />
              Configurar Trilha
            </Button>
          </div>

          {/* Métricas compactas + sparkline */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
            <div className="paper-card px-4 py-3 col-span-2 md:col-span-2 min-h-[88px]">
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground font-bold">
                  Progresso da semana
                </span>
                <Target className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
              </div>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl md:text-4xl font-black tabular-nums leading-none">
                  {studiedThisWeek}
                </span>
                <span className="text-base font-bold text-muted-foreground tabular-nums">
                  /{metaSemana}
                </span>
                <span className="ml-auto text-xs font-black text-[hsl(var(--accent))]">
                  {progresso}%
                </span>
              </div>
              <div className="mt-2">
                <MemoizedSparkline data={sparkData} />
              </div>
            </div>

            <MetricCard
              label="Foco rodízio"
              value={focoSemana.length || focoAulas.length}
              hint={espLabel ?? (isMedico ? "Médico" : "—")}
              tone="accent"
            />
            <MetricCard
              label="Prova"
              value={diasProva ?? "—"}
              hint={
                diasProva !== null
                  ? `dias · ${settings.prova_nome || "definida"}`
                  : "configure"
              }
            />
          </div>
        </header>

        {podeDirecionamento && (
          <RodizioRapido settings={settings} onSave={salvarSettings} aulas={aulas} />
        )}

        {podeDirecionamento && settings.perfil === "interno_geral" && settings.rodizio_atual && (
          <ExplicacaoTrilha 
            currentWeekIndex={currentWeekIndex}
            totalSemanas={totalSemanas}
            aulasSemanaAtual={aulasSemanaAtual}
            focoSemana={focoSemana}
            baseSemana={baseSemana}
            espLabel={espLabel}
            getRodizioForWeek={getRodizioForWeek}
            totalAulas={aulas.length}
            analiseEstrategica={analiseEstrategica}
          />
        )}

        {/* ============ SEMANAS PASSADAS (sanfona com alerta) ============ */}
        {podeDirecionamento && (
          <motion.div
            layout
            className={cn(
              "rounded-3xl bg-white border border-border/40 shadow-sm overflow-hidden relative z-10",
              pendenciasAulas.length > 0 && "ring-1 ring-amber-400/30",
            )}
          >
            <button
              type="button"
              onClick={() => setPastOpen((x) => !x)}
              className="w-full flex items-center justify-between gap-3 p-4 md:p-5 text-left hover:bg-muted/10 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <div className="h-10 w-10 rounded-2xl bg-muted/10 grid place-items-center">
                    <Check className="h-5 w-5 text-muted-foreground" />
                  </div>
                  {pendenciasAulas.length > 0 && (
                    <motion.span
                      animate={{ scale: [1, 1.25, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity }}
                      className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-[9px] font-black text-white grid place-items-center shadow"
                    >
                      {pendenciasAulas.length}
                    </motion.span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm md:text-base font-black tracking-tight truncate">
                    Mostrar semanas passadas
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {pendenciasAulas.length > 0
                      ? `${pendenciasAulas.length} conteúdos pendentes de semanas anteriores`
                      : "Tudo em dia! Suas conquistas passadas estão salvas."}
                  </p>
                </div>
              </div>
              <motion.div animate={{ rotate: pastOpen ? 180 : 0 }}>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {pastOpen && (
                <motion.div
                  key="past-content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-t border-border/40"
                >
                  <div className="p-4 md:p-6 space-y-8">
                    {pendenciasAulas.length === 0 ? (
                      <div className="text-center py-6 space-y-2">
                        <Trophy className="h-8 w-8 text-amber-500 mx-auto opacity-50" />
                        <p className="text-xs text-muted-foreground">
                          Nenhuma pendência encontrada. Excelente ritmo!
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-amber-500" />
                          Conteúdos Pendentes
                        </h3>
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div className="grid sm:grid-cols-2 gap-4">
                            {pendenciasAulas.map((a) => (
                              <div
                                key={a.id}
                                className="paper-card p-5 group relative transition-all border border-border/40"
                              >
                                <div className="space-y-3 mb-4">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge variant="secondary" className="rounded-md text-[8px] font-black uppercase tracking-widest bg-muted/60 px-1.5 py-0">
                                      {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                                    </Badge>
                                    <IncidenciaBadge tier={a.tier} compact />
                                  </div>
                                  <h4 className="font-bold text-base leading-tight tracking-tight text-foreground truncate">
                                    {a.nome}
                                  </h4>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() => fazerAgoraPendencia(a.id)}
                                    className="flex-1 rounded-xl h-9 text-[9px] font-black uppercase tracking-wider bg-primary hover:bg-primary/90 text-white shadow-md"
                                  >
                                    Fazer hoje
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setRedistOpen(true)}
                                    className="rounded-xl h-9 px-3 text-[9px] font-black uppercase tracking-wider text-muted-foreground bg-muted/30 border border-border/40"
                                  >
                                    Mover
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ============ SEMANA ATUAL (DESTAQUE CENTRAL) ============ */}
        {podeDirecionamento ? (
          <motion.section
            ref={semanaAtualRef as any}
            layout
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 bg-white rounded-3xl shadow-xl border border-border/40 p-6 md:p-8"
          >
            <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--accent))] font-black">
                  Semana atual
                </p>
                <h2 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">
                  Onde você está agora.
                </h2>
              </div>
              <div className="px-4 py-2 rounded-2xl bg-muted/30 border border-border/40 text-right">
                <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground leading-none">
                  Status da Trilha
                </p>
                <p className="text-lg font-bold tabular-nums">
                  {currentWeekIndex + 1} <span className="text-muted-foreground text-sm font-medium">/ {totalSemanas}</span>
                </p>
              </div>
            </div>

            {/* Foco Sincronizado (Rodízio) */}
            {rodizioSemana.length > 0 && (
              <div className="space-y-6 mb-12">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-[hsl(var(--accent))] flex items-center gap-2">
                  <Flame className="h-4 w-4" />
                  Foco Sincronizado: {espLabel}
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {rodizioSemana.map((a) => {
                    const done = isAulaDone(a.id);
                    const s = getStats(a.id);
                    const pct = s.count > 0 ? Math.round((s.acertos / s.count) * 100) : 0;
                    const insuf = isAulaInsuficiente(a.id);
                    return (
                      <motion.div
                        key={a.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "paper-card p-5 group relative transition-all border-2 border-accent/20 ring-1 ring-accent/10",
                          done && !insuf && "opacity-60 grayscale-[0.5]",
                          insuf && "ring-2 ring-amber-400/60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="rounded-md text-[8px] font-black uppercase tracking-widest bg-accent/10 text-accent px-1.5 py-0">
                                {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                              </Badge>
                              <IncidenciaBadge tier={a.tier} compact />
                            </div>
                            <h4 className={cn("font-bold text-base leading-tight tracking-tight", done && "line-through text-muted-foreground/70")}>
                              {a.nome}
                            </h4>
                            <p className="text-[10px] font-bold tabular-nums text-muted-foreground">
                              {Math.min(s.count, META_OQS)}/{META_OQS} OQs
                              {s.count > 0 && <span className={cn("ml-2", pct >= 60 ? "text-emerald-600" : "text-amber-600")}>· {pct}% acertos</span>}
                            </p>
                            {insuf && (
                              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Estudo insuficiente — estude mais para melhorar a nota
                              </p>
                            )}
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => handleCheckClick(a)}
                            className={cn(
                              "h-8 w-8 rounded-xl border-2 grid place-items-center shrink-0 transition-colors",
                              done
                                ? "bg-[hsl(var(--accent))] border-[hsl(var(--accent))] text-white"
                                : "border-accent/30 bg-white hover:border-accent/60",
                            )}
                          >
                            {done && <Check className="h-5 w-5" />}
                          </motion.button>
                        </div>
                        
                        
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="tactile-btn rounded-xl bg-accent/5 text-[9px] font-black uppercase tracking-widest h-9 gap-1.5 border border-accent/10"
                            onClick={() => navigate(`/materiais?id=${a.id}`)}
                          >
                            <FileText className="h-3.5 w-3.5 text-accent" />
                            Resumo
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-xl font-black text-[9px] uppercase tracking-widest h-9 gap-1.5 bg-accent hover:bg-accent/90 text-white shadow-md active:scale-95 transition-transform"
                            onClick={() => navigate(`/estudo?tipo=aula&aula_id=${a.id}`)}
                          >
                            <Target className="h-3.5 w-3.5" />
                            Estudar
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Foco Direcionado (Manualmente Adicionado / Puxado) */}
            {direcionadoSemana.length > 0 && (
              <div className="space-y-6 mb-12">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-indigo-500 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Foco Direcionado (Fixadas)
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {direcionadoSemana.map((a) => {
                    const done = isAulaDone(a.id);
                    const s = getStats(a.id);
                    const pct = s.count > 0 ? Math.round((s.acertos / s.count) * 100) : 0;
                    const insuf = isAulaInsuficiente(a.id);
                    return (
                      <motion.div
                        key={a.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={cn(
                          "paper-card p-5 group relative transition-all border-2 border-indigo-200/50 ring-1 ring-indigo-100/30 bg-indigo-50/10",
                          done && !insuf && "opacity-60 grayscale-[0.5]",
                          insuf && "ring-2 ring-amber-400/60"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="space-y-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <Badge variant="secondary" className="rounded-md text-[8px] font-black uppercase tracking-widest bg-indigo-100 text-indigo-600 px-1.5 py-0">
                                {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                              </Badge>
                              <IncidenciaBadge tier={a.tier} compact />
                              <Badge variant="outline" className="rounded-md text-[7px] font-black uppercase tracking-widest border-indigo-200 text-indigo-500 px-1.5 py-0">
                                Fixada
                              </Badge>
                            </div>
                            <h4 className={cn("font-bold text-base leading-tight tracking-tight", done && "line-through")}>
                              {a.nome}
                            </h4>
                            <p className="text-[10px] font-bold tabular-nums text-muted-foreground">
                              {Math.min(s.count, META_OQS)}/{META_OQS} OQs
                              {s.count > 0 && <span className={cn("ml-2", pct >= 60 ? "text-emerald-600" : "text-amber-600")}>· {pct}% acertos</span>}
                            </p>
                            {insuf && (
                              <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Estudo insuficiente — estude mais para melhorar a nota
                              </p>
                            )}
                          </div>
                          <motion.button
                            whileTap={{ scale: 0.8 }}
                            onClick={() => handleCheckClick(a)}
                            className={cn(
                              "h-8 w-8 rounded-xl border-2 grid place-items-center shrink-0 transition-colors",
                              done
                                ? "bg-indigo-500 border-indigo-500 text-white"
                                : "border-indigo-300 bg-white hover:border-indigo-500/40",
                            )}
                          >
                            {done && <Check className="h-5 w-5" />}
                          </motion.button>
                        </div>
                        
                        
                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="tactile-btn rounded-xl bg-indigo-50 text-[9px] font-black uppercase tracking-widest h-9 gap-1.5 border border-indigo-100"
                            onClick={() => navigate(`/materiais?id=${a.id}`)}
                          >
                            <FileText className="h-3.5 w-3.5 text-indigo-500" />
                            Resumo
                          </Button>
                          <Button
                            size="sm"
                            className="rounded-xl font-black text-[9px] uppercase tracking-widest h-9 gap-1.5 bg-indigo-500 hover:bg-indigo-600 text-white shadow-md active:scale-95 transition-transform"
                            onClick={() => navigate(`/estudo?tipo=aula&aula_id=${a.id}`)}
                          >
                            <Target className="h-3.5 w-3.5" />
                            Estudar
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Matérias Base */}
            <div className="space-y-6">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Matérias Base
              </h3>
              {(() => {
                const baseList = baseSemana;
                if (baseList.length === 0) {
                  return (
                    <div className="p-8 rounded-3xl bg-muted/20 border border-dashed border-border/60 text-center">
                      <p className="text-xs text-muted-foreground italic">
                        Nenhuma matéria base disponível ainda.
                      </p>
                    </div>
                  );
                }
                const grupos: { level: "alta" | "media" | "baixa"; titulo: string; aulas: typeof baseList }[] = [
                  { level: "alta", titulo: "Alta incidência", aulas: baseList.filter((a) => a.tier <= 1) },
                  { level: "media", titulo: "Média incidência", aulas: baseList.filter((a) => a.tier === 2) },
                  { level: "baixa", titulo: "Baixa incidência", aulas: baseList.filter((a) => a.tier >= 3) },
                ];
                return grupos
                  .filter((g) => g.aulas.length > 0)
                  .map((g) => {
                    const sample = getIncidencia(g.aulas[0].tier);
                    return (
                      <div key={g.level} className="space-y-4">
                        <div className="flex items-center gap-2 px-1">
                          <span className={cn("h-2.5 w-2.5 rounded-full shadow-sm", sample.dotClass)} />
                          <h4 className="text-[11px] font-black uppercase tracking-widest text-muted-foreground">
                            {g.titulo}
                          </h4>
                          <span className="text-[10px] font-bold text-muted-foreground/50 tabular-nums bg-muted/30 px-2 py-0.5 rounded-full">
                            {g.aulas.length} conteúdos
                          </span>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-4">
                          {g.aulas.map((a) => {
                            const done = isAulaDone(a.id);
                            const s = getStats(a.id);
                            const pct = s.count > 0 ? Math.round((s.acertos / s.count) * 100) : 0;
                            const insuf = isAulaInsuficiente(a.id);
                            return (
                              <motion.div
                                key={a.id}
                                layout
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ scale: 1.01 }}
                                className={cn(
                                  "paper-card p-5 group relative transition-all border border-border/40",
                                  done && !insuf && "opacity-60 grayscale-[0.5]",
                                  insuf && "ring-2 ring-amber-400/60"
                                )}
                              >
                                <div className="flex items-start justify-between gap-3 mb-4">
                                  <div className="space-y-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <Badge variant="secondary" className="rounded-md text-[8px] font-black uppercase tracking-widest bg-muted/60 px-1.5 py-0">
                                        {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                                      </Badge>
                                      <IncidenciaBadge tier={a.tier} compact />
                                    </div>
                                    <h4 className={cn("font-bold text-base leading-tight tracking-tight", done && "line-through")}>
                                      {a.nome}
                                    </h4>
                                    <p className="text-[10px] font-bold tabular-nums text-muted-foreground">
                                      {Math.min(s.count, META_OQS)}/{META_OQS} OQs
                                      {s.count > 0 && <span className={cn("ml-2", pct >= 60 ? "text-emerald-600" : "text-amber-600")}>· {pct}% acertos</span>}
                                      <span className="ml-2 text-muted-foreground/60">· {a.total_oqs} disponíveis</span>
                                    </p>
                                    {insuf && (
                                      <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 flex items-center gap-1">
                                        <AlertTriangle className="h-3 w-3" />
                                        Estudo insuficiente — estude mais para melhorar a nota
                                      </p>
                                    )}
                                  </div>
                                  <motion.button
                                    whileTap={{ scale: 0.8 }}
                                    onClick={() => handleCheckClick(a)}
                                    className={cn(
                                      "h-8 w-8 rounded-xl border-2 grid place-items-center shrink-0 transition-colors",
                                      done
                                        ? "bg-[hsl(var(--primary))] border-[hsl(var(--primary))] text-white"
                                        : "border-border bg-white hover:border-primary/40",
                                    )}
                                  >
                                    {done && <Check className="h-5 w-5" />}
                                  </motion.button>
                                </div>
                                
                                
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="tactile-btn rounded-xl bg-muted/30 text-[9px] font-black uppercase tracking-widest h-9 gap-1.5 border border-border/40"
                                    onClick={() => navigate(`/materiais?id=${a.id}`)}
                                  >
                                    <FileText className="h-3.5 w-3.5 text-primary" />
                                    Resumo
                                  </Button>
                                  <Button
                                    size="sm"
                                    className="rounded-xl font-black text-[9px] uppercase tracking-widest h-9 gap-1.5 bg-primary hover:bg-primary/90 text-white shadow-md active:scale-95 transition-transform"
                                    onClick={() => navigate(`/estudo?tipo=aula&aula_id=${a.id}`)}
                                  >
                                    <Target className="h-3.5 w-3.5" />
                                    Estudar
                                  </Button>
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  });
              })()}
            </div>




            {/* Botão flutuante "+" — segue a rolagem enquanto a semana atual está visível.
                Ao clicar, expande no centro da tela com backdrop (clique fora fecha). */}
            <LayoutGroup>
              <AnimatePresence>
                {fabVisible && !searchOpen && (
                  <motion.button
                    key="plus-fab"
                    layoutId="free-study-morph"
                    onClick={() => setSearchOpen(true)}
                    initial={{ opacity: 0, scale: 0.6 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.6 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.92 }}
                    transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    className="fixed right-4 md:right-8 top-1/2 -translate-y-1/2 z-40 h-14 w-14 rounded-full bg-[hsl(var(--accent))] text-[hsl(var(--accent-foreground))] shadow-2xl grid place-items-center"
                    aria-label="Adicionar estudo livre"
                  >
                    <Plus className="h-6 w-6" />
                  </motion.button>
                )}
              </AnimatePresence>

              <AnimatePresence>
                {searchOpen && (
                  <motion.div
                    key="search-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => {
                      setSearchOpen(false);
                      setSearchQ("");
                    }}
                    className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 pt-[18vh] sm:pt-4"
                  >
                    <motion.div
                      layoutId={!reduceMotion ? "free-study-morph" : undefined}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white rounded-3xl shadow-2xl ring-1 ring-border/60 w-full max-w-md overflow-hidden"
                    >
                      <div className="flex items-center gap-2 px-4 py-3 border-b border-border/40">
                        <Search className="h-4 w-4 text-muted-foreground shrink-0" />
                        <Input
                          autoFocus
                          value={searchQ}
                          onChange={(e) => setSearchQ(e.target.value)}
                          placeholder="Buscar tema livre..."
                          className="border-0 shadow-none focus-visible:ring-0 h-9 px-0 text-sm flex-1"
                        />
                        <button
                          onClick={() => {
                            setSearchOpen(false);
                            setSearchQ("");
                          }}
                          className="h-8 w-8 rounded-full grid place-items-center hover:bg-muted/60 text-muted-foreground"
                          aria-label="Fechar"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {filtradas.length > 0 ? (
                        <div className="max-h-[50vh] overflow-y-auto p-2 space-y-1">
                          {filtradas.map((a) => (
                            <button
                              key={a.id}
                              onClick={() => {
                                fazerAgoraPendencia(a.id);
                                setSearchOpen(false);
                                setSearchQ("");
                                toast.success(`"${a.nome}" adicionada à trilha desta semana!`);
                              }}
                              className="w-full text-left p-2.5 rounded-xl hover:bg-muted/60 transition flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-sm font-bold truncate">{a.nome}</div>
                                <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground truncate">
                                  {ESPECIALIDADE_LABEL[
                                    a.especialidade as keyof typeof ESPECIALIDADE_LABEL
                                  ] ?? a.especialidade}{" "}
                                  · {a.total_oqs} OQs
                                </div>
                              </div>
                              <span className="text-[10px] font-black uppercase tracking-wider text-[hsl(var(--accent))] shrink-0">
                                Fixar →
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="p-6 text-center text-xs text-muted-foreground">
                          {searchQ.trim().length < 2
                            ? "Digite ao menos 2 letras para buscar."
                            : "Nenhum tema encontrado."}
                        </div>
                      )}
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </LayoutGroup>

          </motion.section>
        ) : (
          <section className="relative z-10 bg-white rounded-3xl shadow-2xl ring-1 ring-amber-500/20 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-3">
              <Lock className="h-4 w-4 text-amber-500" />
              <p className="text-[10px] uppercase tracking-widest font-black text-amber-600">
                Direcionamento exclusivo Plano Ouro
              </p>
            </div>
            <h3 className="font-black text-xl mb-2">
              Desbloqueie o Foco Sincronizado e as Matérias Base
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              A trilha direciona automaticamente suas aulas com base no rodízio
              e nas matérias de maior incidência.
            </p>
            <Button
              asChild
              className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:opacity-90 px-6 rounded-xl h-12 shadow-lg"
            >
              <Link to="/meu-plano?upgrade=ouro">
                <Crown className="h-4 w-4 mr-1.5" />
                Upgrade para Ouro
              </Link>
            </Button>
          </section>
        )}

        {/* ============ ESTUDOS PERDIDOS (resgate) ============ */}
        {podeDirecionamento && perdidosAulas.length > 0 && (
          <section className="rounded-3xl bg-white/60 backdrop-blur-md border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <GhostIcon className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
                Estudos que você perdeu
              </h3>
            </div>
            <div className="space-y-2">
              {perdidosAulas.map((a) => (
                <div
                  key={a.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-2xl bg-white border border-border/60"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate text-muted-foreground">
                      {a.nome}
                    </p>
                    <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground/70">
                      {ESPECIALIDADE_LABEL[
                        a.especialidade as keyof typeof ESPECIALIDADE_LABEL
                      ] ?? a.especialidade}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const novosPerdidos = (settings.perdidos ?? []).filter(
                        (id) => id !== a.id,
                      );
                      const novosOverrides = {
                        ...(settings.plano_overrides ?? {}),
                      };
                      novosOverrides[a.id] = currentWeekIndex + 1;
                      salvarSettings({
                        ...settings,
                        perdidos: novosPerdidos,
                        plano_overrides: novosOverrides,
                      });
                    }}
                    className="rounded-xl h-9 px-3 text-[10px] font-black uppercase tracking-wider"
                  >
                    Resgatar
                  </Button>
                </div>
              ))}
            </div>
          </section>
        )}




        {/* ============ REVELAR PRÓXIMOS PASSOS ============ */}
        {podeDirecionamento && (
          <div className="relative">
            <div className="flex justify-center gap-2 flex-wrap">
              <Button
                onClick={() => setRevealCount((x) => x + 3)}
                variant="outline"
                className="rounded-full h-12 px-6 gap-2 bg-white shadow-md font-black text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-transform"
              >
                <ArrowDown className="h-4 w-4" />
                {futureOpen
                  ? `Revelar mais 3 semanas`
                  : "Revelar próximos passos"}
              </Button>
              {futureOpen && (
                <Button
                  onClick={() => setRevealCount(0)}
                  variant="ghost"
                  className="rounded-full h-12 px-5 gap-2 font-black text-xs uppercase tracking-widest text-muted-foreground"
                >
                  Recolher
                </Button>
              )}
            </div>


            <AnimatePresence>
              {futureOpen && (
                <motion.div
                  initial="hidden"
                  animate="visible"
                  exit="hidden"
                  variants={{
                    hidden: { opacity: 0 },
                    visible: {
                      opacity: 1,
                      transition: { staggerChildren: 0.12 },
                    },
                  }}
                  className="mt-6 space-y-4"
                >
                  {proximasSemanas.length === 0 ? (
                    <motion.p
                      variants={{
                        hidden: { opacity: 0, y: 30 },
                        visible: { opacity: 1, y: 0 },
                      }}
                      className="text-center text-sm text-muted-foreground italic"
                    >
                      Sem aulas mapeadas para as próximas semanas — você pode
                      adicionar manualmente.
                    </motion.p>
                  ) : (
                    proximasSemanas.map(({ wk, aulas: list }) => (
                      <motion.div
                        key={wk}
                        variants={{
                          hidden: { opacity: 0, y: 40 },
                          visible: {
                            opacity: 1,
                            y: 0,
                            transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                          },
                        }}
                        className="relative z-10 bg-white rounded-3xl shadow-xl border border-border/40 p-6 md:p-8"
                      >
                        <div className="flex items-center justify-between mb-8">
                          <div className="space-y-1">
                            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-black">
                              Próxima etapa
                            </p>
                            <h2 className="text-xl md:text-2xl font-black tracking-tight text-foreground">
                              Semana {wk + 1}
                            </h2>
                          </div>
                          <div className="px-4 py-2 rounded-2xl bg-muted/30 border border-border/40 text-right">
                            <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground leading-none">
                              Conteúdos
                            </p>
                            <p className="text-lg font-bold tabular-nums">
                              {list.length}
                            </p>
                          </div>
                        </div>
                        {list.length === 0 ? (
                          <div className="p-8 rounded-3xl bg-muted/20 border border-dashed border-border/60 text-center">
                            <p className="text-xs text-muted-foreground italic">
                              Vaga livre.
                            </p>
                          </div>
                        ) : (
                          <ul className="divide-y divide-border/40 rounded-2xl border border-border/40 overflow-hidden">
                            {list.map((a) => (
                              <li
                                key={a.id}
                                className="flex items-center justify-between gap-3 px-3 py-2.5 bg-white hover:bg-muted/30 transition-colors"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-bold truncate leading-tight">
                                    {a.nome}
                                  </p>
                                  <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground mt-0.5">
                                    {ESPECIALIDADE_LABEL[
                                      a.especialidade as keyof typeof ESPECIALIDADE_LABEL
                                    ] ?? a.especialidade}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    fazerAgoraPendencia(a.id);
                                    toast.success(`"${a.nome}" puxada para a semana atual!`);
                                  }}
                                  className="shrink-0 h-8 px-2.5 rounded-lg gap-1 text-[10px] font-black uppercase tracking-wider text-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/10"
                                  title="Puxar para a semana atual"
                                >
                                  <ArrowUp className="h-3.5 w-3.5" />
                                  Puxar
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </motion.div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ============ TROFÉU FINAL — PROVA ============ */}
        {settings.prova_data && (
          <div className="flex flex-col items-center pt-6 pb-2 text-center">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 grid place-items-center shadow-xl">
              <Trophy className="h-7 w-7 text-white drop-shadow" />
            </div>
            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mt-3">
              Linha de chegada
            </p>
            <p className="text-sm font-bold">
              {settings.prova_nome || "Sua prova"} ·{" "}
              {new Date(settings.prova_data).toLocaleDateString("pt-BR")}
            </p>
          </div>
        )}

        {/* ============ CALENDÁRIO (final absoluto da página) ============ */}
        <CalendarioEstudos settings={settings as any} onSave={salvarSettings} />
      </div>


      {/* ============ DIALOGS ============ */}
      <SetupDialog
        open={setupOpen}
        onOpenChange={setSetupOpen}
        initial={settings}
        onSave={salvarSettings}
        aulas={aulas}
      />

      <RedistribuirDialog
        open={redistOpen}
        onOpenChange={setRedistOpen}
        pendencias={pendenciasAulas}
        maxPorSemana={AULAS_POR_SEMANA}
        proximasSemanas={proximasSemanasDisponiveis}
        currentWeekIndex={currentWeekIndex}
        onConfirm={aplicarRedistribuicao}
      />

      <Dialog open={!!confirmAula} onOpenChange={(o) => !o && setConfirmAula(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Domínio do tema</DialogTitle>
            <DialogDescription asChild>
              <div>
                Você realmente considera que tem domínio sobre o tema{" "}
                <strong>{confirmAula?.nome}</strong>?
                <br />
                <span className="text-xs text-muted-foreground">
                  Ao confirmar, registraremos suas OQs com nota de 70% para essa matéria.
                </span>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                const a = confirmAula;
                setConfirmAula(null);
                if (a) navigate(`/estudo?tipo=aula&aula_id=${a.id}`);
              }}
            >
              Não, quero estudar mais
            </Button>
            <Button
              onClick={async () => {
                const a = confirmAula;
                setConfirmAula(null);
                if (!a) return;
                await marcarDominada(a.id);
                toast.success(`"${a.nome}" marcada como dominada.`);
              }}
            >
              Sim, já domino esse assunto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

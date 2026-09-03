import { useEffect, useState, useRef, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { ESPECIALIDADE_LABEL, Especialidade } from "@/lib/oq";
import { ArrowUpRight, Flame, Sparkles, Clock, Heart, Stethoscope, Baby, Activity, Info, Trophy, Target, Award, Zap, Brain, TrendingUp, Lock, Crown, BookOpen, AlertTriangle, Compass, Hand, History, Rewind, Loader2 } from "lucide-react";
import { UteroIcon, BisturiIcon } from "@/components/icons/MedIcons";
import NeonProgressBar from "@/components/console/NeonProgressBar";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import BentoCard from "@/components/ui/bento-card";

// Lazy load heavy dashboard components
const EspecialidadesRanking = lazy(() => import("@/components/dashboard/EspecialidadesRanking"));
const RecomendacoesMateriais = lazy(() => import("@/components/dashboard/RecomendacoesMateriais"));
const InsightSurpresa = lazy(() => import("@/components/dashboard/InsightSurpresa"));


const NOTA_LABEL = ["Fácil demais", "Fácil", "Médio", "Difícil", "Impossível/Erro"];
const NOTA_COLOR = ["bg-[hsl(var(--success))]", "bg-[hsl(152_60%_55%)]", "bg-[hsl(var(--warning))]", "bg-[hsl(20_90%_55%)]", "bg-[hsl(var(--destructive))]"];

const ESP_ICON: Record<Especialidade, any> = {
  clinica_medica: Stethoscope,
  cirurgia_geral: BisturiIcon,
  pediatria: Baby,
  ginecologia_obstetricia: UteroIcon,
  medicina_preventiva: Activity,
  saude_mental: Brain,
};

function ContainerRevisaoExpandivel({ tipo, label, icon: Icon, colorClass, locked, featured, description }: { tipo: string; label: string; icon: any; colorClass?: string; locked?: boolean; featured?: boolean; description?: string }) {
  const [expandido, setExpandido] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (locked) return;
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setExpandido(false);
      }
    }
    if (expandido) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [expandido, locked]);

  if (locked) {
    return (
      <button
        onClick={() => navigate("/meu-plano")}
        className="paper-card p-4 text-left w-full relative overflow-hidden group opacity-90 hover:opacity-100 hover:-translate-y-1 transition-all border-dashed"
        title="Disponível nos planos Prata e Ouro"
      >
        <div className="absolute top-2 right-2 bg-amber-500/15 text-amber-500 p-1.5 rounded-lg">
          <Lock className="h-3.5 w-3.5" />
        </div>
        <Icon className={cn("h-5 w-5 mb-3 text-muted-foreground/70")} />
        <p className="font-semibold text-muted-foreground">{label}</p>
        <p className="text-xs text-amber-500/90 mt-1 flex items-center gap-1">
          <Crown className="h-3 w-3" /> Plano pago
        </p>
      </button>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative transition-all duration-300",
        featured && "col-span-2 row-span-2 md:col-span-2 md:row-span-2",
        expandido ? "z-50" : "z-0"
      )}
    >
      <button
        onClick={() => setExpandido(!expandido)}
        className={cn(
          "paper-card text-left transition-all group w-full h-full",
          featured
            ? "p-5 md:p-6 bg-gradient-to-br from-accent/15 via-accent/5 to-transparent border-accent/40 hover:border-accent/70 shadow-lg shadow-accent/10"
            : "p-4",
          expandido ? `ring-2 ring-accent border-accent/50 shadow-xl shadow-accent/10` : "hover:-translate-y-1"
        )}
      >
        {featured && (
          <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.2em] text-accent bg-accent/15 border border-accent/30 px-2 py-1 rounded-full mb-3">
            <Sparkles className="h-2.5 w-2.5" /> Repetição Espaçada
          </span>
        )}
        <Icon className={cn(
          "transition-colors",
          featured ? "h-8 w-8 mb-3" : "h-5 w-5 mb-3",
          expandido ? "text-accent fill-accent" : colorClass || "text-accent"
        )} />
        <p className={cn("font-semibold text-[hsl(var(--foreground))]", featured && "text-lg md:text-xl font-black")}>{label}</p>
        {featured && description && (
          <p className="text-xs text-muted-foreground/80 mt-1.5 leading-snug">{description}</p>
        )}
        <p className={cn("text-xs text-muted-foreground mt-1 group-hover:text-accent transition", featured && "mt-3 font-bold text-accent")}>
          {expandido ? "Selecione a área ↓" : featured ? "Iniciar revisão →" : "Estudar →"}
        </p>
      </button>

      <AnimatePresence>
        {expandido && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            className="absolute top-full left-0 right-0 mt-2 p-2 bg-card border border-border shadow-2xl rounded-2xl flex flex-col gap-1 min-w-[200px]"
          >
            <Link
              to={`/estudo?tipo=${tipo}`}
              className="px-3 py-2 text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-accent hover:text-white transition-colors flex items-center justify-between group"
            >
              Todas as Especialidades
              <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
            </Link>
            <div className="h-px bg-border/50 my-1" />
            {(Object.keys(ESPECIALIDADE_LABEL) as Especialidade[]).map((e) => (
              <Link
                key={e}
                to={`/estudo?tipo=${tipo}&esp=${e}`}
                className="px-3 py-2 text-xs font-medium rounded-xl hover:bg-accent/10 text-muted-foreground hover:text-accent transition-colors flex items-center justify-between group"
              >
                {ESPECIALIDADE_LABEL[e]}
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100" />
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface EspecialidadeStats {
  especialidade: Especialidade;
  visto: number;
  acertos: number;
  erros: number;
  dominio: number;
}


function GuideContent() {
  return (
    <>
      <div className="space-y-4">
        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-xl bg-accent/20 flex items-center justify-center shrink-0 border border-accent/30">
            <Target className="w-4 h-4 text-accent" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-white uppercase tracking-wider">Trilha Diária</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Estude os OQs da trilha sem medo de errar. Use materiais, resumos e áudio aulas para reforçar. Tente novamente até dominar o tema.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0 border border-purple-500/30">
            <Flame className="w-4 h-4 text-purple-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-white uppercase tracking-wider">Fila Sem Filtro</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Após o estudo direcionado, enfrente a fila geral. A repetição no tempo certo é a chave para a consolidação até a prova.
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0 border border-blue-500/30">
            <Clock className="w-4 h-4 text-blue-400" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-bold text-white uppercase tracking-wider">Organização</p>
            <p className="text-xs text-white/60 leading-relaxed">
              Configure seu internato e agende simulados. Aproveite cada minuto livre no app para construir sua base.
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-white/10 text-center">
        <p className="text-xs italic text-accent font-medium">
          "Sua aprovação está mais próxima a cada OQ que você faz. Faça com exagero!"
        </p>
      </div>
    </>
  );
}

function HeroSection({ stats, user }: { stats: any; user: any }) {
  const { reduceMotion } = useSettings();
  const [greeting, setGreeting] = useState("");
  
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12) setGreeting("Bom dia");
    else if (hour < 18) setGreeting("Boa tarde");
    else setGreeting("Boa noite");
  }, []);

  const userName = user?.user_metadata?.full_name?.split(" ")[0] || "Doutor(a)";
  const [showGuide, setShowGuide] = useState(false);

  return (
    <section className="relative w-full py-8 md:py-16 flex flex-col items-center justify-center overflow-hidden">
      <style>{`
        .hero-card {
          position: relative;
          width: 100%;
          max-width: 650px;
          min-height: 320px;
          border-radius: 2.5rem;
          z-index: 10;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 2rem;
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(var(--hero-blur, 12px));
          box-shadow: none;
        }

        /* Neon Border Animation */
        .hero-card::before {
          content: '';
          position: absolute;
          inset: -2px;
          background: var(--hero-border-bg, conic-gradient(
            from 0deg,
            transparent 0%,
            transparent 25%,
            hsl(var(--accent)) 50%,
            transparent 75%,
            transparent 100%
          ));
          border-radius: 2.5rem;
          z-index: 1;
        }

        [data-reduce-motion="1"] {
          --hero-blur: 0px;
          --hero-border-bg: hsl(var(--accent)/0.3);
        }

        [data-reduce-motion="0"] .hero-card::before {
          animation: rotate-neon 4s linear infinite;
        }

        @keyframes rotate-neon {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }


        .hero-bg {
          position: absolute;
          inset: 3px;
          z-index: 2;
          background: rgba(10, 15, 30, 0.95);
          backdrop-filter: blur(40px);
          border-radius: 2.35rem;
          overflow: hidden;
        }

        .hero-blob {
          position: absolute;
          z-index: 0;
          top: 50%;
          left: 50%;
          width: 500px;
          height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, hsl(var(--accent)) 0%, transparent 70%);
          opacity: 0.2;
          filter: blur(100px);
        }

        [data-reduce-motion="0"] .hero-blob {
          animation: blob-bounce 15s infinite ease-in-out;
        }


        @keyframes blob-bounce {
          0%, 100% { transform: translate(-100%, -100%) scale(1) rotate(0deg); }
          33% { transform: translate(30%, -70%) scale(1.3) rotate(120deg); }
          66% { transform: translate(-50%, 40%) scale(0.8) rotate(240deg); }
        }
      `}</style>

      <div className="hero-card relative">
        <div className="hero-blob" />
        <div className="hero-bg" />
        
        {!reduceMotion && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute inset-0 pointer-events-none"
          />
        )}
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6 w-full">
          {reduceMotion ? (
            <div className="bg-accent/20 p-5 rounded-full border border-accent/40 shadow-[0_0_30px_rgba(var(--accent-rgb),0.4)]">
              <Hand className="w-12 h-12 text-accent" />
            </div>
          ) : (
            <motion.div
              animate={{ 
                rotate: [0, 15, 0, 15, 0],
                scale: [1, 1.1, 1],
              }}
              transition={{ 
                duration: 2.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="bg-accent/20 p-5 rounded-full border border-accent/40 shadow-[0_0_30px_rgba(var(--accent-rgb),0.4)]"
            >
              <Hand className="w-12 h-12 text-accent" />
            </motion.div>
          )}

          <div className="space-y-3">
            <h2 className="text-xl md:text-2xl font-medium text-white/70">
              {greeting}, <span className="text-white font-bold">{userName}</span>
            </h2>
            <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-accent to-white tracking-tighter leading-none pb-2">
              Pronto para evoluir?
            </h1>
            <p className="text-white/60 font-medium text-sm md:text-base max-w-[300px] mx-auto">
              Cada OQ conta para a sua aprovação. Mantenha o foco!
            </p>
          </div>

          <div className="flex flex-col items-center gap-6 w-full pt-4">
            <button 
              onClick={() => setShowGuide(!showGuide)}
              className="group flex flex-col items-center gap-2 transition-all hover:opacity-100"
            >
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-accent/80 group-hover:text-accent transition-colors">
                Saiba como usar o app
              </span>
              {reduceMotion ? (
                <div className={cn("transition-transform duration-300", showGuide && "rotate-180")}>
                  <div className="w-8 h-8 rounded-full border border-accent/30 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-accent" />
                  </div>
                </div>
              ) : (
                <motion.div
                  animate={{ y: showGuide ? 0 : [0, 6, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                  className={cn("transition-transform duration-300", showGuide && "rotate-180")}
                >
                  <div className="w-8 h-8 rounded-full border border-accent/30 flex items-center justify-center">
                    <Activity className="w-4 h-4 text-accent" />
                  </div>
                </motion.div>
              )}
            </button>

            <AnimatePresence>
              {showGuide && (
                reduceMotion ? (
                  <div className="w-full overflow-hidden">
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-left space-y-6 mt-4 backdrop-blur-md">
                      {/* Guide content ... */}
                      <GuideContent />
                    </div>
                  </div>
                ) : (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="w-full overflow-hidden"
                  >
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-6 text-left space-y-6 mt-4 backdrop-blur-md">
                      <GuideContent />
                    </div>
                  </motion.div>
                )
              )}
            </AnimatePresence>
          </div>
        </div>
        </div>
    </section>
  );
}


export default function Dashboard() {
  const { user } = useAuth();
  const { canUse } = useUserPlan();
  const lockFocado = !canUse("estudo_focado");
  const [stats, setStats] = useState({ total: 0, acertos: 0, erros: 0, hoje: 0, dist: [0,0,0,0,0] });
  const [historico, setHistorico] = useState<any[]>([]);
  const [especialidadeStats, setEspecialidadeStats] = useState<EspecialidadeStats[]>([]);
  const [aulasCriticas, setAulasCriticas] = useState<{ id: string; nome: string; especialidade: Especialidade; erros: number }[]>([]);

  useEffect(() => {
    document.title = "Área do aluno — OQ MED";
    if (!user) return;
    (async () => {
      // Get daily progress via RPC for accuracy (total completions)
      const { data: dailyCount } = await supabase.rpc("get_daily_progress", { p_user_id: user.id });

      const { data } = await supabase
        .from("desempenho_cards")
        .select("*, cards(comando, especialidade, aula_id, materiais(nome))")
        .eq("usuario_id", user.id)
        .order("timestamp_ultima", { ascending: false });
      
      const all = data ?? [];
      const dist = [0,0,0,0,0];
      let total = 0, acertos = 0, erros = 0;

      // Processar estatísticas por especialidade
      const espMap: Record<string, any> = {};
      const aulaMap: Record<string, any> = {};
      all.forEach((d: any) => {
        total += d.contador_vezes;
        acertos += d.contador_acertos;
        erros += d.contador_erros;
        if (d.ultima_nota !== null) dist[d.ultima_nota]++;

        const esp = d.cards?.especialidade;
        if (esp) {
          if (!espMap[esp]) espMap[esp] = { visto: 0, acertos: 0, erros: 0 };
          espMap[esp].visto += d.contador_vezes;
          espMap[esp].acertos += d.contador_acertos;
          espMap[esp].erros += d.contador_erros;
        }

        const aulaId = d.cards?.aula_id;
        const aulaNome = d.cards?.materiais?.nome;
        if (aulaId && aulaNome) {
          if (!aulaMap[aulaId]) aulaMap[aulaId] = { id: aulaId, nome: aulaNome, especialidade: esp, erros: 0 };
          // Consideramos "crítico" se a última nota foi 4 (Erro) ou se tem muitos erros acumulados
          if (d.ultima_nota === 4 || d.contador_erros > 2) {
            aulaMap[aulaId].erros++;
          }
        }
      });

      const processedEspStats = Object.entries(espMap).map(([esp, data]: [string, any]) => ({
        especialidade: esp as Especialidade,
        visto: data.visto,
        acertos: data.acertos,
        erros: data.erros,
        dominio: Math.max(0, Math.min(100, (data.acertos / (data.visto || 1)) * 100))
      }));

      const processedAulaStats = Object.values(aulaMap)
        .filter((a: any) => a.erros > 0)
        .sort((a: any, b: any) => b.erros - a.erros)
        .slice(0, 5) as any[];

      setStats({ total, acertos, erros, hoje: Number(dailyCount) || 0, dist });
      setEspecialidadeStats(processedEspStats);
      setAulasCriticas(processedAulaStats);
      setHistorico(all.slice(0, 8));
    })();
  }, [user]);

  const taxa = stats.total > 0 ? Math.round((stats.acertos / stats.total) * 100) : 0;
  const { dailyGoal } = useSettings();
  const dailyPct = Math.min(100, (stats.hoje / dailyGoal) * 100);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 md:py-8 space-y-12">
      <HeroSection stats={stats} user={user} />

      <header className="flex items-end justify-between gap-4 flex-wrap scroll-mt-24" id="sua-jornada">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground mb-2">Sua jornada</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[hsl(var(--foreground))]">Hoje, {stats.hoje} OQs.</h1>
        </div>
        <Link to="/estudo" className="px-6 py-3 rounded-2xl bg-accent text-white font-bold text-base hover:shadow-lg hover:shadow-accent/20 transition-all active:scale-95 inline-flex items-center gap-2">
          Faça OQs agora! <ArrowUpRight className="h-5 w-5" />
        </Link>
      </header>

      {/* Bento grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[140px]">
        {/* Meta diária — wide */}
        <BentoCard className="col-span-2 row-span-2 bg-[hsl(var(--primary))] text-white border-none shadow-[0_20px_50px_-12px_rgba(0,29,57,0.5)] ring-1 ring-white/10">
          <div className="flex flex-col h-full justify-between p-1">
            <div className="flex items-center justify-between">
              <span className="text-sm uppercase tracking-[0.25em] font-black text-[hsl(var(--accent))] drop-shadow-[0_0_8px_hsl(var(--accent)/0.5)]">Meta diária</span>
              <div className="p-2 rounded-full bg-[hsl(var(--accent))]/20 border border-[hsl(var(--accent))]/30">
                <Flame className="h-6 w-6 text-[hsl(var(--accent))] drop-shadow-[0_0_12px_hsl(var(--accent))]" />
              </div>
            </div>
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-8xl md:text-9xl font-black tabular-nums leading-none tracking-tighter text-[hsl(var(--accent))] drop-shadow-[0_0_25px_hsl(var(--accent)/0.6)]">
                  {stats.hoje}
                </span>
                <span className="text-4xl font-black text-[hsl(var(--accent))] opacity-70 drop-shadow-sm tabular-nums">/{dailyGoal}</span>
              </div>
              <div className="mt-3 inline-flex items-center px-4 py-1.5 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_20px_hsl(var(--accent)/0.4)]">
                <p className="text-sm md:text-base font-black text-[hsl(var(--primary))] uppercase tracking-wider">
                  {dailyGoal - stats.hoje > 0 ? `Faltam ${dailyGoal - stats.hoje} OQs` : "Meta cumprida! ✨"}
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-white/40">
                <span>Progresso</span>
                <span>{Math.round(dailyPct)}%</span>
              </div>
              <div className="h-3 rounded-full bg-white/10 overflow-hidden p-[2px]">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${dailyPct}%` }}
                  transition={{ duration: 1, ease: "circOut" }}
                  className="h-full rounded-full bg-gradient-to-r from-[hsl(var(--accent))] to-cyan-400"
                  style={{ boxShadow: "0 0 20px hsl(var(--accent)/0.5)" }}
                />
              </div>
            </div>
          </div>
        </BentoCard>

        <BentoCard>
          <Stat label="Taxa de acerto" value={`${taxa}%`} accent />
        </BentoCard>
        <BentoCard>
          <Stat label="Total" value={stats.total} />
        </BentoCard>
        <BentoCard>
          <Stat label="Acertos" value={stats.acertos} positive />
        </BentoCard>
        <BentoCard>
          <Stat label="Erros" value={stats.erros} negative />
        </BentoCard>
      </div>

      {/* Distribuição */}
      <BentoCard className="md:p-7">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-4">Distribuição por desempenho</h2>
        <div className="space-y-3">
          {NOTA_LABEL.map((l, i) => {
            const max = Math.max(...stats.dist, 1);
            const pct = (stats.dist[i] / max) * 100;
            return (
              <div key={i} className="flex items-center gap-3">
                <span className="text-sm w-36 text-muted-foreground">{i} — {l}</span>
                <div className="flex-1 h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, delay: i * 0.05 }}
                    className={cn("h-full rounded-full", NOTA_COLOR[i])}
                  />
                </div>
                <span className="text-sm w-10 text-right tabular-nums font-medium">{stats.dist[i]}</span>
              </div>
            );
          })}
        </div>
      </BentoCard>

      {/* Ranking de Especialidades */}
      <Suspense fallback={<div className="h-64 w-full animate-pulse bg-muted rounded-3xl" />}>
        <EspecialidadesRanking stats={especialidadeStats} />
      </Suspense>

      {/* Insight Surpresa */}
      <Suspense fallback={<div className="h-32 w-full animate-pulse bg-muted rounded-3xl" />}>
        <InsightSurpresa stats={stats} />
      </Suspense>


      {/* Revisão inteligente */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Revisão inteligente</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 auto-rows-fr">
          <ContainerRevisaoExpandivel
            tipo="retrogrado"
            label="Estudo Retrógrado"
            icon={Rewind}
            colorClass="text-accent"
            featured
            description="Só OQs que você já fez. Repetição espaçada inteligente: quanto mais dicas pediu ou errou, mais rápido o OQ volta."
          />
          <ContainerRevisaoExpandivel tipo="criticos" label="Críticos" icon={Flame} colorClass="text-destructive" locked={lockFocado} />
          <ContainerRevisaoExpandivel tipo="dificeis" label="Difíceis" icon={Activity} colorClass="text-warning" locked={lockFocado} />
          <ContainerRevisaoExpandivel tipo="novos" label="Novos" icon={Sparkles} colorClass="text-accent" locked={lockFocado} />
          <ContainerRevisaoExpandivel tipo="esquecidos" label="Esquecidos" icon={Clock} colorClass="text-muted-foreground" locked={lockFocado} />
          <ContainerRevisaoExpandivel tipo="favoritos" label="Favoritos" icon={Heart} colorClass="text-accent" />
        </div>
      </section>
      
      {/* OQs do tema */}
      {aulasCriticas.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground font-black">OQs do tema</h2>
              <p className="text-xs text-muted-foreground/60 mt-1">OQs críticos vinculados aos temas que você já estudou.</p>
            </div>
            {lockFocado && (
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 rounded-full">
                <Crown className="h-3 w-3" /> Exclusivo Ouro
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {aulasCriticas.map((aula) => (
              <Link
                key={aula.id}
                to={lockFocado ? "/meu-plano" : `/estudo?tipo=aula&aula_id=${aula.id}`}
                className={cn(
                  "paper-card p-4 flex items-center gap-4 group hover:border-destructive/30 transition-all",
                  lockFocado && "opacity-75"
                )}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive group-hover:bg-destructive group-hover:text-white transition-colors">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  {aula.erros > 0 && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-white text-[10px] font-black flex items-center justify-center border-2 border-background">
                      {aula.erros}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 mb-0.5">
                    {ESPECIALIDADE_LABEL[aula.especialidade] || "Geral"}
                  </p>
                  <p className="text-sm font-bold truncate group-hover:text-destructive transition-colors">{aula.nome}</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <AlertTriangle className="h-3 w-3 text-destructive" />
                    <span className="text-[10px] font-bold text-destructive uppercase tracking-tighter">OQs Críticos</span>
                  </div>
                </div>
                <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-destructive transition-all group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Direcionamentos estratégicos para materiais */}
      <Suspense fallback={<div className="h-48 w-full animate-pulse bg-muted rounded-3xl" />}>
        <RecomendacoesMateriais stats={especialidadeStats} locked={!canUse("materiais")} />
      </Suspense>


      {/* Últimos */}
      <BentoCard>
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Últimos OQs</h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Você ainda não estudou hoje.</p>
        ) : (
          <ul className="divide-y divide-border/50">
            {historico.map((h: any) => (
              <li key={h.id} className="py-3 flex items-start gap-3 text-sm">
                <span className={cn(
                  "px-2 py-0.5 rounded-full text-[11px] font-semibold",
                  h.ultima_nota === 4 ? "bg-[hsl(var(--destructive))/0.15] text-[hsl(var(--destructive))]" : "bg-[hsl(var(--success))/0.15] text-[hsl(var(--success))]"
                )}>
                  {h.ultima_nota}
                </span>
                <span className="flex-1 line-clamp-1">{h.cards?.comando}</span>
                <span className="text-muted-foreground text-xs">{new Date(h.timestamp_ultima).toLocaleString("pt-BR", { day:"2-digit", month:"2-digit", hour:"2-digit", minute:"2-digit" })}</span>
              </li>
            ))}
          </ul>
        )}
      </BentoCard>
      {/* Aviso de Retenção */}
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3 max-w-4xl mx-auto mt-12">
        <Info className="h-5 w-5 text-blue-600 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Políticas de Retenção de Dados e Desempenho</p>
          <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
            O seu algoritmo de repetição espaçada e a ordem personalizada das questões dependem exclusivamente dos seus dados históricos. A inadimplência por mais de 60 dias acarreta a exclusão definitiva dessas estatísticas, resultando na perda do seu comportamento individualizado de estudo e dos materiais gerados por IA. Avisos de pré-exclusão são enviados aos 45 dias.
          </p>
        </div>
      </div>
    </div>
  );
}

// Stat component extracted to UI or kept local as it is very light
function Stat({ label, value, accent, positive, negative }: { label: string; value: any; accent?: boolean; positive?: boolean; negative?: boolean }) {

  return (
    <div className="flex flex-col h-full justify-between">
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-semibold">{label}</span>
      <span className={cn(
        "text-4xl md:text-5xl font-bold tabular-nums tracking-tight",
        accent && "text-[hsl(var(--accent))]",
        positive && "text-[hsl(var(--success))]",
        negative && "text-[hsl(var(--destructive))]",
      )}>{value}</span>
    </div>
  );
}

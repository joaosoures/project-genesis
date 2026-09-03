import { useEffect, useState, useCallback, useRef, lazy, Suspense } from "react";
import { processSyncQueue } from "@/lib/sync";

import { useSettings } from "@/contexts/SettingsContext";
import { createPortal } from "react-dom";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { CardRow, Especialidade, calcularNota, ESPECIALIDADE_LABEL, MODO_LABEL } from "@/lib/oq";
import { buscarPool, registrarDesempenho, QueueFilter, getDailyProgress } from "@/lib/queue";
import { supabase } from "@/integrations/supabase/client";
import { ModoHandle } from "@/types/modo";

const ModoABCDE = lazy(() => import("@/components/oq/ModoABCDE"));
const ModoLacuna = lazy(() => import("@/components/oq/ModoLacuna"));
const ModoOQFalta = lazy(() => import("@/components/oq/ModoOQFalta"));

import { FavoritoBtn, ReportBtn } from "@/components/oq/CardActions";
import { AdminEditCardBtn } from "@/components/oq/AdminEditCardBtn";
import ScrollWheel from "@/components/console/ScrollWheel";
import NeonHintLamp from "@/components/console/NeonHintLamp";
import TactileButton from "@/components/console/TactileButton";
import NeonProgressBar from "@/components/console/NeonProgressBar";
import Starburst from "@/components/console/Starburst";
import { ensureAudio } from "@/lib/sensory";
import { ChevronRight, CheckCircle2, User, Menu, Undo2, Loader2 } from "lucide-react";

import logo from "@/assets/oqmed-logo.png";
import coffeeBreak from "@/assets/coffee-break.png";
import { cn } from "@/lib/utils";

export default function Estudo() {
  const { user, isAdmin } = useAuth();
  const settings = useSettings();
  const { reduceMotion } = settings;
  const [params] = useSearchParams();
  const [pool, setPool] = useState<CardRow[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [favSet, setFavSet] = useState<Set<string>>(new Set());
  
  // Progress tracking
  const [progressoDiario, setProgressoDiario] = useState(0);
  const [lastGoalShown, setLastGoalShown] = useState(() => {
    if (typeof window === "undefined") return 0;
    const val = localStorage.getItem("oqmed.last_goal_shown");
    return val ? parseInt(val) : 0;
  });

  const [refreshing, setRefreshing] = useState(false);
  const [showStar, setShowStar] = useState(false);
  const [showCoffeeBreak, setShowCoffeeBreak] = useState(false);
  const [modoState, setModoState] = useState<{ hintsUsed: number; canConfirm: boolean; finalized: boolean; canSkip?: boolean; showDontKnow?: boolean }>({ 
    hintsUsed: 0, canConfirm: false, finalized: false, canSkip: false, showDontKnow: false 
  });
  const [slotEl, setSlotEl] = useState<HTMLDivElement | null>(null);

  const modoRef = useRef<ModoHandle>(null);
  const cardScrollRef = useRef<HTMLDivElement>(null);

  const filtro: QueueFilter = (() => {
    const esp = params.get("esp") as Especialidade | null;
    const tipo = params.get("tipo");
    const aulaId = params.get("aula_id");
    const baralho = params.get("baralho");

    if (baralho) return { tipo: "baralho", baralho };
    if (tipo === "favoritos") return { tipo: "favoritos", especialidade: esp || undefined };
    if (tipo === "criticos") return { tipo: "criticos", especialidade: esp || undefined };
    if (tipo === "dificeis") return { tipo: "dificeis", especialidade: esp || undefined };
    if (tipo === "novos") return { tipo: "novos", especialidade: esp || undefined };
    if (tipo === "esquecidos") return { tipo: "esquecidos", especialidade: esp || undefined };
    if (tipo === "retrogrado") return { tipo: "retrogrado", especialidade: esp || undefined };
    if (tipo === "aula" && aulaId) return { tipo: "aula", aulaId };
    if (esp) return { tipo: "especialidade", especialidade: esp };
    return { tipo: "todas" };
  })();

  const carregar = useCallback(async (isBackground = false) => {
    if (!user) return;
    if (!isBackground) setLoading(true);
    else setRefreshing(true);

    const p = await buscarPool(user.id, filtro);
    
    // Always refresh daily progress from DB to keep count accurate
    const progresso = await getDailyProgress(user.id);
    setProgressoDiario(progresso);

    if (isBackground) {
      setPool(prev => {
        const seenIds = new Set(prev.slice(0, idx + 1).map(c => c.id));
        const filteredNext = p.filter(c => !seenIds.has(c.id));
        return [...prev.slice(0, idx + 1), ...filteredNext];
      });
      setRefreshing(false);
    } else {
      setPool(p);
      setIdx(0);
      const { data: favs } = await supabase.from("favoritos").select("card_id").eq("usuario_id", user.id);
      setFavSet(new Set((favs ?? []).map((f: any) => f.card_id)));
      setTimeout(() => setLoading(false), 600);
    }
  }, [user, filtro, idx]);

  useEffect(() => { 
    carregar(false); 
    document.title = "Estudar — Code Splitting"; 
    processSyncQueue();
  }, [user, params.toString()]);

  const card = pool[idx];

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Enter") {
        // Se estiver em um modal ou coffee break, ignore
        if (showCoffeeBreak) return;
        
        // Se já finalizou (vendo explicação), Enter passa para o próximo
        if (modoState.finalized) {
          proximo();
        } 
        // Se não finalizou e é modo ABCDE (não tem input nativo no Enter), confirma a seleção
        else if (card?.modo === "abcde" && modoState.canConfirm) {
          modoRef.current?.confirm();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modoState.finalized, modoState.canConfirm, card?.modo, showCoffeeBreak]);

  useEffect(() => {
    setModoState({ hintsUsed: 0, canConfirm: false, finalized: false, canSkip: false, showDontKnow: false });
  }, [idx]);

  async function onFinalizar(r: { acertou: boolean; nivelPista: number; tentativas: number }) {
    if (!user || !card) return;
    const nota = calcularNota(r);
    
    // Optimistic progress update
    setProgressoDiario(prev => prev + 1);

    await registrarDesempenho({
      userId: user.id, cardId: card.id,
      acertou: r.acertou, nivelPista: r.nivelPista, nota,
      pesoImportancia: card.peso_importancia,
    });
    
    if (r.acertou) { setShowStar(true); setTimeout(() => setShowStar(false), 1100); }
    // Nota: não recarregamos a fila aqui para não trocar o card que o aluno está vendo.
    // A fila só é atualizada quando o aluno termina os OQs da sessão (coffee break).
  }

  function proximo() {
    if (idx + 1 >= pool.length) {
      // Fim da sessão (ex.: 20 OQs) → pausa para o café antes de recarregar a fila
      setShowCoffeeBreak(true);
      return;
    }
    setIdx(idx + 1);
  }

  async function continuarAposCafe() {
    if (!user) return;
    setShowCoffeeBreak(false);
    setRefreshing(true);
    const p = await buscarPool(user.id, filtro);
    const progresso = await getDailyProgress(user.id);
    setProgressoDiario(progresso);
    setPool(p);
    setIdx(0);
    const { data: favs } = await supabase.from("favoritos").select("card_id").eq("usuario_id", user.id);
    setFavSet(new Set((favs ?? []).map((f: any) => f.card_id)));
    setRefreshing(false);
  }

  const onWheelTick = useCallback((dir: 1 | -1) => {
    const STEP = 100;
    const el = cardScrollRef.current;
    if (el) {
      el.scrollBy({ top: dir * STEP, behavior: "smooth" });
    }
  }, []);

  if (pool.length === 0 && !loading) {
    return (
      <div className="grid place-items-center h-[60vh] text-center px-6">
        <div className="space-y-4 max-w-md">
          <h2 className="text-2xl font-semibold">Nenhum OQ por aqui</h2>
          <p className="text-muted-foreground">Tente outro filtro ou crie OQs em "Gerar OQs".</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-screen flex flex-col overflow-hidden fixed inset-0 overscroll-none touch-none bg-background">
      <AnimatePresence>
        {loading && (
          <motion.div 
            key="doors-loader"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, delay: 0.8 }}
            className="fixed inset-0 z-[150] flex items-center justify-center overflow-hidden"
          >
            {/* Porta Esquerda (O) */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
              className="absolute left-0 top-0 w-1/2 h-full bg-[hsl(var(--background))] border-r border-[hsl(var(--accent)/0.1)] flex items-center justify-end overflow-hidden"
            >
              <div className="relative h-full w-[200%] flex items-center justify-center pointer-events-none translate-x-1/2">
                <img 
                  src={logo} 
                  alt="" 
                  className="h-[50vh] w-auto max-w-none object-contain dark:invert dark:brightness-[1.2]"
                  style={{ clipPath: 'inset(0 50% 0 0)' }}
                />
              </div>
            </motion.div>

            {/* Porta Direita (Q) */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.8, ease: [0.77, 0, 0.175, 1] }}
              className="absolute right-0 top-0 w-1/2 h-full bg-[hsl(var(--background))] border-l border-[hsl(var(--accent)/0.1)] flex items-center justify-start overflow-hidden"
            >
              <div className="relative h-full w-[200%] flex items-center justify-center pointer-events-none -translate-x-1/2">
                <img 
                  src={logo} 
                  alt="" 
                  className="h-[50vh] w-auto max-w-none object-contain dark:invert dark:brightness-[1.2]"
                  style={{ clipPath: 'inset(0 0 0 50%)' }}
                />
              </div>
            </motion.div>

            {/* Mensagem Centralizada (Posicionada mais abaixo) */}
            <motion.div
              initial={!reduceMotion ? { opacity: 0, y: 20 } : { opacity: 0 }}
              animate={!reduceMotion ? { opacity: 1, y: 0 } : { opacity: 1 }}
              exit={!reduceMotion ? { opacity: 0, y: 20 } : { opacity: 0 }}
              transition={!reduceMotion ? { delay: 0.3, duration: 0.4 } : { duration: 0.2 }}
              className="z-[160] absolute bottom-[15vh] left-1/2 -translate-x-1/2 text-center"
            >
              <motion.div
                animate={!reduceMotion ? { opacity: [0.4, 1, 0.4] } : { opacity: 1 }}
                transition={!reduceMotion ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : { duration: 0 }}
                className="text-sm font-medium uppercase tracking-[0.5em] text-[hsl(var(--accent))] neon-text drop-shadow-[0_0_15px_hsl(var(--accent)/0.5)]"
              >
                Carregando OQs…
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div 
        onPointerDown={() => ensureAudio()} 
        className={cn(
          "relative flex-1 w-full max-w-3xl mx-auto px-4 pt-10 pb-6 md:pb-8 flex flex-col overflow-hidden overscroll-none touch-none",
          loading ? "opacity-0 scale-95 blur-xl" : "opacity-100 scale-100 blur-0"
        )}
      >
        {!loading && card && (
          <>
            <div className="flex-1 flex flex-col overflow-hidden relative">

            {/* Header section (Progress bar and metadata) */}
            <div className="shrink-0 pt-2 mb-4 px-12 md:px-0">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground tabular-nums">
                  {String(idx + 1).padStart(2, "0")}/{String(pool.length).padStart(2, "0")}
                </span>
                <NeonProgressBar value={idx + 1} total={pool.length} className="flex-1" />
              </div>

              <div className="flex items-center justify-between text-xs">
                <span className="px-3 py-1 rounded-full bg-white border border-border text-[hsl(var(--primary))] font-medium">
                  {ESPECIALIDADE_LABEL[card.especialidade]}
                </span>
                <span className="px-3 py-1 rounded-full bg-[hsl(var(--primary))] text-white font-medium">
                  {MODO_LABEL[card.modo]}
                </span>
              </div>
            </div>

            {/* Central Card section (Scrollable) */}
            <AnimatePresence mode="wait">
              <motion.div
                key={card.id}
                layoutId={`card-${card.id}`}
                initial={{ opacity: 0, y: 24, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -24, scale: 0.98 }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                className={cn(
                  "paper-card flex-1 flex flex-col overflow-hidden",
                  card.modo === "abcde" ? "min-h-[440px]" : "min-h-[340px]",
                  "mb-4"
                )}
              >
                <div 
                  ref={cardScrollRef} 
                  className="flex-1 overflow-y-auto px-6 md:px-9 pt-8 pb-6 md:pb-9 scroll-smooth minimal-scroll overscroll-contain touch-pan-y"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                      {card.verificado ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shadow-sm">
                          <CheckCircle2 className="h-3 w-3" />
                          BEEmed Education
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shadow-sm">
                          <User className="h-3 w-3" />
                          Feito por mim
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {isAdmin && idx > 0 && (
                        <button
                          onClick={() => setIdx(idx - 1)}
                          title="OQ Anterior (admin)"
                          className="h-10 w-10 rounded-full grid place-items-center hover:bg-[hsl(var(--muted))] transition group"
                        >
                          <Undo2 className="h-4 w-4 text-[hsl(var(--primary))] group-hover:scale-110 transition" />
                        </button>
                      )}
                      <FavoritoBtn
                        cardId={card.id}
                        isFav={favSet.has(card.id)}
                        onToggle={(b) => {
                          const next = new Set(favSet);
                          b ? next.add(card.id) : next.delete(card.id);
                          setFavSet(next);
                        }}
                      />
                      <ReportBtn cardId={card.id} />
                      <AdminEditCardBtn 
                        cardId={card.id} 
                        onSaved={(updatedCard) => {
                          // Refresh pool with updated card data
                          setPool(prev => prev.map(c => c.id === card.id ? { ...c, ...updatedCard } : c));
                        }}
                      />


                    </div>
                  </div>
                  <Suspense fallback={<div className="flex flex-col items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-accent" /><p className="text-sm text-muted-foreground mt-4">Preparando OQ...</p></div>}>
                    {card.modo === "abcde" && (
                      <ModoABCDE ref={modoRef} card={card} onFinalizar={onFinalizar} onState={(s) => setModoState({ ...s, canSkip: !!s.canSkip })} />
                    )}
                    {card.modo === "lacuna" && (
                      <ModoLacuna
                        ref={modoRef}
                        card={card}
                        onFinalizar={onFinalizar}
                        onState={(s) => setModoState({ ...s, canSkip: !!s.canSkip })}
                        renderInput={({ value, setValue, onEnter, shake, disabled, placeholder }) =>
                          slotEl
                            ? createPortal(
                                <input
                                  autoFocus
                                  maxLength={300}
                                  value={value}
                                  disabled={disabled}
                                  onChange={(e) => setValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }}
                                  placeholder={placeholder}
                                  className={`tactile-input ${shake ? "animate-shake" : ""}`}
                                />,
                                slotEl,
                              )
                            : null
                        }
                      />
                    )}
                    {card.modo === "oq_falta" && (
                      <ModoOQFalta
                        ref={modoRef}
                        card={card}
                        onFinalizar={onFinalizar}
                        onState={(s) => setModoState({ ...s, canSkip: !!s.canSkip })}
                        renderInput={({ value, setValue, onEnter, shake, disabled, placeholder }) =>
                          slotEl
                            ? createPortal(
                                <input
                                  autoFocus
                                  maxLength={300}
                                  value={value}
                                  disabled={disabled}
                                  onChange={(e) => setValue(e.target.value)}
                                  onKeyDown={(e) => { if (e.key === "Enter") onEnter(); }}
                                  placeholder={placeholder}
                                  className={`tactile-input ${shake ? "animate-shake" : ""}`}
                                />,
                                slotEl,
                              )
                            : null
                        }
                      />
                    )}
                  </Suspense>

                </div>
              </motion.div>
            </AnimatePresence>

            {progressoDiario > 0 && progressoDiario % settings.dailyGoal === 0 && progressoDiario !== lastGoalShown && modoState.finalized && (
              <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-background/40 backdrop-blur-sm animate-in fade-in duration-500">
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  className="paper-card w-full max-w-sm text-center p-8 shadow-2xl border-2 border-[hsl(var(--accent)/0.3)] relative overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent opacity-50" />
                  
                  <div className="relative z-10">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-[hsl(var(--accent)/0.1)] mb-6 animate-bounce">
                      <span className="text-4xl">🎯</span>
                    </div>
                    
                    <h2 className="font-display text-3xl font-black text-[hsl(var(--foreground))] mb-2 tracking-tight">
                      Parabéns!
                    </h2>
                    
                    <p className="text-muted-foreground mb-8 text-lg font-medium">
                      Você cumpriu mais <span className="text-[hsl(var(--accent))] font-black">{settings.dailyGoal}</span> OQs!
                    </p>

                    <TactileButton 
                      variant="primary" 
                      size="lg" 
                      onClick={() => {
                        const nextGoal = progressoDiario;
                        setLastGoalShown(nextGoal);
                        localStorage.setItem("oqmed.last_goal_shown", nextGoal.toString());
                        proximo();
                      }} 
                      className="w-full"
                    >
                      Continuar Estudando
                    </TactileButton>
                  </div>

                  <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[hsl(var(--accent)/0.1)] rounded-full blur-3xl" />
                  <div className="absolute -top-20 -left-20 w-40 h-40 bg-[hsl(var(--accent)/0.1)] rounded-full blur-3xl" />
                </motion.div>
              </div>
            )}

            <AnimatePresence>
              {showCoffeeBreak && (
                reduceMotion ? (
                  <div className="absolute inset-0 z-[80] flex items-center justify-center p-4 bg-background/70 backdrop-blur-md">
                    <div className="paper-card w-full max-w-sm text-center p-8 shadow-2xl border-2 border-[hsl(var(--accent)/0.3)] relative overflow-hidden">
                      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent opacity-60" />
                      <div className="relative mx-auto w-48 h-48 mb-4">
                        <img
                          src={coffeeBreak}
                          alt="Pausa para o café"
                          className="relative z-10 w-full h-full object-contain"
                        />
                      </div>
                      <h2 className="font-display text-2xl md:text-3xl font-black text-[hsl(var(--foreground))] mb-2 tracking-tight">
                        Uma pausa para o café
                      </h2>
                      <p className="text-muted-foreground mb-6 text-sm md:text-base">
                        Você completou esta rodada de OQs. Respire fundo e siga em frente quando estiver pronto.
                      </p>
                      <TactileButton
                        variant="primary"
                        size="lg"
                        onClick={continuarAposCafe}
                        className="w-full"
                      >
                        Continuar
                      </TactileButton>
                    </div>
                  </div>
                ) : (
                  <motion.div
                    key="coffee-break"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 z-[80] flex items-center justify-center p-4 bg-background/70 backdrop-blur-md"
                  >
                  <motion.div
                    initial={{ scale: 0.85, y: 30, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: "spring", damping: 18, stiffness: 180 }}
                    className="paper-card w-full max-w-sm text-center p-8 shadow-2xl border-2 border-[hsl(var(--accent)/0.3)] relative overflow-hidden"
                  >
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[hsl(var(--accent))] to-transparent opacity-60" />

                    {/* Vapor subindo da xícara */}
                    <div className="relative mx-auto w-48 h-48 mb-4">
                      {!reduceMotion && [0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="absolute left-1/2 top-2 w-2 h-10 rounded-full bg-[hsl(var(--foreground)/0.18)] blur-md"
                          style={{ x: (i - 1) * 14 }}
                          animate={{
                            y: [-4, -28, -52],
                            opacity: [0, 0.6, 0],
                            scaleX: [0.8, 1.4, 2],
                          }}
                          transition={{
                            duration: 2.8,
                            repeat: Infinity,
                            delay: i * 0.5,
                            ease: "easeOut",
                          }}
                        />
                      ))}
                      <motion.img
                        src={coffeeBreak}
                        alt="Pausa para o café"
                        initial={{ rotate: -6, scale: 0.9 }}
                        animate={!reduceMotion ? { rotate: [-3, 3, -3], scale: 1 } : { rotate: 0, scale: 1 }}
                        transition={!reduceMotion ? { rotate: { duration: 4, repeat: Infinity, ease: "easeInOut" }, scale: { duration: 0.6 } } : { duration: 0 }}
                        className="relative z-10 w-full h-full object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.25)]"
                      />
                    </div>

                    <h2 className="font-display text-2xl md:text-3xl font-black text-[hsl(var(--foreground))] mb-2 tracking-tight">
                      Uma pausa para o café
                    </h2>
                    <p className="text-muted-foreground mb-6 text-sm md:text-base">
                      Você completou esta rodada de OQs. Respire fundo e siga em frente quando estiver pronto.
                    </p>

                    <TactileButton
                      variant="primary"
                      size="lg"
                      onClick={continuarAposCafe}
                      className="w-full"
                    >
                      Continuar
                    </TactileButton>

                    <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[hsl(var(--accent)/0.15)] rounded-full blur-3xl" />
                    <div className="absolute -top-20 -left-20 w-40 h-40 bg-[hsl(var(--accent)/0.15)] rounded-full blur-3xl" />
                  </motion.div>
                </motion.div>
                )
              )}
            </AnimatePresence>

            <Starburst show={showStar} />
          </div>

          <div className="shrink-0 z-40 pb-4 md:pb-6">
            <div className="bg-background/80 backdrop-blur border border-border/50 rounded-[28px] p-4 md:p-6 space-y-3 shadow-sm">

              {(card.modo === "lacuna" || card.modo === "oq_falta") && !modoState.finalized && (
                <div className="console-well px-4 py-3 flex items-center gap-3">
                  <span className={cn("h-2 w-2 rounded-full bg-[hsl(var(--accent))] shrink-0", !reduceMotion && "shadow-[0_0_10px_hsl(var(--accent)/0.8)]")} />
                  <div ref={setSlotEl} className="flex-1 min-w-0" />
                </div>
              )}

              <div className="flex items-center justify-between gap-3 md:gap-5">
                {settings.consoleLayout.map((type, index) => {
                  const alignment = index === 0 ? "justify-start" : index === 1 ? "justify-center" : "justify-end";
                  
                  if (type === "scroll" && !settings.useNativeScroll) {
                    return (
                      <div key="scroll" className={cn("flex-1 flex items-center", alignment)}>
                        <ScrollWheel 
                          color="blue" 
                          onTick={onWheelTick} 
                          size={90} 
                          variant={settings.scrollStyle} 
                          scrollContainerRef={cardScrollRef} 
                        />
                      </div>
                    );
                  }
                  if (type === "hint") {
                    return (
                      <div key="hint" className={cn("flex-1 flex items-center", alignment)}>
                        <NeonHintLamp
                          used={modoState.hintsUsed}
                          onClick={() => modoRef.current?.hint()}
                          disabled={modoState.finalized}
                          variant={settings.hintStyle}
                        />
                      </div>
                    );
                  }
                  if (type === "confirm") {
                    const isDontKnow = modoState.showDontKnow && !modoState.finalized;
                    return (
                      <div key="confirm" className={cn("flex-1 flex items-center", alignment)}>
                        <div className="relative">
                          <TactileButton
                            variant={modoState.finalized ? "primary" : (isDontKnow ? "danger" : "primary")}
                            size="xl"
                            disabled={!modoState.canConfirm && !modoState.showDontKnow && !modoState.finalized}
                            onClick={() => {
                              if (modoState.finalized) {
                                proximo();
                              } else if (isDontKnow) {
                                modoRef.current?.skip?.();
                              } else if (modoState.canConfirm) {
                                modoRef.current?.confirm();
                              }
                            }}
                            className={cn(
                              "min-w-[120px] md:min-w-[160px] transition-all duration-300 whitespace-nowrap",
                              modoState.finalized && "bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                            )}
                          >
                            {modoState.finalized ? (
                              <div className="flex items-center gap-2">
                                <span className="hidden md:inline">Próximo</span>
                                <ChevronRight className="w-5 h-5" />
                              </div>
                            ) : (
                              isDontKnow ? "Não sei" : "Confirmar"
                            )}
                          </TactileButton>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

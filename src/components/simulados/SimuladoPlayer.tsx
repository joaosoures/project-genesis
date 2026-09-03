import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, ChevronLeft, ChevronRight, CheckCircle2, 
  XCircle, BarChart3, ChevronDown, ChevronUp, Info, Eye, LogOut, ArrowLeft, Settings
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import NeonProgressBar from "@/components/console/NeonProgressBar";
import TactileButton from "@/components/console/TactileButton";
import NeonHintLamp from "@/components/console/NeonHintLamp";
import EditQuestionDialog from "./EditQuestionDialog";

interface Question {
  id: string;
  comando: string;
  opcao_a: string;
  opcao_b: string;
  opcao_c: string;
  opcao_d: string;
  opcao_e: string;
  gabarito: string;
  explicacao_1: string;
  explicacao_2: string;
  explicacao_3: string;
  image_url?: string;
}

export default function SimuladoPlayer({ 
  simuladoId, 
  onClose,
  initialReportMode = false
}: { 
  simuladoId: string; 
  onClose: () => void;
  initialReportMode?: boolean;
}) {
  const { user, isAdmin } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [hintsUsed, setHintsUsed] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reportMode, setReportMode] = useState(initialReportMode);
  const [finished, setFinished] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [result, setResult] = useState<{
    tentativaId?: string;
    acertos: number;
    total: number;
    respostas: any[];
  } | null>(null);

  useEffect(() => {
    fetchQuestions();
    if (initialReportMode) {
      fetchLatestAttempt();
    }
  }, [simuladoId, initialReportMode]);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from("simulado_questoes")
        .select("*")
        .eq("simulado_id", simuladoId)
        .order("ordem", { ascending: true });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar questões do simulado.");
    } finally {
      if (!initialReportMode) setLoading(false);
    }
  };

  const fetchLatestAttempt = async () => {
    if (!user) return;
    try {
      const { data: tentativa, error: tErr } = await supabase
        .from("simulado_tentativas")
        .select("*")
        .eq("simulado_id", simuladoId)
        .eq("usuario_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (tErr) throw tErr;
      if (!tentativa) {
        setLoading(false);
        return;
      }

      const { data: resp, error: rErr } = await supabase
        .from("simulado_respostas_aluno")
        .select("*")
        .eq("tentativa_id", tentativa.id);

      if (rErr) throw rErr;

      const formattedRespostas = resp?.map(r => ({
        questao_id: r.questao_id,
        resposta_marcada: r.resposta_marcada,
        acertou: r.acertou,
        respondida: true
      })) || [];

      setResult({
        tentativaId: tentativa.id,
        acertos: tentativa.acertos,
        total: tentativa.total_questoes,
        respostas: formattedRespostas
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build report data progressively
  const currentReportData = useMemo(() => {
    let acertos = 0;
    const results = questions.map(q => {
      const resp = answers[q.id];
      const acertou = resp === q.gabarito;
      if (resp && acertou) acertos++;
      return { 
        questao_id: q.id, 
        resposta_marcada: resp, 
        acertou,
        respondida: !!resp
      };
    });

    return {
      acertos,
      total: questions.length,
      respostas: results
    };
  }, [questions, answers]);

  const handleFinish = async () => {
    if (!user) return;
    if (submitting) return;
    
    setSubmitting(true);
    try {
      const report = currentReportData;

      // Save attempt
      const { data: tentativa, error: tErr } = await supabase
        .from("simulado_tentativas")
        .insert({
          simulado_id: simuladoId,
          usuario_id: user.id,
          acertos: report.acertos,
          erros: report.total - report.acertos,
          total_questoes: report.total
        })
        .select()
        .single();

      if (tErr) throw tErr;

      // Save individual answers
      const answersToInsert = report.respostas
        .filter(r => r.respondida)
        .map(r => ({
          tentativa_id: tentativa.id,
          questao_id: r.questao_id,
          resposta_marcada: r.resposta_marcada,
          acertou: r.acertou
        }));

      if (answersToInsert.length > 0) {
        const { error: rErr } = await supabase.from("simulado_respostas_aluno").insert(answersToInsert);
        if (rErr) throw rErr;
      }

      setResult({
        tentativaId: tentativa.id,
        ...report
      });
      setFinished(true);
      setReportMode(true);
      toast.success("Simulado finalizado!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar resultado: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseHint = () => {
    const qId = questions[idx]?.id;
    if (!qId) return;
    
    const currentHints = hintsUsed[qId] || 0;
    if (currentHints < 3) {
      setHintsUsed(prev => ({ ...prev, [qId]: currentHints + 1 }));
    } else {
      toast.info("Todas as dicas já foram utilizadas para esta questão.");
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm font-bold animate-pulse uppercase tracking-[0.2em]">Sincronizando Simulado...</p>
    </div>
  );

  if (reportMode) {
    const data = finished && result ? result : currentReportData;
    const percent = data.total > 0 ? Math.round((data.acertos / data.total) * 100) : 0;
    
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto minimal-scroll animate-in fade-in duration-300">
        <div className="max-w-4xl mx-auto px-4 pt-16 pb-32 space-y-8">
          {/* Top Navigation */}
          <div className="flex items-center justify-between mb-2">
            <Button 
              variant="ghost" 
              onClick={() => (finished || initialReportMode) ? onClose() : setReportMode(false)}
              className="gap-2 font-bold text-muted-foreground hover:text-foreground rounded-xl"
            >
              <ArrowLeft className="h-4 w-4" />
              {(finished || initialReportMode) ? "Voltar aos Materiais" : "Voltar ao Simulado"}
            </Button>
            <Badge className={cn(
              "px-4 py-1.5 rounded-full font-black uppercase tracking-widest text-[10px]",
              (finished || initialReportMode) ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : "bg-amber-500/10 text-amber-600 border-amber-500/20"
            )}>
              {(finished || initialReportMode) ? "Relatório Final" : "Relatório em Tempo Real"}
            </Badge>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter">
              {finished ? "Desempenho Final" : "Seu Progresso Atual"}
            </h2>
            <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-[10px]">
              {simuladoId.substring(0, 8)} • {data.total} Questões
            </p>
          </div>

          <Card className="p-8 bg-gradient-to-br from-slate-950 to-slate-900 text-white border-none shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative overflow-hidden rounded-[2.5rem]">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-around gap-8 text-center">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-black opacity-40">Acertos</p>
                <p className="text-5xl font-black text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{data.acertos}</p>
              </div>
              
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="absolute inset-0 w-full h-full -rotate-90 drop-shadow-[0_0_10px_rgba(255,255,255,0.1)]">
                  <circle
                    cx="72" cy="72" r="64"
                    fill="none" stroke="currentColor" strokeWidth="12"
                    className="text-white/5"
                  />
                  <motion.circle
                    initial={{ strokeDasharray: "0 402" }}
                    animate={{ strokeDasharray: `${(percent / 100) * 402} 402` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    cx="72" cy="72" r="64"
                    fill="none" stroke="currentColor" strokeWidth="12"
                    strokeLinecap="round"
                    className="text-emerald-500"
                  />
                </svg>
                <div className="flex flex-col items-center justify-center">
                  <span className="text-3xl font-black">{percent}%</span>
                  <span className="text-[8px] font-black uppercase tracking-widest opacity-40">Taxa</span>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-widest font-black opacity-40">Pendentes/Erros</p>
                <p className="text-5xl font-black text-rose-400 drop-shadow-[0_0_15px_rgba(251,113,133,0.3)]">
                  {data.total - data.acertos}
                </p>
              </div>
            </div>
            
            {/* Background elements */}
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <BarChart3 className="w-48 h-48" />
            </div>
          </Card>

          <div className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
              <div className="h-6 w-1 bg-accent rounded-full" />
              Revisão das Questões
            </h3>
            
            <Accordion type="single" collapsible className="space-y-4">
              {questions.map((q, i) => {
                const res = data.respostas.find(r => r.questao_id === q.id);
                const respondida = res?.respondida;
                const acertou = res?.acertou;
                
                return (
                  <AccordionItem 
                    key={q.id} 
                    value={q.id} 
                    className={cn(
                      "border-none rounded-[2rem] overflow-hidden transition-all duration-300 shadow-sm",
                      !respondida ? "bg-slate-100/50 opacity-60" : 
                      acertou ? "bg-emerald-500/5 border border-emerald-500/10" : "bg-rose-500/5 border border-rose-500/10"
                    )}
                  >
                    <AccordionTrigger className="hover:no-underline py-5 px-6">
                      <div className="flex items-center gap-4 text-left">
                        <div className={cn(
                          "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-sm transition-colors",
                          !respondida ? "bg-slate-200 text-slate-400" :
                          acertou ? "bg-emerald-500 text-white" : "bg-rose-500 text-white"
                        )}>
                          {!respondida ? <Info className="h-5 w-5" /> : 
                           acertou ? <CheckCircle2 className="h-6 w-6" /> : <XCircle className="h-6 w-6" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 mb-1">Questão {i + 1}</p>
                          <p className="font-bold line-clamp-1 text-sm md:text-base leading-tight">
                            {q.comando}
                          </p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-8 pt-2 px-6 md:px-10 space-y-8 animate-in fade-in slide-in-from-top-4 duration-300">
                      <div className="space-y-3">
                        {['a', 'b', 'c', 'd', 'e'].map((l) => {
                          const letter = l.toUpperCase();
                          const text = (q as any)[`opcao_${l}`];
                          if (!text) return null;
                          
                          const isCorrect = letter === q.gabarito;
                          const isSelected = letter === res?.resposta_marcada;

                          return (
                            <div 
                              key={l}
                              className={cn(
                                "p-5 rounded-2xl border-2 text-sm font-semibold transition-all flex items-start gap-4",
                                isCorrect ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-900" : 
                                isSelected ? "bg-rose-500/10 border-rose-500/30 text-rose-900" : 
                                "bg-white border-slate-100 text-slate-500"
                              )}
                            >
                              <span className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs shrink-0",
                                isCorrect ? "bg-emerald-500 text-white" : isSelected ? "bg-rose-500 text-white" : "bg-slate-100"
                              )}>{letter}</span>
                              <span className="flex-1 mt-0.5">{text}</span>
                              {isCorrect && <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />}
                              {!isCorrect && isSelected && <XCircle className="h-5 w-5 shrink-0 text-rose-500" />}
                            </div>
                          );
                        })}
                      </div>

                      <div className="grid gap-4 pt-4">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground px-1">Gabarito Comentado</h4>
                        {q.explicacao_1 && (
                          <div className="p-5 bg-blue-500/5 border-l-4 border-blue-500 rounded-r-2xl">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-600 mb-2">Fundamentação I</p>
                            <p className="text-sm font-medium leading-relaxed text-slate-700">{q.explicacao_1}</p>
                          </div>
                        )}
                        {q.explicacao_2 && (
                          <div className="p-5 bg-indigo-500/5 border-l-4 border-indigo-500 rounded-r-2xl">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-600 mb-2">Fundamentação II</p>
                            <p className="text-sm font-medium leading-relaxed text-slate-700">{q.explicacao_2}</p>
                          </div>
                        )}
                        {q.explicacao_3 && (
                          <div className="p-5 bg-violet-500/5 border-l-4 border-violet-500 rounded-r-2xl">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-violet-600 mb-2">Conclusão Estratégica</p>
                            <p className="text-sm font-medium leading-relaxed text-slate-700">{q.explicacao_3}</p>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          </div>

          {/* Centered Sair Button at bottom */}
          <div className="flex flex-col items-center gap-4 pt-12">
            <Button 
              onClick={onClose}
              className="h-16 px-16 rounded-[2rem] font-black text-lg bg-slate-900 text-white hover:bg-slate-800 shadow-2xl transition-all hover:scale-105 gap-3"
            >
              <LogOut className="h-5 w-5" />
              Sair do Relatório
            </Button>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">OQ MED • Simulados de Alta Performance</p>
          </div>
        </div>
      </div>
    );
  }

  const currentQ = questions[idx];
  const total = questions.length;
  const currentHintsCount = hintsUsed[currentQ?.id] || 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col animate-in fade-in duration-500 h-[100dvh] overflow-hidden overscroll-none touch-none pt-[env(safe-area-inset-top,3.5rem)] md:pt-6">
      {/* Header Player */}
      <div className="shrink-0 p-4 md:p-6 pb-2 flex flex-col gap-4 max-w-4xl mx-auto w-full mt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge className="bg-accent text-accent-foreground font-black text-[10px] tracking-widest px-3 py-1 rounded-full border-none shadow-sm">
              SIMULADO
            </Badge>
            <span className="text-xs font-mono font-bold text-muted-foreground opacity-60">
              {String(idx + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            {isAdmin && (
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setIsEditing(true)}
                className="rounded-xl h-10 w-10 border-none shadow-neu-out-sm hover:shadow-neu-in transition-all bg-background text-muted-foreground hover:text-amber-500"
                title="Editar Questão (Admin)"
              >
                <Settings className="h-5 w-5" />
              </Button>
            )}
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setReportMode(true)}
              className="rounded-xl h-10 w-10 border-none shadow-neu-out-sm hover:shadow-neu-in transition-all bg-background text-muted-foreground hover:text-accent"
              title="Ver Relatório Parcial"
            >
              <Eye className="h-5 w-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onClose} 
              className="text-muted-foreground font-bold text-xs uppercase tracking-widest hover:text-rose-500 rounded-xl px-4"
            >
              Sair
            </Button>
          </div>
        </div>
        
        <NeonProgressBar value={idx + 1} total={total} className="h-2.5" />
      </div>

      {/* Main Study Area */}
      <div className="flex-1 overflow-hidden flex flex-col w-full max-w-4xl mx-auto px-4 pb-4">
        <Card className="flex-1 paper-card flex flex-col overflow-hidden border-none shadow-[0_20px_60px_rgba(0,0,0,0.15)] rounded-[2.5rem] relative">
          <div className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-14 space-y-10 minimal-scroll overscroll-contain touch-pan-y">
            <div className="space-y-6">
              <h2 className="text-2xl md:text-3xl font-black leading-[1.15] tracking-tight text-slate-900">
                {currentQ?.comando}
              </h2>
              {currentQ?.image_url && (
                <div className="w-full rounded-2xl overflow-hidden shadow-lg border-4 border-white ring-1 ring-slate-100 animate-in fade-in zoom-in-95 duration-500">
                  <img src={currentQ.image_url} alt="Referência da questão" className="w-full h-auto object-contain bg-slate-50" />
                </div>
              )}
            </div>

            <div className="space-y-4">
              {['a', 'b', 'c', 'd', 'e'].map((l) => {
                const letter = l.toUpperCase();
                const text = (currentQ as any)[`opcao_${l}`];
                if (!text) return null;
                
                const isSelected = answers[currentQ.id] === letter;

                return (
                  <button
                    key={l}
                    onClick={() => setAnswers(prev => ({ ...prev, [currentQ.id]: letter }))}
                    className={cn(
                      "w-full p-6 md:p-7 rounded-[1.75rem] text-left transition-all duration-300 flex items-start gap-5 border-2 group relative overflow-hidden",
                      isSelected 
                        ? "bg-accent text-accent-foreground border-accent shadow-[0_10px_30px_rgba(var(--accent-rgb),0.3)] scale-[1.01]" 
                        : "bg-white border-slate-100 hover:border-accent/30 hover:bg-accent/[0.02]"
                    )}
                  >
                    <span className={cn(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shrink-0 transition-colors shadow-sm",
                      isSelected ? "bg-white/20" : "bg-slate-100 text-slate-400 group-hover:bg-accent/10 group-hover:text-accent"
                    )}>
                      {letter}
                    </span>
                    <span className="flex-1 font-bold text-base md:text-lg leading-snug">{text}</span>
                    {isSelected && (
                      <motion.div 
                        layoutId="simulado-check"
                        className="shrink-0 mt-1.5"
                      >
                        <CheckCircle2 className="h-6 w-6" />
                      </motion.div>
                    )}
                  </button>
                );
              })}
            </div>
            
            {/* Reveal Hints inside Card if used */}
            <AnimatePresence>
              {currentHintsCount > 0 && (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4 pt-4 border-t border-slate-100"
                >
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-accent">Dicas Reveladas ({currentHintsCount}/3)</p>
                  {[1, 2, 3].map(hNum => {
                    if (hNum > currentHintsCount) return null;
                    const hintText = (currentQ as any)[`explicacao_${hNum}`];
                    return (
                      <div key={hNum} className="p-5 bg-accent/5 border-l-4 border-accent rounded-r-2xl animate-in slide-in-from-left-4 duration-500">
                        <p className="text-sm font-semibold leading-relaxed italic text-slate-700">{hintText}</p>
                      </div>
                    );
                  })}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Console Footer */}
          <div className="shrink-0 p-4 md:p-8 bg-slate-50/80 backdrop-blur-md border-t flex items-center justify-between gap-3 md:gap-6">
            <div className="flex items-center">
              <NeonHintLamp
                used={3} // Mostrar como já gastas
                onClick={() => {}} // Não fazer nada
                disabled={true} // Desabilitado
              />
            </div>

            <div className="flex items-center gap-2 md:gap-4 flex-1 justify-end min-w-0 pr-2 md:pr-0">
              <TactileButton
                variant="neutral"
                size="lg"
                className="h-12 md:h-14 px-4 md:px-8 rounded-2xl shrink-0"
                disabled={idx === 0}
                onClick={() => setIdx(idx - 1)}
              >
                <ChevronLeft className="md:mr-1 h-5 w-5" />
                <span className="hidden sm:inline">Anterior</span>
              </TactileButton>

              {idx + 1 === total ? (
                <TactileButton
                  variant="primary"
                  size="xl"
                  className={cn(
                    "h-12 md:h-14 px-6 md:min-w-[180px] rounded-2xl font-black bg-emerald-500 text-white shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:scale-105 active:scale-95 transition-all shrink-0",
                    submitting && "opacity-80 pointer-events-none"
                  )}
                  onClick={handleFinish}
                >
                  {submitting ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <div className="flex items-center gap-2 whitespace-nowrap">
                      <span className="text-sm md:text-base">Finalizar Prova</span>
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                  )}
                </TactileButton>
              ) : (
                <TactileButton
                  variant="primary"
                  size="xl"
                  className="h-12 md:h-14 px-6 md:min-w-[160px] rounded-2xl font-black bg-slate-900 text-white shadow-[0_10px_25px_rgba(0,0,0,0.2)] hover:scale-105 active:scale-95 transition-all shrink-0"
                  onClick={() => setIdx(idx + 1)}
                >
                  <div className="flex items-center gap-2 whitespace-nowrap">
                    <span className="text-sm md:text-base">Próxima</span>
                    <ChevronRight className="h-5 w-5" />
                  </div>
                </TactileButton>
              )}
            </div>
          </div>
        </Card>
      </div>
      {isEditing && currentQ && (
        <EditQuestionDialog
          question={currentQ}
          onClose={() => setIsEditing(false)}
          onSave={(updated) => {
            setQuestions(prev => prev.map(q => q.id === updated.id ? updated : q));
            setIsEditing(false);
          }}
        />
      )}
    </div>
  );
}
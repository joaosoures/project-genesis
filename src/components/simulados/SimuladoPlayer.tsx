import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Loader2, ChevronLeft, ChevronRight, CheckCircle2,
  XCircle, ChevronDown, ChevronUp, Info, Eye, LogOut, ArrowLeft, Settings,
  Target, TrendingUp, AlertTriangle, Layers, ShieldCheck
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import NeonProgressBar from "@/components/console/NeonProgressBar";
import TactileButton from "@/components/console/TactileButton";
import NeonHintLamp from "@/components/console/NeonHintLamp";
import EditQuestionDialog from "./EditQuestionDialog";
import CastigoEstudo from "./CastigoEstudo";

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
  especialidade?: string | null;
}

type SpecialtyInsight = {
  key: string;
  label: string;
  total: number;
  answered: number;
  correct: number;
  accuracy: number;
  pending: number;
};

type PeerComparison = {
  participant_count: number;
  real_participant_count: number;
  average_accuracy: number;
  specialties: Record<string, number>;
};

const RADAR_SPECIALTIES = [
  "clinica_medica", "cirurgia_geral", "ginecologia_obstetricia", "pediatria", "medicina_preventiva",
] as const;

const COMMAND_VERBS = /^(assinale|marque|indique|selecione|escolha|identifique|aponte|determine|considere)$/i;
const STATEMENT_HIGHLIGHTS = /(\b(?:assinale|marque|indique|selecione|escolha|identifique|aponte|determine|considere)\b|"[^"]*"|“[^”]*”|\([^)]*\))/gi;

function QuestionStatement({ text }: { text: string }) {
  const paragraphs = text.split(/\n+/).map(paragraph => paragraph.trim()).filter(Boolean);

  return (
    <div className="space-y-4 text-xl md:text-2xl font-normal leading-[1.7] tracking-[-0.01em] text-slate-800">
      {paragraphs.map((paragraph, paragraphIndex) => (
        <p key={`${paragraphIndex}-${paragraph.slice(0, 20)}`}>
          {paragraph.split(STATEMENT_HIGHLIGHTS).filter(Boolean).map((part, partIndex) => {
            if (COMMAND_VERBS.test(part)) {
              return <strong key={partIndex} className="font-extrabold text-accent">{part}</strong>;
            }

            const isQuotedOrParenthetical =
              (part.startsWith('"') && part.endsWith('"')) ||
              (part.startsWith('“') && part.endsWith('”')) ||
              (part.startsWith('(') && part.endsWith(')'));

            return isQuotedOrParenthetical ? (
              <span key={partIndex} className="font-medium text-slate-600 bg-slate-100/80 rounded-md px-1.5 py-0.5">
                {part}
              </span>
            ) : part;
          })}
        </p>
      ))}
    </div>
  );
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
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [result, setResult] = useState<{
    tentativaId?: string;
    acertos: number;
    total: number;
    respostas: any[];
  } | null>(null);
  const [openReportQuestion, setOpenReportQuestion] = useState("");
  const [castigoPedido, setCastigoPedido] = useState<string | null>(null);
  const reviewSectionRef = useRef<HTMLDivElement>(null);
  const castigoSectionRef = useRef<HTMLDivElement>(null);
  const [showCastigoShortcut, setShowCastigoShortcut] = useState(false);
  const [pendingCastigoCount, setPendingCastigoCount] = useState(0);
  const [showAllReviewQuestions, setShowAllReviewQuestions] = useState(false);
  const [peerComparison, setPeerComparison] = useState<PeerComparison | null>(null);

  useEffect(() => {
    if (!user) return;

    const initializeSimulado = async () => {
      setLoading(true);
      try {
        const { data: questionData, error: questionError } = await supabase
          .from("simulado_questoes")
          .select("*")
          .eq("simulado_id", simuladoId)
          .order("ordem", { ascending: true });

        if (questionError) throw questionError;
        const loadedQuestions = questionData || [];
        setQuestions(loadedQuestions);

        if (initialReportMode) {
          const { data: tentativa, error: attemptError } = await supabase
            .from("simulado_tentativas")
            .select("*")
            .eq("simulado_id", simuladoId)
            .eq("usuario_id", user.id)
            .not("concluido_em", "is", null)
            .order("concluido_em", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (attemptError) throw attemptError;
          if (!tentativa) return;

          const { data: savedAnswers, error: answersError } = await supabase
            .from("simulado_respostas_aluno")
            .select("*")
            .eq("tentativa_id", tentativa.id);

          if (answersError) throw answersError;
          setResult({
            tentativaId: tentativa.id,
            acertos: tentativa.acertos,
            total: tentativa.total_questoes,
            respostas: (savedAnswers || []).map(response => ({
              questao_id: response.questao_id,
              resposta_marcada: response.resposta_marcada,
              acertou: response.acertou,
              respondida: true
            }))
          });
          setFinished(true);
          return;
        }

        let { data: tentativa, error: attemptError } = await supabase
          .from("simulado_tentativas")
          .select("*")
          .eq("simulado_id", simuladoId)
          .eq("usuario_id", user.id)
          .is("concluido_em", null)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (attemptError) throw attemptError;
        if (!tentativa) {
          const { data: createdAttempt, error: createError } = await supabase
            .from("simulado_tentativas")
            .insert({
              simulado_id: simuladoId,
              usuario_id: user.id,
              total_questoes: loadedQuestions.length,
              concluido_em: null
            })
            .select()
            .single();

          if (createError) throw createError;
          tentativa = createdAttempt;
        }

        setAttemptId(tentativa.id);
        const { data: savedAnswers, error: answersError } = await supabase
          .from("simulado_respostas_aluno")
          .select("questao_id, resposta_marcada")
          .eq("tentativa_id", tentativa.id);

        if (answersError) throw answersError;
        const restoredAnswers = Object.fromEntries(
          (savedAnswers || []).map(response => [response.questao_id, response.resposta_marcada])
        );
        setAnswers(restoredAnswers);

        const lastAnsweredIndex = loadedQuestions.reduce(
          (lastIndex, question, questionIndex) => restoredAnswers[question.id] ? questionIndex : lastIndex,
          -1
        );
        if (lastAnsweredIndex >= 0) {
          setIdx(Math.min(lastAnsweredIndex + 1, loadedQuestions.length - 1));
        }
      } catch (err) {
        console.error(err);
        toast.error("Erro ao sincronizar o simulado.");
      } finally {
        setLoading(false);
      }
    };

    initializeSimulado();
  }, [simuladoId, initialReportMode, user]);

  useEffect(() => {
    if (!reportMode || !user) return;

    const loadPeerComparison = async () => {
      const { data, error } = await supabase.rpc("get_simulado_comparison", { p_simulado_id: simuladoId });
      if (!error && data) setPeerComparison(data as PeerComparison);
    };

    loadPeerComparison();
  }, [reportMode, simuladoId, user]);

  useEffect(() => {
    if (!reportMode || !user) return;
    supabase.rpc("get_simulado_comparison", { p_simulado_id: simuladoId }).then(({ data, error }) => {
      if (!error && data) setPeerComparison(data as PeerComparison);
    });
  }, [reportMode, simuladoId, user]);

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

  const handleSelectAnswer = async (question: Question, answer: string) => {
    if (!attemptId) return;

    const previousAnswer = answers[question.id];
    setAnswers(current => ({ ...current, [question.id]: answer }));

    const { error } = await supabase
      .from("simulado_respostas_aluno")
      .upsert({
        tentativa_id: attemptId,
        questao_id: question.id,
        resposta_marcada: answer,
        acertou: answer === question.gabarito
      }, { onConflict: "tentativa_id,questao_id" });

    if (error) {
      setAnswers(current => {
        const restored = { ...current };
        if (previousAnswer) restored[question.id] = previousAnswer;
        else delete restored[question.id];
        return restored;
      });
      toast.error("Não foi possível salvar esta resposta. Tente novamente.");
    }
  };

  const handleFinish = async () => {
    if (!user || !attemptId || submitting) return;
    
    setSubmitting(true);
    try {
      const report = currentReportData;
      const { error: attemptError } = await supabase
        .from("simulado_tentativas")
        .update({
          acertos: report.acertos,
          erros: report.total - report.acertos,
          total_questoes: report.total,
          concluido_em: new Date().toISOString()
        })
        .eq("id", attemptId)
        .eq("usuario_id", user.id);

      if (attemptError) throw attemptError;

      setResult({
        tentativaId: attemptId,
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

  useEffect(() => {
    if (!reportMode) return;

    const updateCastigoShortcut = () => {
      const review = reviewSectionRef.current?.getBoundingClientRect();
      const castigo = castigoSectionRef.current?.getBoundingClientRect();
      setShowCastigoShortcut(Boolean(review && castigo && review.bottom > 0 && castigo.top > 0));
    };

    updateCastigoShortcut();
    window.addEventListener("scroll", updateCastigoShortcut, { passive: true });
    window.addEventListener("resize", updateCastigoShortcut);

    return () => {
      window.removeEventListener("scroll", updateCastigoShortcut);
      window.removeEventListener("resize", updateCastigoShortcut);
    };
  }, [reportMode]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-accent" />
      <p className="text-sm font-bold animate-pulse uppercase tracking-[0.2em]">Sincronizando Simulado...</p>
    </div>
  );

  if (reportMode) {
    const data = result ?? currentReportData;
    const reportAttemptId = result?.tentativaId ?? attemptId;
    const percent = data.total > 0 ? Math.round((data.acertos / data.total) * 100) : 0;
    const answeredCount = data.respostas.filter((res) => res.respondida).length;
    const pendingCount = Math.max(0, data.total - answeredCount);
    const errorCount = Math.max(0, answeredCount - data.acertos);
    const specialtyInsights = RADAR_SPECIALTIES.map((key) => {
      const group = questions.filter((question) => question.especialidade === key);
      const total = group.length;
      const answered = group.filter((question) => data.respostas.find((res) => res.questao_id === question.id)?.respondida).length;
      const correct = group.filter((question) => data.respostas.find((res) => res.questao_id === question.id)?.acertou).length;
      return { key, label: ESPECIALIDADE_LABEL[key], total, answered, correct, accuracy: answered ? Math.round((correct / answered) * 100) : 0, pending: total - answered };
    });
    const legacySpecialtyInsights = questions.reduce<SpecialtyInsight[]>((groups, question) => {
      const key = question.especialidade || "nao_informada";
      const existing = groups.find((group) => group.key === key);
      const response = data.respostas.find((res) => res.questao_id === question.id);
      const answered = Boolean(response?.respondida);
      if (existing) {
        existing.total += 1;
        existing.answered += answered ? 1 : 0;
        existing.correct += response?.acertou ? 1 : 0;
        existing.pending += answered ? 0 : 1;
      } else {
        groups.push({
          key,
          label: ESPECIALIDADE_LABEL[key as keyof typeof ESPECIALIDADE_LABEL] || "Especialidade não informada",
          total: 1,
          answered: answered ? 1 : 0,
          correct: response?.acertou ? 1 : 0,
          accuracy: 0,
          pending: answered ? 0 : 1,
        });
      }
      return groups;
    }, []).map((group) => ({
      ...group,
      accuracy: group.answered > 0 ? Math.round((group.correct / group.answered) * 100) : 0,
    })).sort((a, b) => b.accuracy - a.accuracy || b.total - a.total);
    const bestSpecialty = specialtyInsights.filter((group) => group.answered > 0).sort((a, b) => b.accuracy - a.accuracy)[0];
    const focusSpecialty = [...specialtyInsights].filter((group) => group.answered > 0).sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0];

    const scrollToCastigo = () => {
      castigoSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    
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

          <Card className="relative overflow-hidden rounded-[2.5rem] border-none bg-slate-950 p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.35)] md:p-8">
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
            <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                <div className="max-w-xl">
                  <h3 className="text-2xl font-black tracking-tight md:text-3xl">Seu mapa da prova.</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">Você respondeu {answeredCount} de {data.total} questões. Veja onde sua preparação já é consistente e qual especialidade merece o próximo bloco de estudo.</p>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.06] px-5 py-4 text-left md:min-w-[165px]">
                  <p className="text-[9px] font-black uppercase tracking-[0.18em] text-slate-400">Aproveitamento</p>
                  <p className="mt-1 text-4xl font-black text-emerald-300">{percent}%</p>
                  <p className="text-xs font-semibold text-slate-400">{data.acertos} acertos em {answeredCount} respondidas</p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { label: "Acertos", value: data.acertos, detail: `${percent}% do simulado`, icon: CheckCircle2, color: "text-emerald-300", bg: "bg-emerald-400/10" },
                  { label: "Erros", value: errorCount, detail: errorCount ? "pontos para revisar" : "nenhum erro registrado", icon: AlertTriangle, color: "text-rose-300", bg: "bg-rose-400/10" },
                  { label: "Pendentes", value: pendingCount, detail: pendingCount ? "questões não respondidas" : "simulado completo", icon: Target, color: "text-amber-300", bg: "bg-amber-400/10" },
                ].map((metric) => (
                  <div key={metric.label} className="rounded-3xl border border-white/10 bg-white/[0.06] p-4">
                    <div className="flex items-center justify-between"><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{metric.label}</span><metric.icon className={cn("h-4 w-4", metric.color)} /></div>
                    <p className={cn("mt-2 text-3xl font-black", metric.color)}>{metric.value}</p>
                    <p className="mt-1 text-xs font-medium text-slate-400">{metric.detail}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-5 border-t border-white/10 pt-6 lg:grid-cols-[1fr_1.15fr]">
                <div className="flex items-center gap-5">
                  <div className="relative h-28 w-28 shrink-0">
                    <svg className="h-full w-full -rotate-90"><circle cx="56" cy="56" r="47" fill="none" stroke="currentColor" strokeWidth="10" className="text-white/10" /><motion.circle initial={{ strokeDasharray: "0 295" }} animate={{ strokeDasharray: `${(percent / 100) * 295} 295` }} transition={{ duration: 1.5, ease: "easeOut" }} cx="56" cy="56" r="47" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round" className="text-emerald-400" /></svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-2xl font-black">{percent}%</span><span className="text-[8px] font-black uppercase tracking-widest text-slate-400">precisão</span></div>
                  </div>
                  <div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">Diagnóstico rápido</p><p className="mt-2 text-lg font-black">{percent >= 80 ? "Excelente consistência" : percent >= 60 ? "Boa base, falta lapidar" : "Hora de consolidar a base"}</p><p className="mt-1 text-xs leading-relaxed text-slate-400">{pendingCount ? `Finalize as ${pendingCount} pendências para um retrato ainda mais fiel.` : "Seu resultado considera todas as questões deste simulado."}</p></div>
                </div>
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-3 flex items-center gap-2"><Layers className="h-4 w-4 text-cyan-300" /><p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-300">Radar por especialidade</p></div>
                  <div className="space-y-3">
                    {specialtyInsights.map((specialty) => (
                      <div key={specialty.key} className="space-y-1.5"><div className="flex justify-between gap-3 text-xs"><span className="truncate font-bold text-slate-200">{specialty.label}</span><span className={cn("font-black", specialty.accuracy >= 70 ? "text-emerald-300" : specialty.accuracy >= 50 ? "text-amber-300" : "text-rose-300")}>{specialty.answered ? `${specialty.accuracy}%` : "Pendente"}</span></div><div className="h-2 overflow-hidden rounded-full bg-white/10"><div className={cn("h-full rounded-full transition-all", specialty.accuracy >= 70 ? "bg-emerald-400" : specialty.accuracy >= 50 ? "bg-amber-400" : "bg-rose-400")} style={{ width: `${specialty.answered ? specialty.accuracy : 4}%` }} /></div></div>
                    ))}
                    {specialtyInsights.length === 0 && <p className="text-xs text-slate-400">As especialidades aparecerão quando houver questões cadastradas.</p>}
                  </div>
                </div>
              </div>
            </div>
          </Card>


          <Card className="rounded-[2rem] border-cyan-500/15 bg-cyan-500/[0.04] p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-cyan-600" />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-700">Comparação com outros alunos</p>
                <p className="mt-1 text-lg font-black text-foreground">Você fez {percent}% · média da turma {peerComparison?.average_accuracy ?? 62}%</p>
                <p className="mt-1 text-xs text-muted-foreground">Base de {peerComparison?.participant_count ?? 5} alunos{peerComparison?.real_participant_count && peerComparison.real_participant_count < 5 ? " · dados estimados enquanto a prova ganha histórico" : ""}.</p>
                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  {specialtyInsights.map((specialty) => { const peer = peerComparison?.specialties?.[specialty.key] ?? 62; return <div key={specialty.key} className="rounded-xl bg-background/70 p-2"><p className="truncate text-[9px] font-bold text-muted-foreground">{specialty.label}</p><p className="mt-1 text-sm font-black">{specialty.accuracy}% <span className="text-[10px] font-bold text-muted-foreground">/ {peer}%</span></p></div>; })}
                </div>
              </div>
            </div>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card className="rounded-[2rem] border-emerald-500/15 bg-emerald-500/[0.04] p-5 shadow-sm"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" /><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">Seu ponto forte</p><p className="mt-1 font-black text-foreground">{bestSpecialty ? `${bestSpecialty.label} · ${bestSpecialty.accuracy}%` : "Responda questões para descobrir"}</p><p className="mt-1 text-xs text-muted-foreground">{bestSpecialty ? `${bestSpecialty.correct} acerto(s) em ${bestSpecialty.answered} respondida(s).` : "O relatório vai identificar sua especialidade de maior domínio."}</p></div></div></Card>
            <Card className="rounded-[2rem] border-rose-500/15 bg-rose-500/[0.04] p-5 shadow-sm"><div className="flex items-start gap-3"><TrendingUp className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /><div><p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-700">Próximo foco</p><p className="mt-1 font-black text-foreground">{focusSpecialty ? `${focusSpecialty.label} · ${focusSpecialty.accuracy}%` : "Complete o simulado"}</p><p className="mt-1 text-xs text-muted-foreground">{focusSpecialty ? `${focusSpecialty.pending} pendente(s) e ${focusSpecialty.total - focusSpecialty.correct - focusSpecialty.pending} erro(s) para revisar.` : "Com mais respostas, o direcionamento fica mais preciso."}</p></div></div></Card>
          </div>

          <div ref={reviewSectionRef} className="space-y-6">
            <h3 className="text-xl font-black uppercase tracking-widest flex items-center gap-3">
              <div className="h-6 w-1 bg-accent rounded-full" />
              Revisão das Questões
            </h3>

            <Accordion
              type="single"
              collapsible
              value={openReportQuestion}
              onValueChange={setOpenReportQuestion}
              className="space-y-4"
            >
              {questions.slice(0, showAllReviewQuestions ? questions.length : 5).map((q, i) => {
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
                          <p className={cn(
                            "font-bold text-sm md:text-base leading-tight",
                            openReportQuestion === q.id ? "whitespace-normal" : "line-clamp-1"
                          )}>
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

                      {reportAttemptId && (
                        <Button variant="outline" onClick={() => setCastigoPedido(q.id)}>Resolver questões semelhantes</Button>
                      )}
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

            {questions.length > 5 && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAllReviewQuestions(current => !current)}
                  className="rounded-full border-2 border-accent/30 bg-accent/5 px-6 py-5 font-bold text-accent shadow-sm transition-all hover:bg-accent/10 hover:shadow-md"
                >
                  {showAllReviewQuestions ? <ChevronUp className="mr-2 h-5 w-5" /> : <ChevronDown className="mr-2 h-5 w-5" />}
                  {showAllReviewQuestions ? "Mostrar menos" : `Mostrar todas (${questions.length})`}
                </Button>
              </div>
            )}
          </div>

          {reportAttemptId && (
            <div ref={castigoSectionRef}>
              <CastigoEstudo tentativaId={reportAttemptId} originais={questions.map(q => {
                const resposta = data.respostas.find(r => r.questao_id === q.id);
                return {
                  id: q.id,
                  comando: q.comando,
                  respondida: resposta?.respondida === true,
                  acertou: resposta?.acertou === true,
                  errou: resposta?.respondida === true && resposta.acertou === false
                };
              })} pedido={castigoPedido} onPedidoHandled={() => setCastigoPedido(null)} onPendingCountChange={setPendingCastigoCount} />
            </div>
          )}

          <AnimatePresence>
            {showCastigoShortcut && reportAttemptId && (
              <motion.div
                initial={{ opacity: 0, y: 24, scale: 0.92 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 24, scale: 0.92 }}
                className="fixed bottom-6 right-6 z-[60]"
              >
                <Button
                  onClick={scrollToCastigo}
                  className="rounded-full bg-rose-600 px-6 py-6 font-black text-white shadow-2xl shadow-rose-600/30 transition-transform hover:scale-105 hover:bg-rose-700"
                >
                  Castigo
                  <span className="ml-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-sm font-black">
                    {pendingCastigoCount}
                  </span>
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

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
              {currentQ?.comando && <QuestionStatement text={currentQ.comando} />}
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
                    onClick={() => handleSelectAnswer(currentQ, letter)}
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
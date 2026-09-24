import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, BookOpenCheck, LightbulbOff, Loader2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import ModoABCDE, { type ModoHandle } from "@/components/oq/ModoABCDE";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { ESPECIALIDADE_LABEL, type CardRow } from "@/lib/oq";
import { preAulaToCard, type PreAulaQuestionRow } from "@/lib/pre-aula";

type PlayerState = {
  canConfirm: boolean;
  finalized: boolean;
};

export default function PreAula() {
  const { materialId } = useParams<{ materialId: string }>();
  const navigate = useNavigate();
  const modeRef = useRef<ModoHandle>(null);
  const [loading, setLoading] = useState(true);
  const [materialName, setMaterialName] = useState("");
  const [questions, setQuestions] = useState<PreAulaQuestionRow[]>([]);
  const [index, setIndex] = useState(0);
  const [playerState, setPlayerState] = useState<PlayerState>({ canConfirm: false, finalized: false });

  const goToSummary = useCallback(() => {
    navigate(materialId ? `/materiais?id=${materialId}` : "/materiais", { replace: true });
  }, [materialId, navigate]);

  const handlePlayerState = useCallback((state: PlayerState) => {
    setPlayerState((current) => (
      current.canConfirm === state.canConfirm && current.finalized === state.finalized ? current : state
    ));
  }, []);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!materialId) {
        goToSummary();
        return;
      }
      const [{ data: material, error: materialError }, { data: questionData, error: questionError }] = await Promise.all([
        supabase.from("materiais").select("nome").eq("id", materialId).maybeSingle(),
        supabase
          .from("pre_aula_questoes")
          .select("id,material_id,especialidade,questao,alternativa_a,alternativa_b,alternativa_c,alternativa_d,alternativa_e,gabarito,justificativa,ordem,ativo")
          .eq("material_id", materialId)
          .eq("ativo", true)
          .order("ordem", { ascending: true })
          .order("created_at", { ascending: true }),
      ]);

      if (!active) return;
      if (materialError || questionError || !material || !questionData?.length) {
        toast.info("Não há questões pré-aula disponíveis para este resumo.");
        goToSummary();
        return;
      }
      setMaterialName(material.nome);
      setQuestions(questionData as PreAulaQuestionRow[]);
      setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [goToSummary, materialId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center">
        <div className="text-center space-y-3 text-muted-foreground">
          <Loader2 className="h-9 w-9 animate-spin mx-auto text-accent" />
          <p className="text-sm font-semibold">Preparando sua sessão pré-aula…</p>
        </div>
      </div>
    );
  }

  const question = questions[index];
  if (!question) return null;
  const card: CardRow = preAulaToCard(question);
  const lastQuestion = index === questions.length - 1;

  function handlePrimaryAction() {
    if (!playerState.finalized) {
      modeRef.current?.confirm();
      return;
    }
    if (lastQuestion) {
      goToSummary();
      return;
    }
    setIndex((current) => current + 1);
    setPlayerState({ canConfirm: false, finalized: false });
  }

  return (
    <main className="max-w-4xl mx-auto px-4 py-6 md:py-10 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" size="sm" onClick={goToSummary} className="gap-2 rounded-xl">
          <ArrowLeft className="h-4 w-4" />
          Sair
        </Button>
        <Badge variant="outline" className="gap-1.5 rounded-full border-violet-400/40 bg-violet-500/5 text-violet-600 px-3 py-1">
          <BookOpenCheck className="h-3.5 w-3.5" /> Pré-Aula
        </Badge>
      </div>

      <header className="space-y-3 text-center">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-muted-foreground">
          {ESPECIALIDADE_LABEL[question.especialidade]}
        </p>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight">{materialName}</h1>
        <div className="max-w-md mx-auto space-y-2">
          <div className="flex justify-between text-xs font-bold text-muted-foreground">
            <span>Questão {index + 1} de {questions.length}</span>
            <span>{Math.round(((index + 1) / questions.length) * 100)}%</span>
          </div>
          <Progress value={((index + 1) / questions.length) * 100} className="h-2" />
        </div>
      </header>

      <Card className="paper-card rounded-3xl p-5 md:p-8 border-border/50 shadow-xl">
        <ModoABCDE
          key={question.id}
          ref={modeRef}
          card={card}
          hintsDisabled
          providedExplanation={question.justificativa}
          onFinalizar={() => undefined}
          onState={handlePlayerState}
        />
      </Card>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <LightbulbOff className="h-4 w-4" />
          Dicas indisponíveis nesta sessão
        </div>
        <Button
          size="lg"
          className="w-full sm:w-auto min-w-48 rounded-2xl font-black"
          disabled={!playerState.finalized && !playerState.canConfirm}
          onClick={handlePrimaryAction}
        >
          {playerState.finalized ? (lastQuestion ? "Ir para o Resumo" : "Próxima") : "Confirmar"}
        </Button>
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, ArrowLeft, Loader2, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import AreaSelector from "@/components/questoes-reais/AreaSelector";
import { CompletionDialog, PerfectDialog, PunishmentDecisionDialog } from "@/components/questoes-reais/FlowDialogs";
import QuantidadeWheel from "@/components/questoes-reais/QuantidadeWheel";
import QuestionPlayer from "@/components/questoes-reais/QuestionPlayer";
import ResumeSessionDialog from "@/components/questoes-reais/ResumeSessionDialog";
import { currentItem, punishmentIntensity, QuestaoRealArea, QuestaoRealState, questoesReaisApi } from "@/lib/questoes-reais";
import { useUserPlan } from "@/hooks/useUserPlan";

export default function QuestoesReais() {
  const navigate = useNavigate();
  const { loading: planLoading, plano } = useUserPlan();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resumeOpen, setResumeOpen] = useState(false);
  const [setupStep, setSetupStep] = useState<1 | 2>(1);
  const [quantity, setQuantity] = useState(10);
  const [areas, setAreas] = useState<QuestaoRealArea[]>([]);
  const [state, setState] = useState<QuestaoRealState | null>(null);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => { document.title = "Questões Reais — OQ MED"; }, []);
  useEffect(() => {
    if (planLoading) return;
    if (plano !== "prata" && plano !== "ouro") { navigate("/meu-plano", { replace: true }); return; }
    questoesReaisApi.ativa().then((active) => {
      setState(active);
      setResumeOpen(Boolean(active));
    }).catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, [planLoading, plano, navigate]);

  const item = state ? currentItem(state) : null;
  const type = state?.sessao.fase === "castigo" ? "castigo" : "base";
  const items = state?.itens.filter((entry) => entry.tipo === type) ?? [];
  const position = type === "base" ? state?.sessao.posicao_base ?? 0 : state?.sessao.posicao_castigo ?? 0;
  const intensity = type === "castigo" ? punishmentIntensity(position, items.length) : 0;

  const run = async (operation: () => Promise<QuestaoRealState | void>) => {
    setBusy(true); setErrorMessage("");
    try { const result = await operation(); if (result) setState(result); }
    catch (error) { const message = error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."; setErrorMessage(message); toast.error(message); }
    finally { setBusy(false); }
  };

  const start = () => run(async () => {
    const next = await questoesReaisApi.criar(quantity, areas);
    if (next.sessao.quantidade_efetiva < quantity) toast.info(`Encontramos ${next.sessao.quantidade_efetiva} questões. O bloco foi ajustado automaticamente.`);
    return next;
  });
  const finish = async (action: "pular" | "concluir") => {
    if (!state) return;
    await questoesReaisApi.encerrar(state.sessao.id, action);
    navigate("/dashboard");
  };
  const discard = async () => {
    if (!state) return;
    const castigo = state.sessao.fase === "castigo";
    await questoesReaisApi.encerrar(state.sessao.id, "descartar");
    setResumeOpen(false); setState(null); setSetupStep(1);
    if (castigo) navigate("/dashboard");
  };
  const next = () => run(async () => {
    if (!state || !item) return;
    const updated = await questoesReaisApi.avancar(item.id);
    if (type === "castigo" && updated.sessao.posicao_castigo >= items.length) setCompletionOpen(true);
    return updated;
  });
  const acceptPunishment = () => run(async () => {
    if (!state) return;
    const result = await questoesReaisApi.prepararCastigo(state.sessao.id);
    if (!("sessao" in result)) {
      toast.info("Não há questões semelhantes disponíveis para esta fila.");
      await questoesReaisApi.encerrar(state.sessao.id, "concluir");
      navigate("/dashboard");
      return;
    }
    const expected = state.erros_base * 3;
    const found = result.itens.filter((entry) => entry.tipo === "castigo").length;
    if (found < expected) toast.info(`Foram encontradas ${found} questões semelhantes disponíveis.`);
    return result;
  });

  if (loading || planLoading) return <div className="mx-auto max-w-4xl space-y-5 px-4 py-16"><Skeleton className="h-12 w-64" /><Skeleton className="h-96 w-full rounded-3xl" /></div>;

  const decision = state?.sessao.fase === "decisao_castigo";
  const perfect = decision && state.erros_base === 0;
  return <div className="relative min-h-[calc(100vh-2rem)] px-4 py-8 md:py-12">
    {type === "castigo" && <div aria-hidden className="pointer-events-none fixed inset-0 transition-colors motion-reduce:transition-none" style={{ background: `hsl(var(--destructive) / ${0.04 + intensity * 0.18})` }} />}
    <div className="relative z-10">
      {!state ? <AnimatePresence mode="wait">
        <motion.div key={setupStep} initial={{ opacity: 0, filter: "blur(10px)", y: 12 }} animate={{ opacity: 1, filter: "blur(0px)", y: 0 }} exit={{ opacity: 0, y: -8 }} className="mx-auto max-w-2xl">
          <Card className="border-accent/20 shadow-2xl"><CardContent className="space-y-8 p-6 md:p-10">
            <div className="text-center"><Target className="mx-auto mb-4 h-10 w-10 text-accent" /><p className="mb-2 text-xs font-black uppercase tracking-[0.25em] text-accent">Questões Reais</p><h1 className="text-3xl font-black md:text-5xl">{setupStep === 1 ? "Quantas você deseja hoje?" : "Quais áreas você gostaria?"}</h1></div>
            {setupStep === 1 ? <><QuantidadeWheel value={quantity} onChange={setQuantity} /><Button size="lg" className="w-full" onClick={() => setSetupStep(2)}>Confirmar</Button></> : <><AreaSelector value={areas} onChange={setAreas} />{errorMessage && <Alert variant="destructive"><AlertCircle className="h-4 w-4" /><AlertTitle>Não foi possível iniciar</AlertTitle><AlertDescription>{errorMessage}</AlertDescription></Alert>}<div className="flex gap-3"><Button variant="outline" size="lg" onClick={() => setSetupStep(1)}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button><Button size="lg" className="flex-1" disabled={!areas.length || busy} onClick={start}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Iniciar</Button></div></>}
          </CardContent></Card>
        </motion.div>
      </AnimatePresence> : item ? <QuestionPlayer item={item} position={position} total={items.length} punishment={type === "castigo"} busy={busy} onConfirm={(answer) => run(() => questoesReaisApi.confirmar(item.id, answer))} onNext={next} /> : null}
    </div>
    {state && <ResumeSessionDialog state={state} open={resumeOpen} onContinue={() => setResumeOpen(false)} onDiscard={() => void discard()} />}
    {state && <PerfectDialog open={Boolean(perfect && !resumeOpen)} onFinish={() => void finish("concluir")} />}
    {state && <PunishmentDecisionDialog open={Boolean(decision && state.erros_base > 0 && !resumeOpen)} errors={state.erros_base} busy={busy} onSkip={() => void finish("pular")} onAccept={acceptPunishment} />}
    {state && <CompletionDialog open={completionOpen} onFinish={() => void finish("concluir")} />}
  </div>;
}

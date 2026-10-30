import { useEffect, useState } from "react";
import { BookOpen, CircleHelp, Layers3, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { QUESTOES_REAIS_AREAS, QuestaoRealItem } from "@/lib/questoes-reais";
import ExplanationPanel from "./ExplanationPanel";

const LETTERS = ["A", "B", "C", "D", "E"];

function areaLabel(value?: string | null) {
  return QUESTOES_REAIS_AREAS.find((area) => area.value === value)?.label ?? value?.replace(/_/g, " ") ?? "Área não informada";
}

export default function QuestionPlayer({ item, position, total, punishment, busy, onConfirm, onNext }: {
  item: QuestaoRealItem;
  position: number;
  total: number;
  punishment: boolean;
  busy: boolean;
  onConfirm: (answer: string) => Promise<void>;
  onNext: () => Promise<void>;
}) {
  const [selected, setSelected] = useState(item.resposta_marcada ?? "");
  useEffect(() => setSelected(item.resposta_marcada ?? ""), [item.id, item.resposta_marcada]);
  const confirmed = Boolean(item.confirmado_em);
  const punishmentNumber = item.posicao || position + 1;
  const baseNumber = (item.questao_base_posicao ?? 0) + 1;

  return <div className="mx-auto w-full max-w-4xl space-y-5">
    <div className="flex items-center justify-between gap-4 px-1">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {punishment ? <><Sparkles className="h-3.5 w-3.5 text-destructive" /> Reforço direcionado</> : <><BookOpen className="h-3.5 w-3.5 text-accent" /> Bloco de questões</>}
      </div>
      <span className="text-sm font-bold text-foreground/80">Questão {position + 1} de {total}</span>
    </div>

    {punishment ? <div className="flex items-center justify-between gap-4 rounded-2xl border border-accent/20 bg-accent/[0.04] px-4 py-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <Sparkles className="h-4 w-4 text-accent" />
        <div>
          <div className="text-sm font-bold text-foreground">Castigo {baseNumber}</div>
          <div className="text-xs text-muted-foreground">Reforço da questão que você errou</div>
        </div>
      </div>
      <div className="flex items-center gap-1.5" aria-label={`Castigo ${punishmentNumber} de 3`}>
        {[1, 2, 3].map((dot) => <span key={dot} className={cn("h-2.5 w-2.5 rounded-full border border-accent/40", dot === punishmentNumber ? "bg-accent shadow-[0_0_9px_hsl(var(--accent))]" : "bg-accent/10")} />)}
      </div>
    </div> : <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border/70 bg-muted/25 px-4 py-2.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-medium"><BookOpen className="h-3.5 w-3.5 text-accent" /> {item.prova ?? "Prova não informada"}</span>
      <span className="hidden h-3 w-px bg-border sm:block" />
      <span><span className="font-medium text-foreground/80">Área</span> · {areaLabel(item.area)}</span>
    </div>}

    <Progress value={((position + (confirmed ? 1 : 0)) / total) * 100} className="h-1.5" />
    <Card className="overflow-hidden border-border/70 shadow-xl shadow-primary/[0.04]">
      <CardHeader className="space-y-5 pb-4">
        {item.image_url && <img src={item.image_url} alt="Imagem da questão" className="max-h-80 w-full rounded-2xl object-contain" />}
        <div className="flex items-start gap-3">
          <Badge variant={punishment ? "destructive" : "secondary"} className="mt-0.5 shrink-0 rounded-md px-2 py-1 text-[10px] tracking-[0.12em]">{punishment ? "CASTIGO" : "REAL"}</Badge>
          <p className="text-base font-semibold leading-relaxed md:text-lg">{item.questao}</p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {item.alternativas.map((option, index) => option && <button
          key={LETTERS[index]}
          disabled={confirmed || busy}
          onClick={() => setSelected(LETTERS[index])}
          className={cn(
            "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition",
            !confirmed && selected === LETTERS[index] && "border-accent bg-accent/10 ring-1 ring-accent",
            !confirmed && "hover:border-accent/50",
            confirmed && LETTERS[index] === item.gabarito && "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
            confirmed && selected === LETTERS[index] && selected !== item.gabarito && "border-destructive bg-destructive/10 text-destructive"
          )}
        >
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full border text-xs font-black">{LETTERS[index]}</span>
          <span className="leading-relaxed">{option}</span>
        </button>)}
        {confirmed && <ExplanationPanel explanations={item.explicacoes} />}
        <Button className="mt-4 w-full" size="lg" disabled={busy || (!confirmed && !selected)} onClick={() => confirmed ? onNext() : onConfirm(selected)}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{confirmed ? "Próxima" : "Confirmar"}
        </Button>
      </CardContent>
    </Card>
  </div>;
}

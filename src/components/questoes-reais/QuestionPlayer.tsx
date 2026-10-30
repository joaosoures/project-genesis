import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { QuestaoRealItem } from "@/lib/questoes-reais";
import ExplanationPanel from "./ExplanationPanel";

const LETTERS = ["A", "B", "C", "D", "E"];

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
  return <div className="mx-auto w-full max-w-4xl space-y-4">
    <div className="flex items-center justify-between gap-4">
      <Badge variant={punishment ? "destructive" : "default"} className="tracking-widest">{punishment ? "CASTIGO" : "QUESTÕES REAIS"}</Badge>
      <span className="text-sm font-bold">Questão {position + 1} de {total}</span>
    </div>
    <Progress value={((position + (confirmed ? 1 : 0)) / total) * 100} />
    <Card className="overflow-hidden shadow-xl">
      <CardHeader className="space-y-4">
        {item.image_url && <img src={item.image_url} alt="Imagem da questão" className="max-h-80 w-full rounded-2xl object-contain" />}
        <p className="text-base font-semibold leading-relaxed md:text-lg">{item.questao}</p>
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

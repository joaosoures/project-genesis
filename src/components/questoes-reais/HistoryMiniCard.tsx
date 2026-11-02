import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { QuestaoRealItem, answerText } from "@/lib/questoes-reais";

export default function HistoryMiniCard({ item, children }: { item: QuestaoRealItem; children?: React.ReactNode }) {
  const confirmed = item.confirmado_em !== null;
  return <Card className={`overflow-hidden border-l-4 ${item.acertou ? "border-l-emerald-500" : "border-l-rose-500"}`}>
    <CardContent className="space-y-3 p-4">
      <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <Badge variant="outline" className="text-[10px]">{item.tipo === "base" ? "Bloco-base" : "Castigo"}</Badge>
        <span>{confirmed ? `${item.acertou ? "Acertou" : "Errou"} · ${item.resposta_marcada ?? "—"}` : "Não respondida"}</span>
      </div>
      <p className="line-clamp-3 text-sm font-medium leading-relaxed">{item.questao}</p>
      {confirmed && <p className="flex items-start gap-2 text-xs text-muted-foreground"><span className={item.acertou ? "text-emerald-600" : "text-rose-600"}>{item.acertou ? <Check className="mt-0.5 h-4 w-4" /> : <X className="mt-0.5 h-4 w-4" />}</span><span><strong>Gabarito:</strong> {item.gabarito} · {answerText(item)}</span></p>}
      {children}
    </CardContent>
  </Card>;
}

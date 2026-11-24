import { Check, RotateCcw, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MODO_LABEL, type CardRow, type Especialidade, type Modo } from "@/lib/oq";
import type { ImportedOq } from "@/lib/oq-import";

export type OqJudgeResult = { decision: "keep" | "delete"; reason: string };

type DisplayOq = Pick<CardRow, "id" | "modo" | "especialidade" | "comando" | "alternativa_a" | "alternativa_b" | "alternativa_c" | "alternativa_d" | "alternativa_e" | "alternativa_correta" | "info_1" | "info_2" | "info_3" | "info_4" | "info_5" | "var_1" | "var_2" | "var_3" | "var_4" | "var_5" | "explicacao">;
export function stagingToDisplay(item: ImportedOq, id: string): DisplayOq {
  const answer = (index: number) => item.respostas[index] || null;
  const variation = (index: number) => item.variacoes[index] || null;
  return { id, modo: item.modo, especialidade: item.especialidade, comando: item.comando,
    alternativa_a: item.modo === "abcde" ? answer(0) : null, alternativa_b: item.modo === "abcde" ? answer(1) : null,
    alternativa_c: item.modo === "abcde" ? answer(2) : null, alternativa_d: item.modo === "abcde" ? answer(3) : null,
    alternativa_e: item.modo === "abcde" ? answer(4) : null, alternativa_correta: item.gabarito,
    info_1: item.modo === "abcde" ? null : answer(0), info_2: item.modo === "oq_falta" ? answer(1) : null,
    info_3: item.modo === "oq_falta" ? answer(2) : null, info_4: item.modo === "oq_falta" ? answer(3) : null,
    info_5: item.modo === "oq_falta" ? answer(4) : null, var_1: variation(0), var_2: item.modo === "oq_falta" ? variation(1) : null,
    var_3: item.modo === "oq_falta" ? variation(2) : null, var_4: item.modo === "oq_falta" ? variation(3) : null,
    var_5: item.modo === "oq_falta" ? variation(4) : null, explicacao: item.explicacao };
}

export function OqStagingCard({ item, excluded, judge, onToggle, title }: { item: DisplayOq; excluded: boolean; judge?: OqJudgeResult; onToggle: () => void; title: string }) {
  const pairs = item.modo === "abcde" ? [item.alternativa_a, item.alternativa_b, item.alternativa_c, item.alternativa_d, item.alternativa_e].map((value, index) => [`${"ABCDE"[index]}${item.alternativa_correta === "ABCDE"[index] ? " · gabarito" : ""}`, value]) : [item.info_1, item.info_2, item.info_3, item.info_4, item.info_5].map((value, index) => [item.modo === "lacuna" ? "Resposta" : `Item ${index + 1}`, value]);
  const vars = [item.var_1, item.var_2, item.var_3, item.var_4, item.var_5].map((value, index) => value && [index, value]).filter(Boolean) as [number, string][];
  return <Card className={`min-w-0 space-y-3 p-4 ${excluded ? "border-destructive/40 bg-destructive/5 opacity-70" : ""}`}>
    <div className="flex min-w-0 items-start justify-between gap-2"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{MODO_LABEL[item.modo as Modo]}</Badge><span className="break-all font-mono text-[10px] text-muted-foreground">{title} · {item.id.slice(0, 8)}</span>{excluded && <Badge variant="destructive">Exclusão pendente</Badge>}</div><p className="mt-2 whitespace-pre-wrap break-words text-sm font-semibold">{item.comando}</p></div><Button variant="ghost" size="icon" className="shrink-0" onClick={onToggle} aria-label={excluded ? "Restaurar" : "Excluir"}>{excluded ? <RotateCcw className="h-4 w-4"/> : <Trash2 className="h-4 w-4 text-destructive"/>}</Button></div>
    <div className="space-y-1 border-t pt-2">{pairs.filter(([, value]) => value).map(([label, value], index) => <p key={index} className="break-words text-xs"><strong>{label}:</strong> {value}</p>)}</div>
    {vars.length > 0 && <details className="text-xs"><summary className="cursor-pointer font-semibold">Variações</summary><div className="mt-2 space-y-1">{vars.map(([index, value]) => <p key={index} className="break-words"><strong>{item.modo === "oq_falta" ? `Item ${index + 1}` : "Resposta"}:</strong> {value}</p>)}</div></details>}
    {item.explicacao && <details className="text-xs"><summary className="cursor-pointer font-semibold">Explicação</summary><p className="mt-2 whitespace-pre-wrap break-words text-muted-foreground">{item.explicacao}</p></details>}
    {judge && <div className={`rounded-lg border p-2 text-xs ${judge.decision === "keep" ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/30 bg-amber-500/5"}`}><p className="flex items-center gap-1 font-bold">{judge.decision === "keep" ? <Check className="h-3 w-3"/> : <Trash2 className="h-3 w-3"/>}IA sugere: {judge.decision === "keep" ? "Manter" : "Excluir"}</p><p className="mt-1 break-words text-muted-foreground">{judge.reason}</p></div>}
  </Card>;
}

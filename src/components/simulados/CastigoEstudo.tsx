import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import NeonProgressBar from "@/components/console/NeonProgressBar";

type Filha = Database["public"]["Tables"]["castigo_filhas"]["Row"];
type Resposta = Database["public"]["Tables"]["castigo_respostas"]["Row"];
type Original = { id: string; comando: string; errou: boolean };

export default function CastigoEstudo({ tentativaId, originais, pedido, onPedidoHandled }: {
  tentativaId: string;
  originais: Original[];
  pedido: string | null;
  onPedidoHandled: () => void;
}) {
  const [filhas, setFilhas] = useState<Filha[]>([]);
  const [respostas, setRespostas] = useState<Resposta[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [scope, setScope] = useState<string[] | null>(null);
  const [index, setIndex] = useState(0);
  const idsKey = originais.map(o => o.id).join(",");
  const ids = useMemo(() => idsKey.split(",").filter(Boolean), [idsKey]);

  const reload = useCallback(async () => {
    if (!ids.length) { setLoading(false); return; }
    const [children, saved] = await Promise.all([
      supabase.from("castigo_filhas").select("*").in("questao_original_id", ids).eq("ativo", true).order("posicao"),
      supabase.from("castigo_respostas").select("*").eq("tentativa_id", tentativaId)
    ]);
    if (children.error || saved.error) toast.error("Não foi possível carregar o castigo.");
    else { setFilhas(children.data ?? []); setRespostas(saved.data ?? []); }
    setLoading(false);
  }, [ids, tentativaId]);

  useEffect(() => { void reload(); }, [reload]);

  const activeFor = (id: string) => filhas.filter(f => f.questao_original_id === id);
  const responseFor = (id: string) => respostas.find(r => r.filha_id === id);
  const pending = (id: string) => activeFor(id).filter(f => !responseFor(f.id)?.finalizada_em);
  const fullIds = originais.filter(o => o.errou && activeFor(o.id).length > 0 && pending(o.id).length > 0).map(o => o.id);
  const selected = scope ? filhas.filter(f => scope.includes(f.questao_original_id) && !responseFor(f.id)?.finalizada_em) : [];
  const current = selected[Math.min(index, selected.length - 1)];
  const currentResponse = current ? responseFor(current.id) : undefined;
  const currentAnswer = current ? drafts[current.id] ?? currentResponse?.resposta ?? "" : "";
  const currentConfirmed = !!currentResponse?.resposta;
  const currentCorrect = currentConfirmed && currentResponse?.resposta === current?.gabarito;

  useEffect(() => {
    if (!pedido || loading) return;
    if (activeFor(pedido).length > 0) { setScope([pedido]); setIndex(0); }
    else toast.info("Não há questões semelhantes disponíveis no momento");
    onPedidoHandled();
  }, [pedido, loading, filhas, onPedidoHandled]);

  const confirmAnswer = async () => {
    if (!current || !currentAnswer || busy || currentConfirmed) return;
    setBusy(true);
    const { data, error } = await supabase.rpc("castigo_responder", {
      p_tentativa: tentativaId,
      p_filha: current.id,
      p_resposta: currentAnswer
    });
    if (error) {
      toast.error(error.message);
    } else {
      setRespostas(prev => [...prev.filter(r => r.filha_id !== current.id), {
        ...(data ?? {}),
        tentativa_id: tentativaId,
        filha_id: current.id,
        resposta: currentAnswer,
        finalizada_em: null,
        updated_at: new Date().toISOString()
      } as Resposta]);
    }
    setBusy(false);
  };

  const finish = async () => {
    if (!scope || busy) return;
    const all = filhas.filter(f => scope.includes(f.questao_original_id));
    if (all.some(f => !responseFor(f.id)?.resposta)) { toast.error("Confirme a resposta de todas as questões antes de concluir."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("castigo_finalizar", { p_tentativa: tentativaId, p_filhas: all.map(f => f.id) });
    if (error) { toast.error(error.message); await reload(); }
    else { toast.success("Castigo concluído!"); await reload(); setScope(null); }
    setBusy(false);
  };

  const restart = async () => {
    if (!scope || busy) return;
    const all = filhas.filter(f => scope.includes(f.questao_original_id));
    setBusy(true);
    const { error } = await supabase.rpc("castigo_reiniciar", {
      p_tentativa: tentativaId,
      p_filhas: all.map(f => f.id)
    });
    if (error) {
      toast.error(error.message);
    } else {
      setRespostas(prev => prev.filter(r => !all.some(f => f.id === r.filha_id)));
      setDrafts(prev => {
        const next = { ...prev };
        all.forEach(f => delete next[f.id]);
        return next;
      });
      setIndex(0);
      toast.success("Você pode responder novamente às questões semelhantes.");
    }
    setBusy(false);
  };

  if (loading) return <p className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando castigo...</p>;
  return <section className="space-y-4" id="castigo-do-simulado">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Castigo do Simulado</h3><p className="text-sm text-muted-foreground">Pratique as questões semelhantes com feedback imediato após cada resposta.</p></div>
      {fullIds.length > 0 && <Button onClick={() => { setScope(fullIds); setIndex(0); }}>Realizar castigo completo</Button>}
    </div>
    {originais.map((o, i) => {
      const active = activeFor(o.id);
      const done = active.filter(f => !!responseFor(f.id)?.finalizada_em).length;
      return <Card key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">Questão {i + 1} {o.errou ? "· errada" : "· acertada"}</p><p className="text-xs text-muted-foreground line-clamp-1">{o.comando}</p></div>
        {active.length > 0 ? <><Badge variant="outline">{done}/{active.length} concluídas</Badge><Button size="sm" variant="outline" onClick={() => { setScope([o.id]); setIndex(0); }}>{done === active.length ? "Revisar" : "Resolver filhas"}</Button></> : <p className="text-sm text-muted-foreground">Não há questões semelhantes disponíveis no momento</p>}
      </Card>;
    })}
    {scope && <div className="fixed inset-0 z-[70] bg-background overflow-y-auto p-4 md:p-10">
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <Button variant="ghost" onClick={() => setScope(null)}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao relatório</Button>
        <h2 className="text-2xl font-black">Castigo do Simulado</h2>
        {selected.length === 0 ? <Card className="p-6 space-y-3"><p>As questões semelhantes dessa questão já foram respondidas.</p><div className="flex flex-wrap gap-2"><Button onClick={restart} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fazer novamente"}</Button><Button variant="outline" onClick={() => setScope(null)}>Voltar</Button></div></Card> : <>
          <div className="space-y-2"><p className="text-sm text-muted-foreground">Filha {index + 1} de {selected.length} · Questão original {originais.findIndex(o => o.id === current.questao_original_id) + 1} · versão {current.versao}</p><NeonProgressBar value={index + 1} total={selected.length} className="h-2" /></div>
          <Card className="paper-card rounded-[2rem] p-6 md:p-10 space-y-6"><p className="text-xl md:text-2xl leading-relaxed font-medium whitespace-pre-wrap text-slate-800">{current.questao}</p>
            <div className="space-y-3">{(["a", "b", "c", "d", "e"] as const).map(letter => {
              const answer = letter.toUpperCase();
              const isSelected = currentAnswer === answer;
              const isCorrect = currentConfirmed && answer === current.gabarito;
              const isWrong = currentConfirmed && isSelected && !currentCorrect;
              return <button key={letter} disabled={busy || currentConfirmed} onClick={() => setDrafts(prev => ({ ...prev, [current.id]: answer }))} className={`flex items-start gap-4 w-full text-left rounded-[1.5rem] border-2 p-5 md:p-6 font-bold transition-all ${isCorrect ? "border-emerald-500 bg-emerald-50 text-emerald-900" : isWrong ? "border-rose-500 bg-rose-50 text-rose-900" : isSelected ? "border-accent bg-accent text-accent-foreground shadow-lg" : "border-slate-100 bg-white text-slate-800 hover:border-accent/30"}`}><span className={`rounded-lg px-3 py-1 font-black ${isCorrect || isWrong ? "bg-white" : "bg-slate-100 text-slate-800"}`}>{answer}</span>{(isCorrect || isWrong) && (isCorrect ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <XCircle className="h-5 w-5 shrink-0" />)}<span>{current[`alt_${letter}`]}</span></button>;
            })}</div>
            {!currentConfirmed ? <Button className="w-full" disabled={!currentAnswer || busy} onClick={confirmAnswer}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirmar resposta"}</Button> : <div className={`rounded-2xl p-5 space-y-3 ${currentCorrect ? "bg-emerald-50 text-emerald-950" : "bg-rose-50 text-rose-950"}`}><p className="font-black flex items-center gap-2">{currentCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />} {currentCorrect ? "Resposta correta!" : `Resposta incorreta. Gabarito: ${current.gabarito}`}</p><p className="text-sm whitespace-pre-wrap leading-relaxed">{current.justificativa}</p></div>}
          </Card>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Anterior</Button><Button variant="outline" disabled={!currentConfirmed || index === selected.length - 1} onClick={() => setIndex(index + 1)}>Próxima questão</Button><Button disabled={busy || selected.some(f => !responseFor(f.id)?.resposta)} onClick={finish}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir castigo"}</Button></div>
        </>}
      </div>
    </div>}
  </section>;
}

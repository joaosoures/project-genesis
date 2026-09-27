import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
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
  const fullIds = originais.filter(o => o.errou && activeFor(o.id).length === 3 && pending(o.id).length > 0).map(o => o.id);
  const selected = scope ? filhas.filter(f => scope.includes(f.questao_original_id) && !responseFor(f.id)?.finalizada_em) : [];
  const current = selected[Math.min(index, selected.length - 1)];

  useEffect(() => {
    if (!pedido || loading) return;
    if (activeFor(pedido).length === 3) { setScope([pedido]); setIndex(0); }
    else toast.info("Não há questões semelhantes disponíveis no momento");
    onPedidoHandled();
  }, [pedido, loading, filhas, onPedidoHandled]);

  const answer = async (filha: Filha, resposta: string) => {
    if (busy) return;
    setBusy(true);
    const { error } = await supabase.rpc("castigo_responder", { p_tentativa: tentativaId, p_filha: filha.id, p_resposta: resposta });
    if (error) toast.error(error.message);
    else setRespostas(prev => [...prev.filter(r => r.filha_id !== filha.id), { tentativa_id: tentativaId, filha_id: filha.id, resposta, finalizada_em: null, updated_at: new Date().toISOString() }]);
    setBusy(false);
  };

  const finish = async () => {
    if (!scope || busy) return;
    const all = filhas.filter(f => scope.includes(f.questao_original_id));
    if (all.some(f => !responseFor(f.id))) { toast.error("Responda as três filhas de cada questão antes de concluir."); return; }
    setBusy(true);
    const { error } = await supabase.rpc("castigo_finalizar", { p_tentativa: tentativaId, p_filhas: all.map(f => f.id) });
    if (error) { toast.error(error.message); await reload(); }
    else { toast.success("Castigo concluído!"); await reload(); setScope(null); }
    setBusy(false);
  };

  if (loading) return <p className="text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Carregando castigo...</p>;
  return <section className="space-y-4" id="castigo-do-simulado">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-xl font-black">Castigo do Simulado</h3><p className="text-sm text-muted-foreground">Pratique as três questões semelhantes de cada original. O progresso é salvo nesta tentativa.</p></div>
      {fullIds.length > 0 && <Button onClick={() => { setScope(fullIds); setIndex(0); }}>Realizar castigo completo</Button>}
    </div>
    {originais.map((o, i) => {
      const active = activeFor(o.id);
      const done = active.filter(f => !!responseFor(f.id)?.finalizada_em).length;
      return <Card key={o.id} className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1"><p className="text-sm font-bold">Questão {i + 1} {o.errou ? "· errada" : "· acertada"}</p><p className="text-xs text-muted-foreground line-clamp-1">{o.comando}</p></div>
        {active.length === 3 ? <><Badge variant="outline">{done}/3 concluídas</Badge><Button size="sm" variant="outline" onClick={() => { setScope([o.id]); setIndex(0); }}>{done === 3 ? "Revisar" : "Resolver filhas"}</Button></> : <p className="text-sm text-muted-foreground">Não há questões semelhantes disponíveis no momento</p>}
      </Card>;
    })}
    {scope && <div className="fixed inset-0 z-[70] bg-background overflow-y-auto p-4 md:p-10">
      <div className="max-w-2xl mx-auto space-y-6 pb-20">
        <Button variant="ghost" onClick={() => setScope(null)}><ArrowLeft className="h-4 w-4 mr-2" /> Voltar ao relatório</Button>
        <h2 className="text-2xl font-black">Castigo do Simulado</h2>
        {selected.length === 0 ? <Card className="p-6 space-y-3"><p>As filhas selecionadas já foram concluídas.</p><Button onClick={() => setScope(null)}>Voltar</Button></Card> : <>
          <div className="space-y-2"><p className="text-sm text-muted-foreground">Filha {index + 1} de {selected.length} · Questão original {originais.findIndex(o => o.id === current.questao_original_id) + 1} · versão {current.versao}</p><NeonProgressBar value={index + 1} total={selected.length} className="h-2" /></div>
          <Card className="paper-card rounded-[2rem] p-6 md:p-10 space-y-6"><p className="text-xl md:text-2xl leading-relaxed font-medium whitespace-pre-wrap text-slate-800">{current.questao}</p>
            <div className="space-y-3">{(["a", "b", "c", "d", "e"] as const).map(letter => <button key={letter} disabled={busy} onClick={() => answer(current, letter.toUpperCase())} className={`flex items-start gap-4 w-full text-left rounded-[1.5rem] border-2 p-5 md:p-6 font-bold transition-all ${responseFor(current.id)?.resposta === letter.toUpperCase() ? "border-accent bg-accent text-accent-foreground shadow-lg" : "border-slate-100 bg-white text-slate-800 hover:border-accent/30"}`}><span className="rounded-lg bg-slate-100 text-slate-800 px-3 py-1 font-black">{letter.toUpperCase()}</span>{current[`alt_${letter}`]}</button>)}</div>
            <p className="text-xs text-muted-foreground">A justificativa será mostrada depois de concluir o conjunto.</p>
          </Card>
          <div className="flex flex-wrap gap-2"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>Anterior</Button><Button variant="outline" disabled={index === selected.length - 1} onClick={() => setIndex(index + 1)}>Próxima</Button><Button disabled={busy || selected.some(f => !responseFor(f.id))} onClick={finish}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Concluir castigo"}</Button></div>
        </>}
        {filhas.filter(f => scope.includes(f.questao_original_id) && !!responseFor(f.id)?.finalizada_em).map(f => <Card key={f.id} className="p-4 space-y-2"><p className="font-semibold">Filha {f.posicao} · Questão {originais.findIndex(o => o.id === f.questao_original_id) + 1}</p><p className="text-sm">{f.questao}</p><p className="text-sm">Sua resposta: {responseFor(f.id)?.resposta} · Gabarito: {f.gabarito}</p><p className="text-sm whitespace-pre-wrap">{f.justificativa}</p></Card>)}
      </div>
    </div>}
  </section>;
}

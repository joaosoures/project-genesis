import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Loader2, CheckCircle2, BarChart3, Flame, Zap, Clock, FileDown, MousePointer2, ChevronDown, ChevronUp, AlertCircle, Trash2 } from "lucide-react";
import { ESPECIALIDADE_LABEL, type Especialidade, type CardRow } from "@/lib/oq";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { AdminEditCardBtn } from "@/components/oq/AdminEditCardBtn";
import { OqCurationPanel } from "@/components/admin/OqCurationPanel";

type Aula = { id: string; nome: string; ordem_incidencia: number; especialidade: Especialidade; link_aula: string | null; tier: number; resumo_html_url: string | null };
type AulaStat = { aula_id: string; nome: string; especialidade: string; total: number; abcde: number; lacuna: number; oq_falta: number; sem_explicacao: number; irregularidades: number };

export default function AdminGerarAulas() {
  const { isAdmin } = useAuth();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [stats, setStats] = useState<AulaStat[]>([]);
  const [expandedAulaId, setExpandedAulaId] = useState<string | null>(null);
  const [aulaDetails, setAulaDetails] = useState<CardRow[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [selectedAulaId, setSelectedAulaId] = useState("");
  const [oldCards, setOldCards] = useState<CardRow[]>([]);
  const [loadingOldCards, setLoadingOldCards] = useState(false);
  const [tab, setTab] = useState("aulas");
  const [lastAulaUsed, setLastAulaUsed] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => {
    document.title = "Gerar OQs a partir de Aulas";
    void loadAulas();
    if (isAdmin) void loadStats();
    const saved = localStorage.getItem("last_aula_used");
    if (saved) {
      try { setLastAulaUsed(JSON.parse(saved)); } catch { localStorage.removeItem("last_aula_used"); }
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedAulaId) void loadOldCards(selectedAulaId);
    else setOldCards([]);
  }, [selectedAulaId]);

  async function loadAulas() {
    const { data, error } = await supabase.from("materiais").select("id, nome, ordem_incidencia, especialidade, link_1, tipo_1, tier, resumo_html_url").eq("tipo_1", "PDF").not("link_1", "is", null).order("ordem_incidencia", { ascending: true });
    if (error) return toast.error("Erro ao carregar aulas: " + error.message);
    setAulas((data || []).map((material: any) => ({ id: material.id, nome: material.nome, ordem_incidencia: material.ordem_incidencia, especialidade: material.especialidade as Especialidade, link_aula: material.link_1, tier: material.tier || 3, resumo_html_url: material.resumo_html_url })));
  }

  async function loadStats() {
    const { data, error } = await supabase.rpc("aulas_stats");
    if (error) { toast.error("Erro ao atualizar estatísticas: " + error.message); return; }
    setStats((data || []) as AulaStat[]);
  }

  async function loadOldCards(aulaId: string) {
    setLoadingOldCards(true);
    const { data, error } = await supabase.from("cards").select("*").eq("aula_id", aulaId).order("criado_em", { ascending: true });
    if (error) toast.error("Não foi possível carregar OQs desta aula: " + error.message);
    setOldCards((data || []) as unknown as CardRow[]);
    setLoadingOldCards(false);
  }

  async function loadAulaDetails(aulaId: string, opts?: { force?: boolean }) {
    if (!aulaId) return;
    if (!opts?.force && expandedAulaId === aulaId) { setExpandedAulaId(null); return; }
    setExpandedAulaId(aulaId); setLoadingDetails(true);
    if (!opts?.force) setAulaDetails([]);
    try {
      const { data, error } = await supabase.from("cards").select("*").eq("aula_id", aulaId);
      if (error) throw error;
      setAulaDetails((data || []) as unknown as CardRow[]);
    } catch (error) {
      toast.error("Erro ao carregar detalhes: " + (error instanceof Error ? error.message : "erro desconhecido"));
      setExpandedAulaId(null);
    } finally { setLoadingDetails(false); }
  }

  async function deleteCard(cardId: string, aulaId: string) {
    if (!window.confirm("Excluir este OQ permanentemente? Esta ação não pode ser desfeita.")) return;
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    if (error) { toast.error("Erro ao excluir OQ: " + error.message); return; }
    toast.success("OQ excluído permanentemente.");
    await Promise.all([loadStats(), loadAulaDetails(aulaId, { force: true }), selectedAulaId === aulaId ? loadOldCards(aulaId) : Promise.resolve()]);
  }

  async function refreshAfterCommit() {
    await Promise.all([loadStats(), loadAulas(), loadOldCards(selectedAulaId)]);
    if (expandedAulaId === selectedAulaId) await loadAulaDetails(selectedAulaId, { force: true });
    const current = aulas.find(aula => aula.id === selectedAulaId);
    if (current) {
      const value = { id: current.id, nome: current.nome };
      localStorage.setItem("last_aula_used", JSON.stringify(value));
      setLastAulaUsed(value);
    }
  }

  if (!isAdmin) return <div translate="no" className="notranslate p-12 text-center text-muted-foreground">Acesso restrito.</div>;
  const selectedAula = aulas.find(aula => aula.id === selectedAulaId);

  return <div translate="no" className="notranslate mx-auto max-w-6xl space-y-8 px-4 py-10 pb-32">
    <header><h1 className="flex items-center gap-3 text-3xl font-black tracking-tighter"><GraduationCap className="h-7 w-7 text-accent"/><span>Gerar OQs a partir de Aulas</span></h1><p className="mt-2 text-sm text-muted-foreground">Selecione a aula, importe OQs em staging e confirme a curadoria quando estiver pronto.</p></header>
    {lastAulaUsed && <div className="flex items-center gap-3 rounded-xl border border-accent/20 bg-accent/5 p-3"><div className="rounded-lg bg-accent/10 p-1.5"><Clock className="h-4 w-4 text-accent"/></div><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Última aula utilizada</p><p className="truncate text-sm font-bold">{lastAulaUsed.nome}</p></div><Button variant="outline" size="sm" className="h-8 gap-2 border-accent/30 text-[10px] font-black uppercase tracking-wider" onClick={() => { setSelectedAulaId(lastAulaUsed.id); setTab("curadoria"); }}>Usar novamente <MousePointer2 className="h-3 w-3"/></Button></div>}

    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList className="grid w-full grid-cols-3 rounded-xl"><TabsTrigger value="aulas" className="text-xs font-bold">1. Aula</TabsTrigger><TabsTrigger value="curadoria" className="text-xs font-bold">2. Curadoria</TabsTrigger><TabsTrigger value="stats" className="text-xs font-bold">3. Estatísticas</TabsTrigger></TabsList>

      <TabsContent value="aulas" className="mt-6 space-y-4">
        {selectedAula && <Card className="flex items-center justify-between gap-3 border-accent/30 bg-accent/5 p-4"><div className="text-sm"><span className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground">Selecionada</span><span className="font-bold">{selectedAula.nome}</span></div><Button size="sm" onClick={() => setTab("curadoria")} className="gap-2 font-black">Próximo: Curadoria <MousePointer2 className="h-3.5 w-3.5"/></Button></Card>}
        <div className="grid gap-3">{aulas.map(aula => {
          const stat = stats.find(item => item.aula_id === aula.id);
          const tierInfo = aula.tier === 1 ? { label: "Alta", color: "text-red-500", bg: "bg-red-500/10", icon: <Flame className="h-3 w-3"/>, border: "border-red-500/30" } : aula.tier === 2 ? { label: "Média", color: "text-amber-500", bg: "bg-amber-500/10", icon: <Zap className="h-3 w-3"/>, border: "border-amber-500/20" } : { label: "Baixa", color: "text-blue-500", bg: "bg-blue-500/10", icon: <Clock className="h-3 w-3"/>, border: "border-blue-500/10" };
          return <div key={aula.id} className={cn("flex flex-col items-start gap-4 rounded-2xl border p-4 transition-all md:flex-row md:items-center", selectedAulaId === aula.id ? "border-accent bg-accent/5 ring-1 ring-accent/20" : "bg-card hover:bg-muted/30", tierInfo.border)}><div className="min-w-0 flex-1 space-y-2"><div className="flex flex-wrap items-center gap-2"><Badge variant="outline" className={cn("flex h-5 items-center gap-1 px-1.5 text-[9px] font-black uppercase", tierInfo.bg, tierInfo.color, tierInfo.border)}>{tierInfo.icon} {tierInfo.label}</Badge><span className="text-[10px] font-bold uppercase text-muted-foreground">{ESPECIALIDADE_LABEL[aula.especialidade]}</span></div><div className="text-base font-bold">{aula.nome}</div><div className="flex flex-wrap gap-1.5"><button type="button" disabled={!stat?.total} onClick={() => { if (!stat?.total) return; setTab("stats"); void loadAulaDetails(aula.id); }} className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-black text-emerald-500 disabled:cursor-not-allowed disabled:opacity-40">TOTAL: {stat?.total || 0}</button><span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-black text-blue-500">ABCDE: {stat?.abcde || 0}</span><span className="rounded-full border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-black text-purple-500">LACUNA: {stat?.lacuna || 0}</span><span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-0.5 text-[10px] font-black text-orange-500">OQ FALTA: {stat?.oq_falta || 0}</span></div></div><div className="flex w-full items-center gap-2 md:w-auto">{aula.link_aula && <Button size="sm" variant="outline" asChild className="h-9 gap-2 text-xs font-bold"><a href={aula.link_aula} target="_blank" rel="noreferrer"><FileDown className="h-3.5 w-3.5"/>PDF</a></Button>}<Button size="sm" onClick={() => setSelectedAulaId(aula.id)} variant={selectedAulaId === aula.id ? "default" : "secondary"} className="h-9 gap-2 px-4 text-xs font-black">{selectedAulaId === aula.id ? <CheckCircle2 className="h-3.5 w-3.5"/> : <MousePointer2 className="h-3.5 w-3.5"/>}{selectedAulaId === aula.id ? "Selecionada" : "Selecionar"}</Button></div></div>;
        })}</div>
      </TabsContent>

      <TabsContent value="curadoria" className="mt-6 space-y-4">{loadingOldCards && selectedAulaId ? <Card className="grid place-items-center p-12"><Loader2 className="h-6 w-6 animate-spin text-accent"/></Card> : <OqCurationPanel aula={selectedAula} oldCards={oldCards} onCommitted={refreshAfterCommit}/>}</TabsContent>

      <TabsContent value="stats" className="mt-6 space-y-4"><Card className="p-6"><h2 className="mb-4 flex items-center gap-2 font-bold"><BarChart3 className="h-4 w-4"/>Qualidade dos OQs por aula</h2><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b text-[10px] font-black uppercase tracking-widest text-muted-foreground"><tr><th className="w-8"/><th className="py-2 text-left">Aula</th><th className="py-2 text-left">Especialidade</th><th className="py-2 text-center">Total de OQs</th><th className="py-2 text-center">Qualidade Geral</th><th className="py-2 text-right">Status</th></tr></thead><tbody className="divide-y divide-border/40">{stats.map(stat => {
          const hasItems = stat.total > 0; const perfect = hasItems && stat.sem_explicacao === 0 && stat.irregularidades === 0; const expanded = expandedAulaId === stat.aula_id;
          const statusLabel = !hasItems ? "Nada gerado ainda" : perfect ? "Todos os OQs gerados com qualidade" : [stat.sem_explicacao > 0 ? `${stat.sem_explicacao} sem explicação` : "", stat.irregularidades > 0 ? `${stat.irregularidades} irregularidades` : ""].filter(Boolean).join(" / ");
          return <React.Fragment key={stat.aula_id}><tr className={cn("transition-colors", hasItems && "cursor-pointer hover:bg-muted/30")} onClick={() => hasItems && void loadAulaDetails(stat.aula_id)}><td className="py-3">{!perfect && hasItems && (expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground"/> : <ChevronDown className="h-4 w-4 text-muted-foreground"/>)}</td><td className="py-3 font-bold">{stat.nome}</td><td className="py-3 text-muted-foreground">{ESPECIALIDADE_LABEL[stat.especialidade as Especialidade] || stat.especialidade}</td><td className="py-3 text-center"><button type="button" disabled={!hasItems} onClick={event => { event.stopPropagation(); if (hasItems) void loadAulaDetails(stat.aula_id); }} className="font-black text-emerald-600 hover:underline disabled:opacity-40">{stat.total}</button></td><td className="py-3 text-center">{!hasItems ? <span className="text-[10px] font-bold uppercase text-muted-foreground opacity-40">N/A</span> : perfect ? <Badge className="border-emerald-500/20 bg-emerald-500/10 text-[9px] font-black uppercase text-emerald-500">Excelente</Badge> : <Badge variant="outline" className="border-amber-500/20 text-[9px] font-black uppercase text-amber-500">Atenção</Badge>}</td><td className={cn("py-3 text-right text-xs font-bold", perfect ? "text-emerald-500" : hasItems ? "text-amber-500" : "text-muted-foreground")}>{statusLabel}</td></tr>{expanded && <tr><td colSpan={6} className="px-4 py-0"><div className="mb-4 space-y-3 rounded-b-xl border-x border-b bg-muted/20 p-4"><div className="mb-2 flex items-center justify-between border-b border-border/40 pb-2"><h3 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider"><AlertCircle className="h-3.5 w-3.5 text-amber-500"/>OQs desta aula</h3><span className="text-[10px] font-medium text-muted-foreground">{aulaDetails.length} questões encontradas</span></div>{loadingDetails ? <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-accent"/></div> : !aulaDetails.length ? <div className="py-4 text-center text-xs text-muted-foreground">Nenhum OQ encontrado para esta aula.</div> : <div className="grid max-h-60 gap-2 overflow-y-auto pr-2">{aulaDetails.map((card, index) => {
            const noExplanation = !card.explicacao || ["", "Importado via planilha.", "Explicação não disponível."].includes(card.explicacao.trim()); const irregular = !card.comando?.trim() || !card.modo;
            return <div key={card.id || index} className="space-y-2 rounded-lg border bg-card p-3"><div className="flex items-start justify-between gap-4"><p className="flex-1 text-xs font-bold leading-tight">{card.comando || <span className="italic text-red-500">[COMANDO VAZIO]</span>}</p><div className="flex shrink-0 items-center gap-2"><div className="flex flex-col items-end gap-1">{noExplanation && <Badge variant="secondary" className="h-4 border-red-500/20 bg-red-500/10 text-[8px] text-red-500">SEM EXPLICAÇÃO</Badge>}{irregular && <Badge variant="secondary" className="h-4 border-amber-500/20 bg-amber-500/10 text-[8px] text-amber-500">IRREGULAR</Badge>}</div><div onClick={event => event.stopPropagation()} className="flex items-center gap-1"><AdminEditCardBtn cardId={card.id} onSaved={() => { void loadStats(); if (card.aula_id) void loadAulaDetails(card.aula_id, { force: true }); }}/><button type="button" onClick={() => void deleteCard(card.id, stat.aula_id)} title="Excluir OQ permanentemente" className="grid h-10 w-10 place-items-center rounded-full transition hover:bg-red-500/10"><Trash2 className="h-4 w-4 text-red-500"/></button></div></div></div><div className="mt-1 line-clamp-1 border-t pt-2 text-[10px] text-muted-foreground"><strong>ID:</strong> {card.id.slice(0, 8)}... • <strong>Modo:</strong> {card.modo || "n/a"}</div></div>;
          })}</div>}</div></td></tr>}</React.Fragment>;
        })}</tbody></table></div></Card></TabsContent>
    </Tabs>
  </div>;
}

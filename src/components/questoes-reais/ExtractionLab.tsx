import { useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ExternalLink, LockKeyhole, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import HistoryMiniCard from "./HistoryMiniCard";
import { LaboratorioSession, QuestaoRealItem, extrairOQs } from "@/lib/questoes-reais";

export default function ExtractionLab({ session, canExtract, admin, onBack }: { session: LaboratorioSession; canExtract: boolean; admin: boolean; onBack: () => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [orientacoes, setOrientacoes] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, number>>({});
  const [success, setSuccess] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    if (!canExtract) return;
    const load = async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const ids = session.itens.filter((item) => item.confirmado_em).map((item) => item.id);
      const { data } = await supabase.rpc("questoes_reais_oqs_pendentes", { p_item_ids: ids });
      setPending(Object.fromEntries((data ?? []).map((row: { item_id: string; pending_count: number }) => [row.item_id, Number(row.pending_count)])));
    };
    void load();
  }, [canExtract, session.itens]);
  const extract = async (item: QuestaoRealItem) => {
    const quantity = counts[item.id] ?? 1;
    setBusy(item.id);
    setSuccess((current) => ({ ...current, [item.id]: false }));
    try {
      const result = await extrairOQs(item.id, quantity, orientacoes[item.id] ?? "");
      setPending((current) => ({ ...current, [item.id]: result.pending_count }));
      setSuccess((current) => ({ ...current, [item.id]: true }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível extrair. Tente novamente.");
    } finally { setBusy(null); }
  };
  const answered = session.itens.filter((item) => item.confirmado_em);
  return <div className="mx-auto max-w-3xl space-y-6 px-4 py-8"><header className="flex items-start justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-accent">Laboratório de OQs</p><h1 className="text-2xl font-black">{session.sessao.status === "pulada" ? "Castigo pulado" : "Sessão encerrada"}</h1><p className="text-sm text-muted-foreground">{answered.length} questões respondidas · os OQs extraídos aguardam revisão humana.</p></div><Button variant="outline" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" />Voltar</Button></header>{!canExtract && <Card className="border-amber-300 bg-amber-50/60"><CardContent className="flex gap-3 p-4 text-sm"><LockKeyhole className="h-5 w-5 shrink-0" /><span>Seu plano Prata permite revisar o histórico, mas a extração de OQs exige um plano elegível.</span></CardContent></Card>}<div className="space-y-4">{answered.map((item) => <HistoryMiniCard key={item.id} item={item}><div className="space-y-3 border-t pt-3">{canExtract && <><div className="flex items-center justify-between text-xs font-semibold text-muted-foreground"><span>OQs pendentes na curadoria</span><span className="rounded-full bg-accent/10 px-2 py-1 font-black text-accent">{pending[item.id] ?? 0}</span></div><label className="text-xs font-bold text-muted-foreground">O que você gostou ou quer aprofundar nesta questão?</label><Textarea value={orientacoes[item.id] ?? ""} onChange={(event) => setOrientacoes((current) => ({ ...current, [item.id]: event.target.value.slice(0, 1000) }))} placeholder="Orientação opcional para priorizar a extração" className="min-h-20 rounded-xl" /><div className="flex items-center gap-3"><Slider aria-label="Quantidade de OQs" min={1} max={3} step={1} value={[counts[item.id] ?? 1]} onValueChange={([value]) => setCounts((current) => ({ ...current, [item.id]: value }))} /><span className="w-8 text-center font-bold">{counts[item.id] ?? 1}</span><Button size="sm" onClick={() => void extract(item)} disabled={busy !== null}>{busy === item.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}Extrair</Button></div>{success[item.id] && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800"><div className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /><span>OQs criados com sucesso e aguardam aprovação na lista de OQs em “Gerar OQs”.</span></div><p className="mt-1 pl-6 font-semibold">Agora há {pending[item.id]} OQ(s) pendente(s) para esta questão.</p><Link to="/gerar-oqs" className="mt-2 inline-flex items-center pl-6 text-xs font-bold underline">Abrir Gerar OQs <ExternalLink className="ml-1 h-3 w-3" /></Link></div>}</>}</div></HistoryMiniCard>)}</div></div>;
}

import { useEffect, useMemo, useState } from "react";
import { Check, Clipboard, FileText, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { OqJsonImport } from "@/components/admin/OqJsonImport";
import { OqStagingCard, stagingToDisplay, type OqJudgeResult } from "@/components/admin/OqStagingCard";
import { sanitizeHtmlToCleanText } from "@/lib/sanitizeHtmlToCleanText";
import { toCardImportPayload, type ImportedOq } from "@/lib/oq-import";
import { ESPECIALIDADE_LABEL, type CardRow, type Especialidade } from "@/lib/oq";
import { Badge } from "@/components/ui/badge";
import { getJudgeSpecialtyCode } from "../../../supabase/functions/_shared/oqCuratorJudgePrompt";

type Aula = { id: string; nome: string; especialidade: Especialidade; resumo_html_url: string | null };
type Staged = { id: string; oq: ImportedOq };

type Props = { aula?: Aula; oldCards: CardRow[]; onCommitted: () => Promise<void> };

export function OqCurationPanel({ aula, oldCards, onCommitted }: Props) {
  const [staged, setStaged] = useState<Staged[]>([]);
  const [manualExcluded, setManualExcluded] = useState<Set<string>>(new Set());
  const [manualRestored, setManualRestored] = useState<Set<string>>(new Set());
  const [aiExcluded, setAiExcluded] = useState<Set<string>>(new Set());
  const [verdicts, setVerdicts] = useState<Record<string, OqJudgeResult>>({});
  const [model, setModel] = useState("openai/gpt-6-luna");
  const [judging, setJudging] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [htmlOpen, setHtmlOpen] = useState(false);
  const [htmlText, setHtmlText] = useState("");
  const [htmlLoading, setHtmlLoading] = useState(false);
  const [htmlError, setHtmlError] = useState("");
  const [copied, setCopied] = useState(false);
  const excluded = useMemo(() => new Set([...manualExcluded, ...aiExcluded].filter(id => !manualRestored.has(id))), [manualExcluded, manualRestored, aiExcluded]);
  const keptOld = oldCards.filter(card => !excluded.has(card.id));
  const keptNew = staged.filter(item => !excluded.has(item.id));
  const iaById = verdicts;
  const counts = { old: oldCards.length, delete: excluded.size, add: keptNew.length, total: keptOld.length + keptNew.length };
  const specialtyCode = getJudgeSpecialtyCode(`${aula?.especialidade ?? ""}|${aula?.nome ?? ""}`);
  const specialtyLensLabel: Record<string, string> = { CM: "Clínica Médica", CG: "Cirurgia Geral", GO: "Ginecologia e Obstetrícia", PED: "Pediatria", PREV: "Medicina Preventiva, SUS e APS" };

  useEffect(() => {
    setStaged([]); setManualExcluded(new Set()); setManualRestored(new Set()); setAiExcluded(new Set()); setVerdicts({}); setHtmlText(""); setHtmlError("");
  }, [aula?.id]);

  const loadStage = (items: ImportedOq[]) => {
    setStaged(items.map(oq => ({ id: crypto.randomUUID(), oq })));
    setManualExcluded(new Set()); setManualRestored(new Set()); setAiExcluded(new Set()); setVerdicts({});
  };

  const toggle = (id: string) => {
    if (excluded.has(id)) {
      setManualRestored(current => new Set(current).add(id));
      setManualExcluded(current => { const next = new Set(current); next.delete(id); return next; });
      setAiExcluded(current => { const next = new Set(current); next.delete(id); return next; });
    } else {
      setManualRestored(current => { const next = new Set(current); next.delete(id); return next; });
      setManualExcluded(current => new Set(current).add(id));
    }
  };

  const loadHtml = async () => {
    if (!aula?.resumo_html_url) return;
    setHtmlLoading(true); setHtmlError(""); setHtmlOpen(true); setHtmlText("");
    try {
      const url = new URL(aula.resumo_html_url);
      url.searchParams.set("_", String(Date.now()));
      const response = await fetch(url.toString(), { cache: "no-store" });
      if (!response.ok) throw new Error(`Falha ao buscar HTML (${response.status}).`);
      const html = await response.text();
      const clean = sanitizeHtmlToCleanText(html);
      if (!clean) throw new Error("O HTML atualizado está vazio.");
      setHtmlText(clean);
    } catch (error) {
      setHtmlError(error instanceof Error ? error.message : "Não foi possível buscar o HTML atualizado.");
    } finally { setHtmlLoading(false); }
  };

  const judge = async () => {
    if (!aula || staged.length === 0) return;
    setJudging(true);
    try {
      const oldOqs = oldCards.map(card => ({ id: card.id, modo: card.modo, comando: card.comando, explicacao: card.explicacao, respostas: [card.alternativa_a, card.alternativa_b, card.alternativa_c, card.alternativa_d, card.alternativa_e, card.info_1, card.info_2, card.info_3, card.info_4, card.info_5].filter(Boolean), gabarito: card.alternativa_correta }));
      const newOqs = staged.map(({ id, oq }) => ({ temp_id: id, modo: oq.modo, comando: oq.comando, explicacao: oq.explicacao, respostas: oq.respostas, variacoes: oq.variacoes, gabarito: oq.gabarito }));
      const { data, error } = await supabase.functions.invoke("curar-oqs-aula", { body: { model: model.trim(), tituloTema: aula.nome, especialidade: ESPECIALIDADE_LABEL[aula.especialidade], oldOqs, newOqs } });
      if (error) throw new Error(error.message || "Falha ao chamar curadoria IA.");
      if (data?.error) throw new Error(data.error);
      const receivedOld = data?.vereditos_antigos;
      const receivedNew = data?.vereditos_novos;
      if (!Array.isArray(receivedOld) || receivedOld.length !== oldCards.length || !Array.isArray(receivedNew) || receivedNew.length !== staged.length) throw new Error("A resposta não contém vereditos completos.");
      const oldIds = new Set<string>();
      for (const item of receivedOld) {
        if (!item || typeof item.id !== "string" || !oldCards.some(card => card.id === item.id) || oldIds.has(item.id) || !["MANTER", "EXCLUIR"].includes(item.decisao) || typeof item.motivo !== "string") throw new Error("A IA retornou vereditos inválidos para OQs antigos.");
        oldIds.add(item.id);
      }
      if (oldIds.size !== oldCards.length) throw new Error("Vereditos antigos incompletos ou repetidos.");
      const nextVerdicts: Record<string, OqJudgeResult> = {};
      for (const item of receivedNew) {
        if (!item || typeof item.temp_id !== "string" || !staged.some(stage => stage.id === item.temp_id) || nextVerdicts[item.temp_id] || !["MANTER", "EXCLUIR"].includes(item.decisao) || typeof item.motivo !== "string") throw new Error("A IA retornou IDs ou decisões inválidos para OQs novos.");
        nextVerdicts[item.temp_id] = { decision: item.decisao === "MANTER" ? "keep" : "delete", reason: item.motivo };
      }
      if (Object.keys(nextVerdicts).length !== staged.length) throw new Error("Vereditos novos incompletos ou repetidos.");
      const aiExcludedIds = new Set(Object.entries(nextVerdicts).filter(([, verdict]) => verdict.decision === "delete").map(([id]) => id));
      const allVerdicts = { ...nextVerdicts };
      receivedOld.forEach(item => {
        const decision = item.decisao === "MANTER" ? "keep" : "delete";
        allVerdicts[item.id] = { decision, reason: item.motivo };
        if (decision === "delete") aiExcludedIds.add(item.id);
      });
      setAiExcluded(aiExcludedIds);
      setVerdicts(allVerdicts);
      toast.success("Sugestões da IA aplicadas ao staging. Revise antes de confirmar.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha na curadoria IA.");
    } finally { setJudging(false); }
  };

  const undoAi = () => {
    setAiExcluded(new Set());
    setVerdicts({});
  };

  const commit = async () => {
    if (!aula) return;
    setCommitting(true);
    try {
      const payload = keptNew.map(item => toCardImportPayload(item.oq, aula.id));
      const { data, error } = await supabase.rpc("admin_commit_oq_curation", { p_aula_id: aula.id, p_delete_ids: Array.from(excluded).filter(id => oldCards.some(card => card.id === id)), p_new_cards: payload as never });
      if (error) throw error;
      if (!data || typeof data !== "object" || Number((data as Record<string, unknown>).deleted) !== counts.delete || Number((data as Record<string, unknown>).inserted) !== counts.add) throw new Error("O servidor confirmou contagens diferentes das exibidas; staging preservado para revisão.");
      setConfirmOpen(false); setStaged([]); setManualExcluded(new Set()); setManualRestored(new Set()); setAiExcluded(new Set()); setVerdicts({});
      toast.success("Curadoria confirmada e OQs atualizados.");
      await onCommitted();
    } catch (error) {
      toast.error(`Não foi possível confirmar a curadoria: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally { setCommitting(false); }
  };

  return <div className="space-y-5 pb-28">
    <Card className="flex min-w-0 flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Aula ativa</p><p className="truncate font-bold">{aula?.nome ?? "Selecione uma aula na Aba 1"}</p>{aula && <p className="text-xs text-muted-foreground">{aula.especialidade.replace(/_/g, " ")}</p>}</div><Button variant="outline" disabled={!aula?.resumo_html_url || htmlLoading} onClick={loadHtml}><FileText className="mr-2 h-4 w-4"/>{htmlLoading ? "Buscando HTML..." : "Ver / Copiar HTML Limpo"}</Button>{!aula?.resumo_html_url && <span className="text-xs text-amber-600">HTML atualizado indisponível; não será usado o PDF legado.</span>}</Card>

    <OqJsonImport specialty={aula?.especialidade} onLoad={loadStage}/>

    <div className="grid min-w-0 gap-4 lg:grid-cols-2">
      <section className="min-w-0 space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold">OQs existentes</h3><span className="text-xs text-muted-foreground">{oldCards.length} · {keptOld.length} mantidos</span></div>{oldCards.length ? <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">{oldCards.map(card => <OqStagingCard key={card.id} item={card} title="Banco" excluded={excluded.has(card.id)} judge={iaById[card.id]} onToggle={() => toggle(card.id)}/>)}</div> : <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum OQ existente nesta aula.</Card>}</section>
      <section className="min-w-0 space-y-3"><div className="flex items-center justify-between"><h3 className="font-bold">Novos OQs em staging</h3><span className="text-xs text-muted-foreground">{staged.length} · {keptNew.length} para inserir</span></div>{staged.length ? <div className="max-h-[65vh] space-y-3 overflow-y-auto pr-1">{staged.map(({ id, oq }) => <OqStagingCard key={id} item={stagingToDisplay(oq, id)} title="Temporário" excluded={excluded.has(id)} judge={iaById[id]} onToggle={() => toggle(id)}/>)}</div> : <Card className="p-6 text-center text-sm text-muted-foreground">Carregue um JSON para comparar OQs novos com os existentes.</Card>}</section>
    </div>

    <Card className="space-y-4 p-5"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-accent"/><div><h3 className="font-bold">4. Curadoria opcional com IA</h3><p className="text-xs text-muted-foreground">A IA sugere; nenhuma alteração é gravada sem sua confirmação.</p></div></div><div className="flex flex-col gap-2 sm:flex-row sm:items-center"><Input value={model} onChange={event => setModel(event.target.value)} placeholder="provider/model" aria-label="Modelo OpenRouter"/><Button onClick={judge} disabled={!aula || !staged.length || judging || committing}>{judging ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Sparkles className="mr-2 h-4 w-4"/>}{judging ? "Analisando..." : "Curar OQs com IA"}</Button><Badge variant="secondary" className="w-fit whitespace-nowrap">Lente ativa: {specialtyLensLabel[specialtyCode]}</Badge><Button variant="outline" onClick={undoAi} disabled={!Object.keys(verdicts).length}>Desfazer marcações da IA</Button></div><p className="text-[11px] text-muted-foreground">As sugestões aparecem nos cards e podem ser sobrescritas manualmente.</p></Card>

    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-3 backdrop-blur sm:px-6"><div className="mx-auto flex max-w-6xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs font-semibold">Manter {keptOld.length} antigos · Excluir {oldCards.length - keptOld.length} antigos · Inserir {keptNew.length} novos · Total final {counts.total}</p><Button onClick={() => setConfirmOpen(true)} disabled={!aula || committing || (!excluded.size && !keptNew.length)}>Revisar e confirmar</Button></div></div>

    <Dialog open={htmlOpen} onOpenChange={setHtmlOpen}><DialogContent className="flex max-h-[90vh] w-[95vw] max-w-4xl flex-col overflow-hidden"><DialogHeader><DialogTitle>HTML limpo · {htmlText.length.toLocaleString("pt-BR")} caracteres</DialogTitle><DialogDescription>Estimativa aproximada: {Math.ceil(htmlText.length / 4).toLocaleString("pt-BR")} tokens.</DialogDescription></DialogHeader>{htmlError ? <p role="alert" className="rounded-lg bg-destructive/5 p-3 text-sm text-destructive">{htmlError}</p> : htmlLoading ? <div className="grid min-h-48 place-items-center"><Loader2 className="h-6 w-6 animate-spin"/></div> : <pre className="min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/40 p-4 font-mono text-xs">{htmlText}</pre>}<DialogFooter><Button variant="outline" onClick={() => setHtmlOpen(false)}>Fechar</Button><Button disabled={!htmlText} onClick={async () => { await navigator.clipboard.writeText(htmlText); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}><Clipboard className="mr-2 h-4 w-4"/>{copied ? "Copiado!" : "Copiar"}</Button></DialogFooter></DialogContent></Dialog>

    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Confirmar curadoria desta aula?</AlertDialogTitle><AlertDialogDescription>Esta operação será aplicada atomicamente. Serão mantidos {keptOld.length} OQs antigos, excluídos {oldCards.length - keptOld.length} antigos, inseridos {keptNew.length} novos e o total final será {counts.total}. A IA não altera o banco por conta própria.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={committing}>Voltar</AlertDialogCancel><AlertDialogAction disabled={committing} onClick={event => { event.preventDefault(); void commit(); }}>{committing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4"/>}Confirmar commit</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
  </div>;
}

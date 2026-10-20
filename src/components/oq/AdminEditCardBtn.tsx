import { useEffect, useState } from "react";
import { Loader2, Pencil, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TactileButton from "@/components/console/TactileButton";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";

type CardRow = Record<string, any>;
const letters = ["a", "b", "c", "d", "e"] as const;

function makePatch(card: CardRow, result: unknown): Partial<CardRow> {
  if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("Resposta da IA inválida.");
  const value = result as Record<string, any>;
  if (Object.keys(value).sort().join("|") !== ["alternativas", "comando", "explicacao", "variações"].sort().join("|")) throw new Error("Resposta da IA incompleta.");
  if (typeof value.comando !== "string" || !value.comando.trim() || typeof value.explicacao !== "string" || !value.explicacao.trim()) throw new Error("Comando ou explicação inválidos.");
  if (!value.alternativas || typeof value.alternativas !== "object") throw new Error("Conteúdo pedagógico inválido.");
  const patch: Partial<CardRow> = { comando: value.comando, explicacao: value.explicacao };

  if (card.modo === "abcde") {
    if (value["variações"] !== null && (!value["variações"] || Object.keys(value["variações"]).length !== 0)) throw new Error("Variações ABCDE inválidas.");
    if (!letters.every((letter) => typeof value.alternativas[letter] === "string" && value.alternativas[letter].trim()) || !/^[A-E]$/i.test(value.alternativas.correta ?? "")) throw new Error("Alternativas ABCDE inválidas.");
    for (const letter of letters) patch[`alternativa_${letter}`] = value.alternativas[letter];
    patch.alternativa_correta = value.alternativas.correta.toUpperCase();
    return patch;
  }

  if (card.modo === "lacuna") {
    const vars = value["variações"];
    if (typeof value.alternativas.resposta !== "string" || !value.alternativas.resposta.trim() || !vars || typeof vars.var_1 !== "string" || vars.var_1.split(";").filter((item: string) => item.trim()).length < 3) throw new Error("Resposta de lacuna inválida.");
    patch.info_1 = value.alternativas.resposta;
    patch.var_1 = vars.var_1;
    return patch;
  }

  const itemCount = Array.from({ length: 5 }, (_, index) => index + 1).filter((index) => String(card[`info_${index}`] ?? "").trim()).length;
  const items = value.alternativas.itens;
  const vars = value["variações"];
  if (!Array.isArray(items) || items.length !== itemCount || !vars || typeof vars !== "object") throw new Error("Quantidade de itens do OQ Falta incompatível.");
  for (let index = 0; index < itemCount; index += 1) {
    if (!items[index] || typeof items[index].resposta !== "string" || !items[index].resposta.trim()) throw new Error("Item do OQ Falta inválido.");
    const variations = vars[`var_${index + 1}`];
    if (typeof variations !== "string" || variations.split(";").filter((item: string) => item.trim()).length < 3) throw new Error("Variações do OQ Falta inválidas.");
    patch[`info_${index + 1}`] = items[index].resposta;
    patch[`var_${index + 1}`] = variations;
  }
  return patch;
}

export function AdminEditCardBtn({ cardId, onSaved }: { cardId: string; onSaved?: (card: any) => void }) {
  const { isAdmin, isEditor } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [improving, setImproving] = useState(false);
  const [improvementComment, setImprovementComment] = useState("");
  const [card, setCard] = useState<CardRow | null>(null);
  const busy = saving || improving;

  useEffect(() => {
    if (!open) { setCard(null); setLoading(false); setImproving(false); setImprovementComment(""); return; }
    let cancelled = false;
    setLoading(true);
    supabase.from("cards").select("*").eq("id", cardId).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) toast.error("Erro ao carregar OQ");
      setCard(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, cardId]);

  function update(key: string, value: any) { setCard((current) => current ? { ...current, [key]: value } : current); }

  async function aprimorar() {
    if (!card || busy) return;
    const activeIndexes = Array.from({ length: 5 }, (_, index) => index + 1).filter((index) => String(card[`info_${index}`] ?? "").trim());
    if (card.modo === "oq_falta" && activeIndexes.some((index, position) => index !== position + 1)) {
      toast.error("Preencha os itens do OQ Falta em ordem, sem posições vazias.");
      return;
    }
    const items = activeIndexes.map((index) => ({ resposta: card[`info_${index}`] }));
    setImproving(true);
    const payload = {
      modo: card.modo,
      comando: card.comando ?? "",
      alternativas: card.modo === "abcde"
        ? Object.fromEntries([...letters.map((letter) => [letter, card[`alternativa_${letter}`] ?? ""]), ["correta", card.alternativa_correta ?? ""]])
        : card.modo === "lacuna" ? { resposta: card.info_1 ?? "" } : { itens: items },
      "variações": card.modo === "abcde" ? null : card.modo === "lacuna" ? { var_1: card.var_1 ?? "" } : Object.fromEntries(items.map((_, index) => [`var_${index + 1}`, card[`var_${index + 1}`] ?? ""])),
      explicacao: card.explicacao ?? "",
      comentario: improvementComment.trim(),
    };
    try {
      const { data, error } = await supabase.functions.invoke("aprimorar-oq-ia", { body: payload });
      if (error) throw new Error(error.message || "Não foi possível aprimorar o OQ.");
      const patch = makePatch(card, data);
      setCard((current) => current ? { ...current, ...patch } : current);
      toast.success("OQ aprimorado. Revise o resultado e clique em Salvar para persistir.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível aprimorar o OQ.");
    } finally { setImproving(false); }
  }

  async function salvar() {
    if (!card || busy) return;
    setSaving(true);
    const { id, criado_em, atualizado_em, criado_por_usuario_id, origem, ...payload } = card;
    const { error } = await supabase.from("cards").update(payload as any).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("OQ atualizado com sucesso");
    setOpen(false);
    onSaved?.(card);
  }

  if (!isAdmin && !isEditor) return null;
  return <>
    <button onClick={() => setOpen(true)} title="Editar OQ (admin)" className="h-10 w-10 rounded-full grid place-items-center hover:bg-[hsl(var(--muted))] transition"><Pencil className="h-4 w-4 text-[hsl(var(--primary))]" /></button>
    <Dialog open={open} onOpenChange={(next) => { if (!busy) setOpen(next); }}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] p-0 rounded-2xl overflow-hidden flex flex-col">
        <DialogHeader className="px-5 py-4 border-b shrink-0 flex-row items-start justify-between gap-4">
          <div><DialogTitle>Editar OQ</DialogTitle><DialogDescription className="text-xs">Edição de {isAdmin ? "administrador" : "editor"} • ID: <span className="font-mono">{cardId.slice(0, 8)}</span></DialogDescription></div>
          <TactileButton variant="neutral" onClick={aprimorar} disabled={!card || loading || busy} className="shrink-0"><Sparkles className="h-4 w-4" />{improving ? "Aprimorando..." : "Aprimorar com IA"}</TactileButton>
        </DialogHeader>
        {loading || !card ? <div className="flex-1 grid place-items-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : <ScrollArea className="flex-1 overflow-y-auto">
          <fieldset disabled={busy} className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1.5"><Label className="text-xs">Especialidade</Label><Select value={card.especialidade} onValueChange={(v) => update("especialidade", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent className="max-h-72">{Object.entries(ESPECIALIDADE_LABEL).map(([k, v]) => <SelectItem key={k} value={k}>{v as string}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Modo</Label><Select value={card.modo} onValueChange={(v) => update("modo", v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="abcde">ABCDE</SelectItem><SelectItem value="lacuna">Lacuna</SelectItem><SelectItem value="oq_falta">OQ Falta</SelectItem></SelectContent></Select></div>
              <div className="space-y-1.5"><Label className="text-xs">Peso (1-10)</Label><Input type="number" min={1} max={10} value={card.peso_importancia ?? 5} onChange={(e) => update("peso_importancia", parseInt(e.target.value) || 5)} /></div>
            </div>
            <div className="space-y-1.5"><Label className="text-xs">Comando / Pergunta</Label><Textarea value={card.comando ?? ""} onChange={(e) => update("comando", e.target.value)} rows={3} className="resize-none" /></div>
            <div className="space-y-1.5 rounded-lg border border-primary/20 bg-primary/5 p-3"><Label htmlFor="improvement-comment" className="text-xs">Comentário de aprimoramento</Label><Textarea id="improvement-comment" value={improvementComment} onChange={(e) => setImprovementComment(e.target.value)} rows={2} className="resize-none" placeholder="Ex.: foque em melhorar a explicação ou deixe esta questão mais difícil..." /><p className="text-[11px] text-muted-foreground">Opcional. Será usado apenas para orientar o próximo aprimoramento com IA.</p></div>
            {card.modo === "abcde" && <div className="space-y-3"><Label className="text-xs uppercase tracking-wide text-muted-foreground">Alternativas</Label>{letters.map((letter) => { const key = `alternativa_${letter}`; const correct = card.alternativa_correta?.toLowerCase() === letter; return <div key={letter} className="flex gap-2 items-start"><button type="button" onClick={() => update("alternativa_correta", letter.toUpperCase())} translate="no" className={`shrink-0 h-9 w-9 rounded-lg font-black text-sm grid place-items-center transition ${correct ? "bg-emerald-500 text-white shadow-md" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}>{letter.toUpperCase()}</button><Textarea value={card[key] ?? ""} onChange={(e) => update(key, e.target.value)} rows={2} className="resize-none text-sm" placeholder={`Alternativa ${letter.toUpperCase()}`} /></div>; })}</div>}
            <div className="space-y-3"><Label className="text-xs uppercase tracking-wide text-muted-foreground">Variações / Infos</Label>{[1, 2, 3, 4, 5].map((n) => <div key={n} className="grid grid-cols-1 sm:grid-cols-2 gap-2"><Input placeholder={`var_${n}`} value={card[`var_${n}`] ?? ""} onChange={(e) => update(`var_${n}`, e.target.value)} /><Input placeholder={`info_${n}`} value={card[`info_${n}`] ?? ""} onChange={(e) => update(`info_${n}`, e.target.value)} /></div>)}</div>
            <div className="space-y-1.5"><Label className="text-xs">Explicação</Label><Textarea value={card.explicacao ?? ""} onChange={(e) => update("explicacao", e.target.value)} rows={5} className="resize-none" /></div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40"><div><Label className="text-sm">Verificado</Label><p className="text-[11px] text-muted-foreground">OQs verificados aparecem para todos os usuários</p></div><Switch checked={!!card.verificado} onCheckedChange={(v) => update("verificado", v)} /></div>
          </fieldset>
        </ScrollArea>}
        <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2"><TactileButton variant="neutral" onClick={() => setOpen(false)} disabled={busy}>Cancelar</TactileButton><TactileButton variant="primary" onClick={salvar} disabled={busy || loading}>{saving ? "Salvando..." : "Salvar"}</TactileButton></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}

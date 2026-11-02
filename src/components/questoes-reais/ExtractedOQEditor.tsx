import { useState } from "react";
import { Check, ChevronsUpDown, Loader2, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ExtractedOQ } from "@/lib/questoes-reais";

export default function ExtractedOQEditor({ oq, materials, admin, onChange, onSave, onDiscard }: { oq: ExtractedOQ; materials: Array<{ id: string; nome: string }>; admin: boolean; onChange: (oq: ExtractedOQ) => void; onSave: () => void; onDiscard: () => void }) {
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<ExtractedOQ>) => onChange({ ...oq, ...patch });
  return <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
    <div className="flex items-center justify-between gap-2"><Badge variant="secondary">{oq.modo}</Badge>{oq.saved && <Badge className="bg-emerald-600"><Check className="mr-1 h-3 w-3" />{admin ? "Selo Bimed" : "Feito por Mim"}</Badge>}</div>
    <Textarea aria-label="Frente do OQ" value={oq.comando} onChange={(e) => update({ comando: e.target.value })} />
    {oq.info.map((value, index) => <Input key={index} aria-label={`Informação ${index + 1}`} value={value} onChange={(e) => update({ info: oq.info.map((item, i) => i === index ? e.target.value : item) })} />)}
    <Input aria-label="Variações" value={oq.variacoes.join("; ")} onChange={(e) => update({ variacoes: e.target.value.split(";").map((item) => item.trim()).filter(Boolean) })} placeholder="Variações separadas por ponto e vírgula" />
    <Textarea aria-label="Justificativa" value={oq.explicacao} onChange={(e) => update({ explicacao: e.target.value })} />
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button variant="outline" className="w-full justify-between" disabled={oq.saved}>{oq.aula_titulo ?? "Selecionar resumo vinculado"}<ChevronsUpDown className="h-4 w-4" /></Button></PopoverTrigger><PopoverContent className="p-0"><Command><CommandInput placeholder="Buscar resumo..." /><CommandList><CommandEmpty>Nenhum resumo encontrado.</CommandEmpty>{materials.map((material) => <CommandItem key={material.id} value={material.nome} onSelect={() => { update({ aula_id: material.id, aula_titulo: material.nome }); setOpen(false); }}>{material.nome}</CommandItem>)}</CommandList></Command></PopoverContent></Popover>
    {oq.error && <p className="text-xs text-destructive">{oq.error}</p>}
    {!oq.saved && <div className="flex gap-2"><Button size="sm" onClick={onSave} disabled={oq.saving || !oq.aula_id}>{oq.saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}Salvar</Button><Button size="sm" variant="ghost" onClick={onDiscard}><Trash2 className="mr-2 h-4 w-4" />Descartar</Button></div>}
  </div>;
}

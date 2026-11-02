import { useState } from "react";
import { ChevronsUpDown, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ExtractedOQ } from "@/lib/questoes-reais";

type ExtractedOQEditorProps = {
  oq: ExtractedOQ;
  materials: Array<{ id: string; nome: string }>;
  admin: boolean;
  onChange: (oq: ExtractedOQ) => void;
  onSave: () => void;
  onDiscard: () => void;
};

export default function ExtractedOQEditor({ oq, materials, onChange, onSave, onDiscard }: ExtractedOQEditorProps) {
  const [open, setOpen] = useState(false);
  const update = (patch: Partial<ExtractedOQ>) => onChange({ ...oq, ...patch });
  const selectedMaterial = materials.find((material) => material.id === oq.aula_id);

  return (
    <div className="space-y-3 rounded-xl border bg-muted/20 p-4">
      <div className="flex items-center justify-between gap-2">
        <Badge variant="secondary">{oq.modo}</Badge>
      </div>
      <Textarea aria-label="Frente do OQ" value={oq.pergunta} onChange={(e) => update({ pergunta: e.target.value })} />
      {oq.opcoes.map((value, index) => (
        <Input
          key={index}
          aria-label={`Opção ${index + 1}`}
          value={value}
          onChange={(e) => update({ opcoes: oq.opcoes.map((item, i) => i === index ? e.target.value : item) })}
        />
      ))}
      <Input aria-label="Resposta" value={oq.resposta} onChange={(e) => update({ resposta: e.target.value })} />
      <Input aria-label="Variações" value={oq.variacoes.join("; ")} onChange={(e) => update({ variacoes: e.target.value.split(";").map((item) => item.trim()).filter(Boolean) })} placeholder="Variações separadas por ponto e vírgula" />
      <Textarea aria-label="Justificativa" value={oq.explicacao} onChange={(e) => update({ explicacao: e.target.value })} />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between">
            {selectedMaterial?.nome ?? "Selecionar resumo vinculado"}
            <ChevronsUpDown className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0">
          <Command>
            <CommandInput placeholder="Buscar resumo..." />
            <CommandList>
              <CommandEmpty>Nenhum resumo encontrado.</CommandEmpty>
              {materials.map((material) => (
                <CommandItem key={material.id} value={material.nome} onSelect={() => { update({ aula_id: material.id }); setOpen(false); }}>
                  {material.nome}
                </CommandItem>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={!oq.aula_id}>
          <Save className="mr-2 h-4 w-4" />Salvar
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          <Trash2 className="mr-2 h-4 w-4" />Descartar
        </Button>
      </div>
    </div>
  );
}

import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface MaterialOption {
  id: string;
  nome: string;
}

interface MaterialSelectProps {
  materiais: MaterialOption[];
  value: string;
  onValueChange: (value: string) => void;
  loading?: boolean;
  error?: string | null;
  compact?: boolean;
}

export default function MaterialSelect({
  materiais,
  value,
  onValueChange,
  loading = false,
  error = null,
  compact = false,
}: MaterialSelectProps) {
  return (
    <div className="space-y-2">
      <Label className={compact ? "text-[10px] font-black uppercase tracking-wider text-muted-foreground" : "text-xs font-bold uppercase tracking-wider text-muted-foreground"}>
        Matéria / aula <span className="text-destructive">*</span>
      </Label>
      <Select value={value} onValueChange={onValueChange} disabled={loading}>
        <SelectTrigger className={`rounded-xl border-border/60 ${compact ? "h-9" : ""}`}>
          <SelectValue placeholder={loading ? "Carregando matérias..." : "Selecione a matéria/aula"} />
        </SelectTrigger>
        <SelectContent className="rounded-xl max-h-80">
          {materiais.map((material) => (
            <SelectItem key={material.id} value={material.id}>
              {material.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <p className="text-[10px] text-destructive">Não foi possível carregar as matérias.</p>
      ) : (
        <p className="text-[10px] text-muted-foreground/70">
          A aula selecionada será usada ao aprovar os OQs administrativos.
        </p>
      )}
    </div>
  );
}

export function getMaterialName(materiais: MaterialOption[], id: string | null | undefined) {
  return materiais.find((material) => material.id === id)?.nome || "";
}

import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, FileText } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import type { AulaPlano } from "@/hooks/useTrilhaPlano";
import { cn } from "@/lib/utils";
import IncidenciaBadge, { getIncidencia } from "./IncidenciaBadge";


interface Props {
  aula: AulaPlano;
  accent?: "foco" | "base";
}

export default function BlocoAula({ aula, accent = "base" }: Props) {
  const navigate = useNavigate();

  return (
    <div className={cn(
      "paper-card p-5 group relative transition-all hover:-translate-y-0.5",
      accent === "foco" && "ring-1 ring-accent/30"
    )}>
      {accent === "foco" && (
        <div className="absolute top-4 right-4 h-2 w-2 rounded-full bg-accent shadow-[0_0_10px_hsl(var(--accent))] animate-pulse" />
      )}

      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="rounded-md text-[9px] font-black uppercase tracking-widest bg-muted/60 px-2 py-0.5">
              {ESPECIALIDADE_LABEL[aula.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? aula.especialidade}
            </Badge>
            <IncidenciaBadge tier={aula.tier} compact />
          </div>

          <button 
            onClick={() => navigate(`/materiais?id=${aula.id}`)}
            className="text-left w-full block group/title"
          >
            <h4 className="font-bold text-base md:text-lg leading-tight tracking-tight text-foreground group-hover/title:text-[hsl(var(--accent))] transition-colors break-words">
              {aula.nome}
            </h4>
          </button>
          
          <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            {aula.total_oqs} OQs disponíveis
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <Button
            size="sm"
            variant="ghost"
            className="tactile-btn rounded-xl bg-background text-[10px] font-black uppercase tracking-widest h-10 gap-1.5 border border-border/40 hover:bg-muted/30"
            onClick={() => navigate(`/materiais?id=${aula.id}`)}
          >
            <FileText className="h-3.5 w-3.5 text-[hsl(var(--accent))]" />
            Resumo
          </Button>
          <Button
            size="sm"
            className={cn(
              "rounded-xl font-black text-[10px] uppercase tracking-widest h-10 gap-1.5 shadow-lg active:scale-95 transition-transform",
              accent === "foco"
                ? "bg-[hsl(var(--accent))] hover:bg-[hsl(var(--accent))]/90 text-[hsl(var(--accent-foreground))] shadow-[hsl(var(--accent))]/20"
                : "bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
            )}
            onClick={() => navigate(`/estudo?tipo=aula&aula_id=${aula.id}`)}
            disabled={aula.total_oqs === 0}
          >
            <BookOpen className="h-3.5 w-3.5" />
            Estudar
          </Button>
        </div>
      </div>
    </div>
  );
}

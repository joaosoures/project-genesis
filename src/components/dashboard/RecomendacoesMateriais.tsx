import { useNavigate } from "react-router-dom";
import { ESPECIALIDADE_LABEL, Especialidade } from "@/lib/oq";
import { AlertTriangle, Compass, TrendingUp, Sparkles, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface EspecialidadeStats {
  especialidade: Especialidade;
  visto: number;
  acertos: number;
  erros: number;
  dominio: number;
}

export default function RecomendacoesMateriais({ stats, locked }: { stats: EspecialidadeStats[]; locked: boolean }) {
  const navigate = useNavigate();
  const todas = Object.keys(ESPECIALIDADE_LABEL) as Especialidade[];

  const recs: { esp: Especialidade; tipo: "fraco" | "novo" | "reforco"; razao: string; metric: string }[] = [];
  const estudadas = stats.filter(s => s.visto > 0);
  const fracas = [...estudadas].filter(s => s.dominio < 70).sort((a, b) => a.dominio - b.dominio);
  
  for (const s of fracas.slice(0, 2)) {
    recs.push({
      esp: s.especialidade,
      tipo: "fraco",
      razao: "Domínio abaixo do ideal — revise os materiais para virar o jogo.",
      metric: `${Math.round(s.dominio)}% de acerto · ${s.erros} erros`,
    });
  }
  
  const estudadasIds = new Set(estudadas.map(s => s.especialidade));
  const naoEstudadas = todas.filter(e => !estudadasIds.has(e));
  
  for (const e of naoEstudadas.slice(0, 3 - recs.length)) {
    recs.push({
      esp: e,
      tipo: "novo",
      razao: "Ainda sem dados — comece pelos materiais para criar base.",
      metric: "Território inexplorado",
    });
  }
  
  if (recs.length < 3 && estudadas.length > 0) {
    const fortes = [...estudadas].sort((a, b) => b.dominio - a.dominio);
    for (const s of fortes) {
      if (recs.find(r => r.esp === s.especialidade)) continue;
      recs.push({
        esp: s.especialidade,
        tipo: "reforco",
        razao: "Mantenha o nível — material rápido para consolidar.",
        metric: `${Math.round(s.dominio)}% de domínio`,
      });
      if (recs.length >= 3) break;
    }
  }

  const tipoMeta: Record<string, { Icon: any; tag: string; color: string }> = {
    fraco: { Icon: AlertTriangle, tag: "Ponto Crítico", color: "text-destructive" },
    novo: { Icon: Compass, tag: "Explorar", color: "text-accent" },
    reforco: { Icon: TrendingUp, tag: "Consolidar", color: "text-success" },
  };

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Próximos materiais sugeridos</h2>
          <p className="text-xs text-muted-foreground/60 mt-1">Direcionamentos baseados no seu desempenho nos OQs.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {recs.map((r) => {
          const meta = tipoMeta[r.tipo];
          return (
            <button
              key={r.esp}
              onClick={() => navigate(`/materiais?esp=${r.esp}`)}
              className="paper-card p-4 text-left group hover:border-accent/40 transition-all flex flex-col justify-between min-h-[140px]"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className={cn("inline-flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest", meta.color)}>
                    <meta.Icon className="h-3 w-3" />
                    {meta.tag}
                  </div>
                  <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                </div>
                <h4 className="font-bold text-sm leading-tight">{ESPECIALIDADE_LABEL[r.esp]}</h4>
                <p className="text-[10px] text-muted-foreground/80 leading-snug">{r.razao}</p>
              </div>
              <div className="mt-4 pt-3 border-t border-border/50">
                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest tabular-nums">{r.metric}</span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

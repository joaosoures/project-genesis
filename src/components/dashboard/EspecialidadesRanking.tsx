import { motion } from "framer-motion";
import { Brain, Award } from "lucide-react";
import { ESPECIALIDADE_LABEL, Especialidade } from "@/lib/oq";
import { Trophy } from "lucide-react";
import BentoCard from "@/components/ui/bento-card";
import { useSettings } from "@/contexts/SettingsContext";

interface EspecialidadeStats {
  especialidade: Especialidade;
  visto: number;
  acertos: number;
  erros: number;
  dominio: number;
}

export default function EspecialidadesRanking({ stats }: { stats: EspecialidadeStats[] }) {
  const { reduceMotion } = useSettings();

  if (stats.length === 0) return null;

  const estudadas = stats.filter(s => s.visto > 0);
  if (estudadas.length === 0) return null;

  const maxVisto = Math.max(...estudadas.map(s => s.visto));
  const sortedStats = [...estudadas].sort((a, b) => {
    const scoreA = a.dominio * (a.visto / maxVisto);
    const scoreB = b.dominio * (b.visto / maxVisto);
    return scoreB - scoreA;
  });

  const topEspecialidade = sortedStats[0];

  const getCreativeTitle = (esp: Especialidade) => {
    switch (esp) {
      case "clinica_medica": return "Mestre dos Diagnósticos";
      case "cirurgia_geral": return "Prodígio do Centro Cirúrgico";
      case "pediatria": return "Guardião dos Pequenos";
      case "ginecologia_obstetricia": return "Especialista em Vida";
      case "medicina_preventiva": return "Visionário da Saúde Coletiva";
      default: return "Estrategista Médico";
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-sm font-black uppercase tracking-[0.2em] text-muted-foreground">Monitor de Proficiência</h2>
          <p className="text-xs text-muted-foreground/60 mt-1">Sua evolução detalhada por área de atuação médica.</p>
        </div>
        {topEspecialidade.dominio > 40 && (
          <div className={cn("flex items-center gap-3 px-4 py-2 bg-accent/10 border border-accent/20 rounded-2xl", !reduceMotion && "animate-pulse")}>
            <Trophy className="h-5 w-5 text-accent" />
            <div className="text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-accent">Status Atual</p>
              <p className="text-xs font-bold text-foreground">{getCreativeTitle(topEspecialidade.especialidade)}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BentoCard className="md:col-span-2 bg-gradient-to-br from-accent/5 via-card to-card border-accent/20 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-[0.03] group-hover:scale-110 transition-transform duration-700">
            <Brain className="w-32 h-32 text-accent" />
          </div>
          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="flex-1 space-y-4 text-center md:text-left">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/20 border border-accent/30">
                <Award className="h-4 w-4 text-accent" />
                <span className="text-[10px] font-black uppercase tracking-widest text-accent">Seu Maior Domínio</span>
              </div>
              <h3 className="text-3xl font-black tracking-tight">{ESPECIALIDADE_LABEL[topEspecialidade.especialidade]}</h3>
              <div className="flex flex-wrap justify-center md:justify-start gap-4">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">Precisão</p>
                  <p className="text-2xl font-black text-success">{Math.round((topEspecialidade.acertos / (topEspecialidade.visto || 1)) * 100)}%</p>
                </div>
                <div className="w-px h-8 bg-border/50 hidden md:block mt-2" />
                <div className="space-y-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground">OQs Vencidos</p>
                  <p className="text-2xl font-black text-foreground">{topEspecialidade.visto}</p>
                </div>
              </div>
            </div>
            <div className="w-32 h-32 relative">
              <svg className="w-full h-full -rotate-90">
                <circle cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
                {reduceMotion ? (
                  <circle
                    cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8"
                    strokeDasharray={364}
                    strokeDashoffset={364 - (364 * topEspecialidade.dominio) / 100}
                    className="text-accent"
                    strokeLinecap="round"
                  />
                ) : (
                  <motion.circle
                    cx="64" cy="64" r="58" fill="none" stroke="currentColor" strokeWidth="8"
                    strokeDasharray={364}
                    initial={{ strokeDashoffset: 364 }}
                    animate={{ strokeDashoffset: 364 - (364 * topEspecialidade.dominio) / 100 }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="text-accent"
                    strokeLinecap="round"
                  />
                )}
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-black">{Math.round(topEspecialidade.dominio)}%</span>
              </div>
            </div>
          </div>
        </BentoCard>

        {sortedStats.slice(1).map((s, idx) => (
          <div key={s.especialidade} className="paper-card p-4 flex items-center gap-4 hover:border-border/80 transition-all">
            <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground font-black">
              #{idx + 2}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{ESPECIALIDADE_LABEL[s.especialidade]}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  {reduceMotion ? (
                    <div
                      style={{ width: `${s.dominio}%` }}
                      className="h-full bg-accent/60"
                    />
                  ) : (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${s.dominio}%` }}
                      className="h-full bg-accent/60"
                    />
                  )}
                </div>
                <span className="text-[10px] font-bold tabular-nums">{Math.round(s.dominio)}%</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-success">+{s.acertos}</p>
              <p className="text-[10px] font-bold text-destructive">-{s.erros}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
function cn(...args: any[]) {
  return args.filter(Boolean).join(" ");
}

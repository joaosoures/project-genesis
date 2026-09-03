import { Info, Flame, Target, BarChart3, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  currentWeekIndex: number;
  totalSemanas: number;
  aulasSemanaAtual: any[];
  focoSemana: any[];
  baseSemana: any[];
  espLabel: string | null;
  getRodizioForWeek: (wk: number) => string | null;
  totalAulas: number;
  analiseEstrategica: {
    puxadas: any[];
    redistribuidas: any[];
  };
}

export default function ExplicacaoTrilha({
  currentWeekIndex,
  totalSemanas,
  aulasSemanaAtual,
  focoSemana,
  baseSemana,
  espLabel,
  getRodizioForWeek,
  totalAulas,
  analiseEstrategica,
}: Props) {
  const [expanded, setExpanded] = useState<"puxadas" | "redistribuidas" | null>(null);

  const alta = aulasSemanaAtual.filter((a) => a.tier <= 1).length;
  const media = aulasSemanaAtual.filter((a) => a.tier === 2).length;
  const baixa = aulasSemanaAtual.filter((a) => a.tier >= 3).length;

  // Encontrar duração do rodízio atual
  let rodizioFim = currentWeekIndex;
  while (getRodizioForWeek(rodizioFim + 1) === getRodizioForWeek(currentWeekIndex) && rodizioFim < totalSemanas) {
    rodizioFim++;
  }

  const toggleExpand = (type: "puxadas" | "redistribuidas") => {
    setExpanded(expanded === type ? null : type);
  };

  return (
    <div className="bg-white/95 backdrop-blur-md rounded-3xl p-5 border border-border/40 space-y-6 relative z-20 shadow-xl ring-1 ring-black/5 [data-reduce-motion='1']_&:backdrop-filter-none [data-reduce-motion='1']_&:bg-white">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">
            Análise da Estratégia
          </h3>
        </div>
        <div className="text-[10px] font-bold text-muted-foreground/60 bg-white/50 px-2 py-0.5 rounded-full border border-border/20">
          GPS Inteligente Ativo
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rodízio e Puxadas */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            <Flame className="h-3 w-3 text-orange-500" />
            Impacto do Rodízio
          </div>
          <div className="space-y-2">
            <p className="text-sm font-bold">
              {espLabel ? (
                <>
                  {espLabel} (Semana {currentWeekIndex + 1} a {rodizioFim + 1})
                </>
              ) : (
                "Nenhum rodízio ativo"
              )}
            </p>
            <div className="space-y-2">
              <button 
                onClick={() => toggleExpand("puxadas")}
                className="w-full flex items-center justify-between text-[11px] font-bold px-3 py-2 rounded-xl bg-orange-100/50 text-orange-700 hover:bg-orange-100 transition-colors border border-orange-200/50"
              >
                <div className="flex items-center gap-1.5">
                  <ArrowUpRight className="h-3 w-3" />
                  {analiseEstrategica.puxadas.length} puxadas do futuro
                </div>
                {expanded === "puxadas" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>
              
              <AnimatePresence>
                {expanded === "puxadas" && analiseEstrategica.puxadas.length > 0 && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden bg-white/40 rounded-xl border border-orange-100 p-2 space-y-1"
                  >
                    {analiseEstrategica.puxadas.map(a => (
                      <div key={a.id} className="text-[9px] font-medium text-orange-800 px-2 py-1 rounded-md bg-white/60 truncate">
                        • {a.nome}
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Mix de Incidência */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-3 w-3 text-blue-500" />
            Configuração da Semana
          </div>
          <div className="bg-white/40 rounded-2xl p-3 border border-blue-100/30">
            <div className="flex justify-between items-center mb-2 px-1">
              <span className="text-[10px] font-bold text-muted-foreground">Mix de Conteúdos</span>
              <span className="text-[10px] font-black text-blue-600">{aulasSemanaAtual.length} Totais</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center flex-1">
                <span className="text-sm font-black text-foreground">{alta}</span>
                <span className="text-[8px] uppercase font-black text-muted-foreground">Altas</span>
              </div>
              <div className="w-px h-6 bg-blue-100" />
              <div className="flex flex-col items-center flex-1">
                <span className="text-sm font-black text-foreground">{media}</span>
                <span className="text-[8px] uppercase font-black text-muted-foreground">Médias</span>
              </div>
              <div className="w-px h-6 bg-blue-100" />
              <div className="flex flex-col items-center flex-1">
                <span className="text-sm font-black text-foreground">{baixa}</span>
                <span className="text-[8px] uppercase font-black text-muted-foreground">Baixas</span>
              </div>
            </div>
          </div>
        </div>

        {/* Redistribuição */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-muted-foreground">
            <Target className="h-3 w-3 text-emerald-500" />
            Redistribuição Inteligente
          </div>
          <div className="space-y-2">
            <p className="text-[11px] text-muted-foreground leading-tight">
              Das {totalAulas} matérias do seu plano, <strong>{focoSemana.length}</strong> são do foco sincronizado e <strong>{baseSemana.length}</strong> são matérias base.
            </p>
            
            <button 
              onClick={() => toggleExpand("redistribuidas")}
              className={cn(
                "w-full flex items-center justify-between text-[11px] font-bold px-3 py-2 rounded-xl transition-colors border",
                analiseEstrategica.redistribuidas.length > 0 
                  ? "bg-emerald-50 text-emerald-700 border-emerald-100 hover:bg-emerald-100" 
                  : "bg-muted/40 text-muted-foreground border-border/40"
              )}
            >
              <div className="flex items-center gap-1.5">
                <ArrowDownLeft className="h-3 w-3" />
                {analiseEstrategica.redistribuidas.length} adiadas para abrir espaço
              </div>
              {expanded === "redistribuidas" ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>

            <AnimatePresence>
              {expanded === "redistribuidas" && analiseEstrategica.redistribuidas.length > 0 && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden bg-white/40 rounded-xl border border-emerald-100 p-2 space-y-1"
                >
                  {analiseEstrategica.redistribuidas.map(a => (
                    <div key={a.id} className="text-[9px] font-medium text-emerald-800 px-2 py-1 rounded-md bg-white/60 truncate">
                      • {a.nome}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
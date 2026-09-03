import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Zap, Flame, Target, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

export default function InsightSurpresa({ stats }: { stats: any }) {
  const { reduceMotion } = useSettings();
  const [insight, setInsight] = useState<{ icon: any; title: string; text: string; color: string } | null>(null);

  useEffect(() => {
    const total = stats.total || 0;
    const taxa = total > 0 ? (stats.acertos / total) * 100 : 0;
    
    if (total === 0) return;

    if (taxa > 85) {
      setInsight({
        icon: Zap,
        title: "Frequência de Gênio",
        text: "Sua precisão está em nível de elite. Você não está apenas estudando, está reescrevendo o que é possível.",
        color: "text-accent"
      });
    } else if (stats.hoje > 50) {
      setInsight({
        icon: Flame,
        title: "Ritmo Inabalável",
        text: "Sua consistência hoje é maior que 90% dos usuários. Esse é o momento onde a memória se torna permanente.",
        color: "text-orange-500"
      });
    } else if (stats.erros > stats.acertos * 0.5) {
      setInsight({
        icon: Target,
        title: "Resiliência Pura",
        text: "Você está enfrentando os cards mais difíceis sem recuar. É no erro que o cérebro cria as conexões mais fortes.",
        color: "text-blue-500"
      });
    } else {
      setInsight({
        icon: Sparkles,
        title: "Evolução Silenciosa",
        text: "Cada OQ respondido é uma sinapse a mais. Você está construindo uma base inabalável para o seu futuro.",
        color: "text-purple-500"
      });
    }
  }, [stats]);

  if (!insight) return null;

  const Content = (
    <div className="relative p-6 rounded-[2rem] bg-black text-white overflow-hidden group shadow-2xl">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-transparent opacity-50" />
      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
        <div className={cn("p-4 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/10", insight.color)}>
          <insight.icon className="w-8 h-8" />
        </div>
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className={cn("w-1.5 h-1.5 rounded-full bg-accent", !reduceMotion && "animate-ping")} />
            <h3 className="text-sm font-black uppercase tracking-[0.3em] text-accent">{insight.title}</h3>
          </div>
          <p className="text-lg md:text-xl font-medium leading-relaxed tracking-tight text-white/90">
            "{insight.text}"
          </p>
        </div>
      </div>
      <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-accent/10 rounded-full blur-3xl" />
      <div className="absolute -top-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
    </div>
  );

  if (reduceMotion) return Content;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {Content}
    </motion.div>
  );
}

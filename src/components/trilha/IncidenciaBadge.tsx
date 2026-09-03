import { Flame, AlertTriangle, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

export type IncidenciaLevel = "alta" | "media" | "baixa";

export function getIncidencia(tier: number): {
  level: IncidenciaLevel;
  label: string;
  Icon: typeof Flame;
  badgeClass: string;
  ringClass: string;
  dotClass: string;
} {
  if (tier <= 1) {
    return {
      level: "alta",
      label: "Alta incidência",
      Icon: Flame,
      badgeClass:
        "bg-rose-500/15 text-rose-600 border border-rose-500/30",
      ringClass: "ring-rose-500/30",
      dotClass: "bg-rose-500",
    };
  }
  if (tier === 2) {
    return {
      level: "media",
      label: "Média incidência",
      Icon: AlertTriangle,
      badgeClass:
        "bg-amber-500/15 text-amber-700 border border-amber-500/30",
      ringClass: "ring-amber-500/30",
      dotClass: "bg-amber-500",
    };
  }
  return {
    level: "baixa",
    label: "Baixa incidência",
    Icon: BookOpen,
    badgeClass:
      "bg-sky-500/10 text-sky-700 border border-sky-500/25",
    ringClass: "ring-sky-500/20",
    dotClass: "bg-sky-500",
  };
}

interface Props {
  tier: number;
  compact?: boolean;
  className?: string;
}

export default function IncidenciaBadge({ tier, compact, className }: Props) {
  const inc = getIncidencia(tier);
  const { Icon } = inc;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-black uppercase tracking-widest",
        compact ? "text-[8px] px-1.5 py-0.5" : "text-[9px] px-2 py-0.5",
        inc.badgeClass,
        className,
      )}
      title={inc.label}
    >
      <Icon className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
      {compact ? inc.level : inc.label}
    </span>
  );
}

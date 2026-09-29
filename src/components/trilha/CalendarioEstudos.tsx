import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Trophy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { cn } from "@/lib/utils";
import type { TrilhaSettings } from "@/hooks/useTrilhaPlano";

export interface Simulado {
  id: string;
  data: string;
  nome: string;
}

interface Props {
  settings: TrilhaSettings & { simulados?: Simulado[] };
  onSave: (next: any) => void;
}

const WEEK_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"];

function ymd(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function startOfWeekMon(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  return x;
}

export default function CalendarioEstudos({ settings }: Props) {
  const { user } = useAuth();
  const { dailyGoal } = useSettings();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const simulados: Simulado[] = settings.simulados ?? [];

  useEffect(() => {
    if (!user) return;
    const since = new Date();
    since.setDate(since.getDate() - 90);
    supabase
      .from("historico_estudo")
      .select("timestamp")
      .eq("usuario_id", user.id)
      .gte("timestamp", since.toISOString())
      .then(({ data }) => {
        const c: Record<string, number> = {};
        (data ?? []).forEach((h) => {
          const key = ymd(new Date(h.timestamp!));
          c[key] = (c[key] || 0) + 1;
        });
        setCounts(c);
      });
  }, [user]);

  const metaDia = (dow: number) =>
    settings.disponibilidade.dias[dow] ? dailyGoal : 0;

  const miniWeeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = startOfWeekMon(today);
    start.setDate(start.getDate() - 5 * 7);
    return Array.from({ length: 6 }, (_, week) =>
      Array.from({ length: 7 }, (_, day) => {
        const date = new Date(start);
        date.setDate(start.getDate() + week * 7 + day);
        return date;
      }),
    );
  }, []);

  function statusFor(date: Date): "futuro" | "off" | "verde" | "amarelo" | "vermelho" | "inicio" {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKey = ymd(date);
    const inicio = settings.data_inicio_plano;

    if (inicio && dateKey === inicio) return "inicio";
    if (inicio && dateKey < inicio) return "futuro";
    if (date > today) return "futuro";

    const done = counts[dateKey] || 0;
    const goal = metaDia((date.getDay() + 6) % 7);
    if (goal === 0) return done > 0 ? "verde" : "off";
    if (done >= goal) return "verde";
    if (done > 0) return "amarelo";
    return "vermelho";
  }

  const colorClass = (status: ReturnType<typeof statusFor>) => {
    switch (status) {
      case "inicio": return "bg-blue-500 text-white";
      case "verde": return "bg-emerald-500 text-white";
      case "amarelo": return "bg-amber-400 text-amber-950";
      case "vermelho": return "bg-rose-500/80 text-white";
      case "futuro": return "bg-muted/40 border border-dashed border-border text-muted-foreground";
      default: return "bg-muted text-muted-foreground";
    }
  };

  const isProva = (date: Date) =>
    settings.prova_data && ymd(new Date(settings.prova_data)) === ymd(date);
  const simNoDia = (date: Date) => simulados.find((simulado) => simulado.data === ymd(date));

  return (
    <section className="paper-card w-full max-w-5xl mx-auto p-5 md:p-6" aria-label="Calendário de estudos">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-accent" />
        </div>
        <div>
          <h3 className="font-black text-base tracking-tight">Calendário</h3>
          <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
            Últimas 6 semanas
          </p>
        </div>
      </div>

      <div className="space-y-1">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEK_LABELS.map((label, index) => (
            <div key={index} className="text-[9px] font-black text-muted-foreground text-center uppercase">
              {label}
            </div>
          ))}
        </div>
        {miniWeeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-1">
            {week.map((date) => {
              const status = statusFor(date);
              const today = ymd(date) === ymd(new Date());
              const inicio = settings.data_inicio_plano && ymd(date) === settings.data_inicio_plano;
              const prova = isProva(date);
              const simulado = simNoDia(date);
              return (
                <div
                  key={date.toISOString()}
                  className={cn(
                    "aspect-square rounded-md relative flex items-center justify-center text-[11px] font-black",
                    colorClass(status),
                    today && "ring-2 ring-accent ring-offset-1 ring-offset-background",
                  )}
                  title={`${date.toLocaleDateString("pt-BR")}${inicio ? " • Data de Início" : ""}${prova ? " • Prova" : ""}${simulado ? ` • ${simulado.nome}` : ""}`}
                >
                  <span>{date.getDate()}</span>
                  {prova && <Trophy className="h-2.5 w-2.5 text-white absolute top-0.5 right-0.5 drop-shadow" />}
                  {simulado && !prova && <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-white shadow" />}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mt-4 text-[10px] font-bold text-muted-foreground">
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> Início</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Cumpriu</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> Parcial</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500/80" /> Vazio</span>
        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted" /> Off</span>
      </div>
    </section>
  );
}

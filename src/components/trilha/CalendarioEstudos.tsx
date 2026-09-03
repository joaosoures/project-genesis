import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, Plus, Trophy, X, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { TrilhaSettings } from "@/hooks/useTrilhaPlano";

export interface Simulado {
  id: string;
  data: string; // YYYY-MM-DD
  nome: string;
}

interface Props {
  settings: TrilhaSettings & { simulados?: Simulado[] };
  onSave: (next: any) => void;
}

const WEEK_LABELS = ["S", "T", "Q", "Q", "S", "S", "D"]; // Mon..Sun (matches settings.disponibilidade.dias)

function ymd(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
}

function startOfWeekMon(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const day = (x.getDay() + 6) % 7; // 0=Mon
  x.setDate(x.getDate() - day);
  return x;
}

export default function CalendarioEstudos({ settings, onSave }: Props) {
  const { user } = useAuth();
  const { dailyGoal, reduceMotion } = useSettings();
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [monthOffset, setMonthOffset] = useState(0);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [novoNome, setNovoNome] = useState("");
  const [novaData, setNovaData] = useState("");
  const [simuladosDisponiveis, setSimuladosDisponiveis] = useState<{ id: string; nome: string; especialidade: string | null }[]>([]);
  const [simuladoSelecionadoId, setSimuladoSelecionadoId] = useState<string>("");

  const simulados: Simulado[] = (settings as any).simulados ?? [];

  // Carrega simulados cadastrados em materiais
  useEffect(() => {
    supabase
      .from("simulados")
      .select("id, nome, especialidade")
      .order("nome", { ascending: true })
      .then(({ data }) => setSimuladosDisponiveis(data ?? []));
  }, []);

  // Carrega últimos ~90 dias de histórico
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
          const k = ymd(new Date(h.timestamp!));
          c[k] = (c[k] || 0) + 1;
        });
        console.log("Calendario counts loaded:", c);
        setCounts(c);
      });
  }, [user]);

  // Meta diária baseada na configuração do usuário "meta diária de OQs"
  const metaDia = (dow: number) => {
    const ativo = settings.disponibilidade.dias[dow];
    if (!ativo) return 0;
    return dailyGoal;
  };

  // Mini-calendário compacto: últimas 6 semanas
  const miniWeeks = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = startOfWeekMon(today);
    start.setDate(start.getDate() - 5 * 7);
    const weeks: Date[][] = [];
    for (let w = 0; w < 6; w++) {
      const row: Date[] = [];
      for (let d = 0; d < 7; d++) {
        const x = new Date(start);
        x.setDate(start.getDate() + w * 7 + d);
        row.push(x);
      }
      weeks.push(row);
    }
    return weeks;
  }, []);

  function statusFor(date: Date): "futuro" | "off" | "verde" | "amarelo" | "vermelho" | "hoje" | "inicio" {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dStr = ymd(date);
    const inicioStr = settings.data_inicio_plano;
    
    // Marcação especial: Data de início do plano
    if (inicioStr && dStr === inicioStr) {
      return "inicio";
    }

    const dow = (date.getDay() + 6) % 7;
    const metaConfig = metaDia(dow);
    const done = counts[dStr] || 0;

    // Se a data for anterior ao início do plano, não mostra cor nem atraso
    if (inicioStr && dStr < inicioStr) {
      return "futuro";
    }

    if (date > today) return "futuro";

    // Se a meta é 0, o dia é considerado 'Off' a menos que o usuário tenha estudado
    if (metaConfig === 0) {
      return done > 0 ? "verde" : "off";
    }
    
    // Se estudou mais ou igual à meta -> VERDE
    if (done >= metaConfig) return "verde";
    
    // Se estudou um pouco mas não bateu a meta -> AMARELO
    if (done > 0) return "amarelo";
    
    // Se não estudou nada em dia de meta -> VERMELHO
    return "vermelho";
  }

  const colorClass = (s: ReturnType<typeof statusFor>) => {
    switch (s) {
      case "inicio": return "bg-blue-500 ring-2 ring-blue-500/50 ring-offset-1";
      case "verde": return "bg-emerald-500";
      case "amarelo": return "bg-amber-400";
      case "vermelho": return "bg-rose-500/80";
      case "off": return "bg-muted";
      case "futuro": return "bg-muted/40 border border-dashed border-border";
      default: return "bg-muted";
    }
  };

  const isProva = (d: Date) =>
    settings.prova_data && ymd(new Date(settings.prova_data)) === ymd(d);
  const simNoDia = (d: Date) => simulados.find((s) => s.data === ymd(d));

  // Vista expandida: mês inteiro
  const monthGrid = useMemo(() => {
    const base = new Date();
    base.setDate(1);
    base.setMonth(base.getMonth() + monthOffset);
    const first = new Date(base);
    const last = new Date(base.getFullYear(), base.getMonth() + 1, 0);
    const startGrid = startOfWeekMon(first);
    const weeks: Date[][] = [];
    const cur = new Date(startGrid);
    while (cur <= last || weeks.length < 6) {
      const row: Date[] = [];
      for (let i = 0; i < 7; i++) {
        row.push(new Date(cur));
        cur.setDate(cur.getDate() + 1);
      }
      weeks.push(row);
      if (weeks.length >= 6) break;
    }
    return { weeks, monthDate: base };
  }, [monthOffset]);

  const monthLabel = monthGrid.monthDate.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });

  function addSimulado() {
    if (!novaData) return;
    let nome = novoNome.trim();
    if (simuladoSelecionadoId) {
      const sel = simuladosDisponiveis.find((s) => s.id === simuladoSelecionadoId);
      if (sel) nome = sel.nome;
    }
    if (!nome) return;
    const novo: Simulado = {
      id: crypto.randomUUID(),
      data: novaData,
      nome,
    };
    onSave({ ...settings, simulados: [...simulados, novo] });
    setNovoNome("");
    setNovaData("");
    setSimuladoSelecionadoId("");
  }

  function removeSimulado(id: string) {
    onSave({ ...settings, simulados: simulados.filter((s) => s.id !== id) });
  }

  const selectedDate = selectedDay ? new Date(selectedDay + "T00:00:00") : null;

  return (
    <>
      {/* Card compacto */}
      <button
        onClick={() => setOpen(true)}
        className={cn("paper-card w-full md:max-w-lg mx-auto text-left p-5 md:p-6 transition-all group", !reduceMotion && "hover:-translate-y-0.5")}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
              <CalendarDays className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h3 className="font-black text-base tracking-tight">Calendário</h3>
              <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                Últimas 6 semanas
              </p>
            </div>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest text-accent opacity-0 group-hover:opacity-100 transition-opacity">
            Expandir →
          </span>
        </div>

        <div className="space-y-1">
          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEK_LABELS.map((l, i) => (
              <div key={i} className="text-[9px] font-black text-muted-foreground text-center uppercase">
                {l}
              </div>
            ))}
          </div>
          {miniWeeks.map((w, i) => (
            <div key={i} className="grid grid-cols-7 gap-1">
              {w.map((d) => {
                const s = statusFor(d);
                const today = ymd(d) === ymd(new Date());
                const inicio = settings.data_inicio_plano && ymd(d) === ymd(new Date(settings.data_inicio_plano + "T00:00:00"));
                const prova = isProva(d);
                const sim = simNoDia(d);
                return (
                  <div
                    key={d.toISOString()}
                    className={cn(
                      "aspect-square rounded-md relative",
                      colorClass(s),
                      today && "ring-2 ring-accent ring-offset-1 ring-offset-background",
                    )}
                    title={`${d.toLocaleDateString("pt-BR")}${inicio ? " • Data de Início" : ""}${prova ? " • Prova" : ""}${sim ? ` • ${sim.nome}` : ""}`}
                  >
                    {prova && (
                      <Trophy className="h-2.5 w-2.5 text-white absolute top-0.5 right-0.5 drop-shadow" />
                    )}
                    {sim && !prova && (
                      <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-white shadow" />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mt-4 text-[10px] font-bold text-muted-foreground">
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> Início</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-emerald-500" /> Cumpriu</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-amber-400" /> Parcial</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-rose-500/80" /> Vazio</span>
          <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-muted" /> Off</span>
        </div>
      </button>

      {/* Dialog Expandido */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-[95vw] md:w-full rounded-[2rem] p-4 md:p-6 overflow-y-auto max-h-[95vh] minimal-scroll">
          <DialogHeader className="mb-2 md:mb-4">
            <DialogTitle className="font-black text-xl md:text-2xl tracking-tight flex items-center gap-2">
              <CalendarDays className="h-5 w-5 md:h-6 md:w-6 text-accent" />
              Calendário de Estudos
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] gap-6">
            {/* Mês */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Button variant="ghost" size="icon" onClick={() => setMonthOffset((x) => x - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="font-bold capitalize text-sm">{monthLabel}</span>
                <Button variant="ghost" size="icon" onClick={() => setMonthOffset((x) => x + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-7 gap-1.5 mb-1">
                {WEEK_LABELS.map((l, i) => (
                  <div key={i} className="text-[10px] font-black text-muted-foreground text-center uppercase">
                    {l}
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                {monthGrid.weeks.map((w, i) => (
                  <div key={i} className="grid grid-cols-7 gap-1.5">
                    {w.map((d) => {
                      const s = statusFor(d);
                      const today = ymd(d) === ymd(new Date());
                      const inicio = settings.data_inicio_plano && ymd(d) === ymd(new Date(settings.data_inicio_plano + "T00:00:00"));
                      const prova = isProva(d);
                      const sim = simNoDia(d);
                      const otherMonth = d.getMonth() !== monthGrid.monthDate.getMonth();
                      return (
                        <button
                          key={d.toISOString()}
                          onClick={() => {
                            setSelectedDay(ymd(d));
                            setNovaData(ymd(d));
                          }}
                          className={cn(
                            "aspect-square rounded-lg relative text-[10px] font-bold flex items-start justify-start p-1 transition-all",
                            !reduceMotion && "hover:scale-105",
                            colorClass(s),
                            otherMonth && "opacity-30",
                            today && "ring-2 ring-accent ring-offset-1 ring-offset-background",
                            selectedDay === ymd(d) && "ring-2 ring-foreground",
                          )}
                        >
                          <span className={cn("text-white drop-shadow", s === "off" || s === "futuro" ? "text-foreground" : "")}>
                            {d.getDate()}
                          </span>
                          {prova && <Trophy className="h-3 w-3 text-white absolute top-0.5 right-0.5 drop-shadow" />}
                          {sim && !prova && (
                            <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-white shadow" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Painel lateral */}
            <div className="space-y-4">
              {selectedDate && (
                <div className="p-4 rounded-2xl bg-muted/40 border border-border">
                  <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                    Dia selecionado
                  </p>
                  <p className="font-bold text-sm mt-1 capitalize">
                    {selectedDate.toLocaleDateString("pt-BR", {
                      weekday: "long",
                      day: "2-digit",
                      month: "long",
                    })}
                  </p>
                  <div className="mt-3 text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">OQs feitos</span>
                      <span className="font-bold">{counts[selectedDay!] || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Meta do dia</span>
                      <span className="font-bold">{metaDia((selectedDate.getDay() + 6) % 7)}</span>
                    </div>
                  </div>
                </div>
              )}

              {settings.data_inicio_plano && (
                <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-blue-500">Início do Plano</span>
                  </div>
                  <p className="text-sm font-bold mt-1">Sua jornada começou</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(settings.data_inicio_plano + "T00:00:00").toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              {settings.prova_data && (
                <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-accent" />
                    <span className="text-[10px] uppercase tracking-widest font-black text-accent">Prova</span>
                  </div>
                  <p className="text-sm font-bold mt-1">{settings.prova_nome || "Sua prova"}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(settings.prova_data).toLocaleDateString("pt-BR")}
                  </p>
                </div>
              )}

              <div className="p-4 rounded-2xl border border-border space-y-3">
                <p className="text-[10px] uppercase tracking-widest font-black">Simulados</p>
                {simulados.length === 0 && (
                  <p className="text-xs text-muted-foreground">Nenhum lembrete ainda.</p>
                )}
                {simulados
                  .sort((a, b) => a.data.localeCompare(b.data))
                  .map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-bold truncate">{s.nome}</p>
                        <p className="text-muted-foreground">
                          {new Date(s.data + "T00:00:00").toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeSimulado(s.id)}>
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}

                <div className="space-y-2 pt-2 border-t border-border">
                  {simuladosDisponiveis.length > 0 && (
                    <Select
                      value={simuladoSelecionadoId || "__custom__"}
                      onValueChange={(v) => {
                        if (v === "__custom__") {
                          setSimuladoSelecionadoId("");
                        } else {
                          setSimuladoSelecionadoId(v);
                          const sel = simuladosDisponiveis.find((s) => s.id === v);
                          if (sel) setNovoNome(sel.nome);
                        }
                      }}
                    >
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Escolher simulado cadastrado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__custom__">✏️ Digitar nome personalizado</SelectItem>
                        {simuladosDisponiveis.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.nome}
                            {s.especialidade ? ` — ${s.especialidade}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {!simuladoSelecionadoId && (
                    <Input
                      placeholder="Nome do simulado"
                      value={novoNome}
                      onChange={(e) => setNovoNome(e.target.value)}
                      className="h-9 text-xs"
                    />
                  )}
                  <Input
                    type="date"
                    value={novaData}
                    onChange={(e) => setNovaData(e.target.value)}
                    className="h-9 text-xs"
                  />
                  <Button size="sm" onClick={addSimulado} disabled={(!simuladoSelecionadoId && !novoNome) || !novaData} className="w-full gap-1">
                    <Plus className="h-3 w-3" /> Adicionar lembrete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

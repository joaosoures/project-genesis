import { useEffect, useMemo, useState } from "react";
import { CalendarDays, ClipboardCheck, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface SimuladoDisponivel {
  id: string;
  nome: string;
  especialidade?: string | null;
}

interface Agendamento {
  id: string;
  nome: string;
  data: string;
}

interface Props {
  settings: { simulados?: Agendamento[] };
  onSave: (next: any) => void;
}

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function AgendamentoSimulados({ settings, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [simulados, setSimulados] = useState<SimuladoDisponivel[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);

  const agendamentos = useMemo(
    () => [...(settings.simulados ?? [])].sort((a, b) => a.data.localeCompare(b.data)),
    [settings.simulados],
  );

  useEffect(() => {
    if (!open || simulados.length > 0) return;
    setLoading(true);
    supabase
      .from("simulados")
      .select("id, nome, especialidade")
      .order("created_at", { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error("Não foi possível carregar os simulados.");
        } else {
          setSimulados(data ?? []);
        }
        setLoading(false);
      });
  }, [open, simulados.length]);

  const agendar = () => {
    const simulado = simulados.find((item) => item.id === selectedId);
    if (!simulado || !date) {
      toast.error("Selecione um simulado e uma data.");
      return;
    }

    const novo = { id: simulado.id, nome: simulado.nome, data: date };
    const restantes = agendamentos.filter((item) => item.id !== simulado.id);
    onSave({ ...settings, simulados: [...restantes, novo] });
    setSelectedId("");
    setDate("");
    toast.success("Simulado agendado com sucesso!");
  };

  const remover = (id: string) => {
    onSave({ ...settings, simulados: agendamentos.filter((item) => item.id !== id) });
    toast.success("Agendamento removido.");
  };

  return (
    <>
      <section className="paper-card p-4 md:p-5 backdrop-blur-sm border border-border/40">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl grid place-items-center shrink-0 bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
                Organização da preparação
              </p>
              <h2 className="text-base md:text-lg font-black tracking-tight">
                Marque datas para simulados
              </h2>
              <p className="text-[11px] text-muted-foreground">
                Planeje suas provas e acompanhe o próximo desafio.
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 text-[10px] font-black uppercase tracking-wider bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white shadow"
          >
            <ClipboardCheck className="h-3.5 w-3.5" />
            Conferir meus agendamentos
          </Button>
        </div>
      </section>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="paper-card max-w-lg rounded-[2rem] border-border/60 p-0 shadow-2xl overflow-hidden">
          <div className="bg-[hsl(var(--accent)/0.08)] px-6 pt-7 pb-5 border-b border-border/50">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-xl font-black tracking-tight">
                Meus agendamentos
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                Escolha um simulado e a data em que pretende realizá-lo.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="px-6 py-5 space-y-5 max-h-[75vh] overflow-y-auto">
            <div className="rounded-2xl border border-border/60 bg-background/60 p-4 space-y-3">
              <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground" htmlFor="simulado">
                Simulado
              </label>
              {loading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando simulados...
                </div>
              ) : (
                <select
                  id="simulado"
                  value={selectedId}
                  onChange={(event) => setSelectedId(event.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Selecione um simulado</option>
                  {simulados.map((simulado) => (
                    <option key={simulado.id} value={simulado.id}>
                      {simulado.nome}
                    </option>
                  ))}
                </select>
              )}
              <label className="text-[10px] uppercase tracking-widest font-black text-muted-foreground" htmlFor="data-simulado">
                Data de realização
              </label>
              <Input
                id="data-simulado"
                type="date"
                min={new Date().toISOString().slice(0, 10)}
                value={date}
                onChange={(event) => setDate(event.target.value)}
                className="h-10 rounded-xl"
              />
              <Button type="button" onClick={agendar} disabled={loading || !simulados.length} className="w-full rounded-xl font-black">
                Confirmar agendamento
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                Próximos simulados
              </p>
              {agendamentos.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-5 text-center text-sm text-muted-foreground">
                  Nenhum simulado agendado ainda.
                </div>
              ) : (
                <ul className="divide-y divide-border/40 rounded-2xl border border-border/50 overflow-hidden">
                  {agendamentos.map((agendamento) => (
                    <li key={agendamento.id} className="flex items-center gap-3 bg-background/60 px-4 py-3">
                      <div className="h-9 w-9 rounded-xl bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))] grid place-items-center shrink-0">
                        <CalendarDays className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{agendamento.nome}</p>
                        <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">
                          {formatDate(agendamento.data)}
                        </p>
                      </div>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remover(agendamento.id)} aria-label={`Remover ${agendamento.nome}`} className="text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 pb-5 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl font-bold">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ClipboardCheck, Flame, Play, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import type { TrilhaSettings } from "@/hooks/useTrilhaPlano";

interface Agendamento { id: string; nome: string; data: string; data_castigo?: string }
interface Status { simulado: boolean; castigo: boolean; castigoDisponivel: boolean }
interface Props { settings: TrilhaSettings; semanaIndex: number; inicioPlano: Date; titulo?: string }

type CardItem = { agendamento: Agendamento; tipo: "simulado" | "castigo"; data: string };

function weekIndex(date: string, inicioPlano: Date) {
  return Math.floor((new Date(`${date}T00:00:00`).getTime() - inicioPlano.getTime()) / (7 * 86400000));
}
function formatDate(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function SimuladosDaTrilha({ settings, semanaIndex, inicioPlano, titulo = "Simulados e castigos" }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [statuses, setStatuses] = useState<Record<string, Status>>({});
  const itens = useMemo<CardItem[]>(() => (settings.simulados ?? []).flatMap((item) => [
    ...(weekIndex(item.data, inicioPlano) === semanaIndex ? [{ agendamento: item, tipo: "simulado" as const, data: item.data }] : []),
    ...(item.data_castigo && weekIndex(item.data_castigo, inicioPlano) === semanaIndex ? [{ agendamento: item, tipo: "castigo" as const, data: item.data_castigo }] : []),
  ]), [settings.simulados, inicioPlano, semanaIndex]);

  useEffect(() => {
    if (!user || !itens.length) return;
    let cancelled = false;
    const load = async () => {
      const ids = Array.from(new Set(itens.map(({ agendamento }) => agendamento.id)));
      const { data: attempts } = await supabase.from("simulado_tentativas")
        .select("id, simulado_id, concluido_em").eq("usuario_id", user.id).in("simulado_id", ids)
        .not("concluido_em", "is", null).order("concluido_em", { ascending: false });
      const latest = new Map<string, string>();
      (attempts ?? []).forEach((attempt) => {
        if (attempt.simulado_id && !latest.has(attempt.simulado_id)) latest.set(attempt.simulado_id, attempt.id);
      });
      const next: Record<string, Status> = {};
      ids.forEach((id) => { next[id] = { simulado: latest.has(id), castigo: false, castigoDisponivel: false }; });
      if (latest.size) {
        const { data: questoes } = await supabase.from("simulado_questoes").select("id, simulado_id").in("simulado_id", ids);
        const originalIds = (questoes ?? []).map((item) => item.id);
        const { data: filhas } = originalIds.length
          ? await supabase.from("castigo_filhas").select("id, questao_original_id").in("questao_original_id", originalIds).eq("ativo", true)
          : { data: [] };
        const filhaIds = (filhas ?? []).map((item) => item.id);
        const attemptIds = Array.from(latest.values());
        const { data: respostas } = filhaIds.length
          ? await supabase.from("castigo_respostas").select("filha_id, tentativa_id, finalizada_em").in("tentativa_id", attemptIds).in("filha_id", filhaIds)
          : { data: [] };
        ids.forEach((id) => {
          const attemptId = latest.get(id);
          const questionIds = (questoes ?? []).filter((q) => q.simulado_id === id).map((q) => q.id);
          const simFilhas = (filhas ?? []).filter((f) => questionIds.includes(f.questao_original_id));
          const simRespostas = (respostas ?? []).filter((r) => r.tentativa_id === attemptId);
          next[id] = { simulado: !!attemptId, castigoDisponivel: simFilhas.length > 0, castigo: simFilhas.length > 0 && simFilhas.every((f) => simRespostas.some((r) => r.filha_id === f.id && !!r.finalizada_em)) };
        });
      }
      if (!cancelled) setStatuses(next);
    };
    void load();
    return () => { cancelled = true; };
  }, [itens, user]);

  if (!itens.length) return null;
  return <div className="space-y-6 mb-12">
    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500 flex items-center gap-2"><ClipboardCheck className="h-4 w-4" />{titulo}</h3>
    <div className="grid sm:grid-cols-2 gap-4">
      {itens.map(({ agendamento, tipo, data }) => {
        const status = statuses[agendamento.id] ?? { simulado: false, castigo: false, castigoDisponivel: false };
        const done = tipo === "simulado" ? status.simulado : status.castigo;
        return <div key={`${tipo}-${agendamento.id}`} className={cn("paper-card p-5 group relative transition-all border-2 border-rose-200/50 bg-rose-50/10", done && "opacity-70 grayscale-[0.3]")}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="space-y-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1.5"><Badge variant="secondary" className="rounded-md text-[8px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 px-1.5 py-0">{tipo}</Badge><Badge variant="outline" className="rounded-md text-[7px] font-black uppercase tracking-widest border-rose-200 text-rose-500 px-1.5 py-0">{formatDate(data)}</Badge></div>
              <h4 className={cn("font-bold text-base leading-tight tracking-tight", done && "line-through text-muted-foreground")}>{agendamento.nome}</h4>
              <p className="text-[10px] font-bold text-muted-foreground">{tipo === "simulado" ? "Finalize o simulado para concluir este card." : "Finalize todas as questões castigo para concluir este card."}</p>
            </div>
            <div className={cn("h-8 w-8 rounded-xl border-2 grid place-items-center shrink-0", done ? "bg-emerald-500 border-emerald-500 text-white" : "border-rose-200 bg-white")}>{done && <Check className="h-5 w-5" />}</div>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button size="sm" variant="ghost" className="rounded-xl bg-rose-50 text-[9px] font-black uppercase tracking-widest h-9 gap-1.5 border border-rose-100" onClick={() => navigate(`/materiais?simulado_id=${agendamento.id}&relatorio=1`)}><Target className="h-3.5 w-3.5 text-rose-500" />Ver resultado</Button>
            <Button size="sm" className="rounded-xl font-black text-[9px] uppercase tracking-widest h-9 gap-1.5 bg-rose-500 hover:bg-rose-600 text-white shadow-md" disabled={tipo === "castigo" && !status.castigoDisponivel} onClick={() => navigate(`/materiais?simulado_id=${agendamento.id}${tipo === "castigo" ? "&relatorio=1" : ""}`)}>{tipo === "castigo" ? <Flame className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}{tipo === "castigo" ? (status.castigoDisponivel ? "Fazer castigo" : "Aguardando") : "Fazer simulado"}</Button>
          </div>
        </div>;
      })}
    </div>
  </div>;
}

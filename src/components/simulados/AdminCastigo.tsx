import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import CastigoCuradoria from "./CastigoCuradoria";

type Questao = { id: string; comando: string; ordem: number | null; simulado_id: string | null };

export default function AdminCastigo() {
  const [simulados, setSimulados] = useState<{ id: string; nome: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Questao | null>(null);

  useEffect(() => {
    supabase.from("simulados").select("id,nome").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar os simulados.");
      else setSimulados(data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selected) { setQuestoes([]); return; }
    supabase.from("simulado_questoes").select("id,comando,ordem,simulado_id").eq("simulado_id", selected).order("ordem").then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar as questões.");
      else setQuestoes(data ?? []);
    });
  }, [selected]);

  return <div className="space-y-4">
    <h2 className="text-xl font-bold">Castigo do Simulado</h2>
    <p className="text-sm text-muted-foreground">Selecione um simulado e uma questão para revisar as filhas geradas.</p>
    <div className="flex flex-wrap gap-2">{simulados.map(s => <Button key={s.id} size="sm" variant={selected === s.id ? "default" : "outline"} onClick={() => setSelected(s.id)}>{s.nome}</Button>)}</div>
    {selected && <Input placeholder="Buscar questão..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-md" />}
    {questoes.filter(q => q.comando.toLowerCase().includes(busca.toLowerCase())).map(q => <Card key={q.id} className="p-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm flex-1 line-clamp-2">{q.ordem ?? "—"}. {q.comando}</p><Button size="sm" onClick={() => setEditing(q)}>Curadoria</Button></Card>)}
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Curadoria · {editing?.comando.slice(0, 80)}</DialogTitle></DialogHeader>
        {editing && <CastigoCuradoria key={editing.id} originalId={editing.id} />}
      </DialogContent>
    </Dialog>
  </div>;
}

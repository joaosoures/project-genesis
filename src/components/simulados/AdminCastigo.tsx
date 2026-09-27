import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import CastigoCuradoria from "./CastigoCuradoria";

type Questao = { id: string; comando: string; ordem: number | null; simulado_id: string | null };

export default function AdminCastigo() {
  const [simulados, setSimulados] = useState<{ id: string; nome: string }[]>([]);
  const [selected, setSelected] = useState("");
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [filhasTitulares, setFilhasTitulares] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");
  const [editing, setEditing] = useState<Questao | null>(null);

  useEffect(() => {
    supabase.from("simulados").select("id,nome").order("created_at", { ascending: false }).then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar os simulados.");
      else setSimulados(data ?? []);
    });
  }, []);

  useEffect(() => {
    if (!selected) {
      setQuestoes([]);
      setFilhasTitulares({});
      return;
    }

    const loadQuestions = async () => {
      const { data, error } = await supabase
        .from("simulado_questoes")
        .select("id,comando,ordem,simulado_id")
        .eq("simulado_id", selected)
        .order("ordem");

      if (error) {
        toast.error("Não foi possível carregar as questões.");
        return;
      }

      const loadedQuestions = data ?? [];
      setQuestoes(loadedQuestions);
      setFilhasTitulares({});

      if (loadedQuestions.length === 0) return;

      const { data: children, error: childrenError } = await supabase
        .from("castigo_filhas")
        .select("questao_original_id")
        .in("questao_original_id", loadedQuestions.map(question => question.id))
        .eq("ativo", true);

      if (childrenError) {
        toast.error("Não foi possível carregar o número de questões filhas.");
        return;
      }

      const counts = (children ?? []).reduce<Record<string, number>>((result, child) => {
        result[child.questao_original_id] = (result[child.questao_original_id] ?? 0) + 1;
        return result;
      }, {});
      setFilhasTitulares(counts);
    };

    void loadQuestions();
  }, [selected]);

  return <div className="space-y-4">
    <h2 className="text-xl font-bold">Castigo do Simulado</h2>
    <p className="text-sm text-muted-foreground">Selecione um simulado e uma questão para revisar as filhas geradas.</p>
    <div className="flex flex-wrap gap-2">{simulados.map(s => <Button key={s.id} size="sm" variant={selected === s.id ? "default" : "outline"} onClick={() => setSelected(s.id)}>{s.nome}</Button>)}</div>
    {selected && <Input placeholder="Buscar questão..." value={busca} onChange={e => setBusca(e.target.value)} className="max-w-md" />}
    {questoes.filter(q => q.comando.toLowerCase().includes(busca.toLowerCase())).map(q => <Card key={q.id} className="p-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm flex-1 line-clamp-2">{q.ordem == null ? "—" : `${q.ordem + 1}.`} {q.comando}</p><div className="flex items-center gap-2"><Badge variant="secondary">{filhasTitulares[q.id] ?? 0} filhas</Badge><Button size="sm" onClick={() => setEditing(q)}>Curadoria</Button></div></Card>)}
    <Dialog open={!!editing} onOpenChange={open => { if (!open) setEditing(null); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Curadoria · {editing?.comando.slice(0, 80)}</DialogTitle></DialogHeader>
        {editing && <CastigoCuradoria key={editing.id} originalId={editing.id} />}
      </DialogContent>
    </Dialog>
  </div>;
}

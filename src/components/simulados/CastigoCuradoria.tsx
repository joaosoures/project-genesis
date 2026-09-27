import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

type Filha = Database["public"]["Tables"]["castigo_filhas"]["Row"];

export default function CastigoCuradoria({ originalId }: { originalId: string }) {
  const [observacao, setObservacao] = useState("");
  const [filhas, setFilhas] = useState<Filha[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    const [note, children] = await Promise.all([
      supabase.from("castigo_observacoes").select("observacao").eq("questao_original_id", originalId).maybeSingle(),
      supabase.from("castigo_filhas").select("*").eq("questao_original_id", originalId).order("posicao").order("versao", { ascending: false })
    ]);
    if (note.error || children.error) toast.error("Não foi possível carregar a curadoria.");
    else {
      setObservacao(note.data?.observacao ?? "");
      setFilhas(children.data ?? []);
    }
    setLoading(false);
  }, [originalId]);

  useEffect(() => { void reload(); }, [reload]);

  const saveNote = async () => {
    setBusy(true);
    const { error } = await supabase.from("castigo_observacoes").upsert({ questao_original_id: originalId, observacao: observacao.trim(), updated_at: new Date().toISOString() });
    setBusy(false);
    if (error) toast.error("Não foi possível salvar a observação.");
    else toast.success("Observação salva.");
  };

  const generate = async (posicao?: number) => {
    setBusy(true);
    try {
      // A observação salva no servidor é a única usada na geração.
      const { error: noteError } = await supabase.from("castigo_observacoes").upsert({ questao_original_id: originalId, observacao: observacao.trim(), updated_at: new Date().toISOString() });
      if (noteError) throw noteError;
      const { data, error } = await supabase.functions.invoke("gerar-castigo-simulado", { body: { originalId, posicao: posicao ?? null } });
      if (error || !data?.success) throw new Error(data?.error ?? "Falha na geração. Tente novamente.");
      toast.success(posicao ? `Filha ${posicao} regenerada.` : "Três filhas publicadas.");
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar o castigo.");
    } finally {
      setBusy(false);
    }
  };

  const archive = async (filha: Filha) => {
    if (!window.confirm(`Arquivar a filha ${filha.posicao}? O histórico de respostas será preservado.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("castigo_arquivar", { p_filha: filha.id });
    if (error) toast.error(error.message);
    else { toast.success("Filha arquivada."); await reload(); }
    setBusy(false);
  };

  const restore = async (filha: Filha) => {
    if (!window.confirm(`Restaurar a versão ${filha.versao} como titular da filha ${filha.posicao}? A titular atual, se existir, será arquivada.`)) return;
    setBusy(true);
    const { error } = await supabase.rpc("castigo_restaurar", { p_filha: filha.id });
    if (error) toast.error(error.message);
    else { toast.success("Questão restaurada como titular."); await reload(); }
    setBusy(false);
  };

  if (loading) return <div className="flex items-center gap-2 text-sm p-4"><Loader2 className="h-4 w-4 animate-spin" /> Carregando castigo...</div>;
  const active = filhas.filter(f => f.ativo);
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor={`obs-${originalId}`}>Observação contextual para a IA</Label>
        <Textarea id={`obs-${originalId}`} value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Indique pontos de atenção para esta questão..." maxLength={4000} />
        <Button size="sm" variant="outline" disabled={busy} onClick={saveNote}>Salvar observação</Button>
      </div>
      {active.length === 0 && <Button disabled={busy} onClick={() => generate()}>{busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Gerar 3 filhas com IA</Button>}
      {active.length === 0 && <p className="text-sm text-muted-foreground">Não há questões semelhantes disponíveis no momento</p>}
      {[1, 2, 3].map(posicao => {
        const current = active.find(f => f.posicao === posicao);
        const history = filhas.filter(f => f.posicao === posicao && !f.ativo);
        return (
          <Card key={posicao} className="p-4 space-y-3 bg-background/70">
            <div className="flex flex-wrap justify-between items-center gap-2">
              <h4 className="font-bold">Filha {posicao} {current ? `· versão ${current.versao}` : "· pendente"}</h4>
              <div className="flex gap-2">
                {active.length > 0 && <Button size="sm" variant="outline" disabled={busy} onClick={() => generate(posicao)}>{current ? "Regenerar" : "Gerar"}</Button>}
                {current && <Button size="sm" variant="destructive" disabled={busy} onClick={() => archive(current)}>Arquivar</Button>}
              </div>
            </div>
            {current && <>
              <p className="whitespace-pre-wrap text-sm">{current.questao}</p>
              {(["a", "b", "c", "d", "e"] as const).map(letter => <p key={letter} className="text-sm"><strong>{letter.toUpperCase()}.</strong> {current[`alt_${letter}`]}</p>)}
              <p className="text-sm font-semibold">Gabarito: {current.gabarito}</p>
              <p className="text-sm whitespace-pre-wrap">{current.justificativa}</p>
            </>}
            {history.length > 0 && <details className="text-xs text-muted-foreground"><summary className="cursor-pointer">{history.length} versão(ões) arquivada(s)</summary>{history.map(f => <div key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2"><p>Versão {f.versao}: {f.questao}</p><Button size="sm" variant="outline" disabled={busy} onClick={() => restore(f)}>Restaurar como titular</Button></div>)}</details>}
          </Card>
        );
      })}
    </div>
  );
}

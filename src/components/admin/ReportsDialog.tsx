import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ExternalLink, CheckCircle2, Clock, FileText, BookOpen } from "lucide-react";
import { toast } from "sonner";

type Item = {
  id: string;
  source: "reports_erro" | "problemas_admin";
  tipo: string;
  origem: "OQ" | "Material / resumo";
  titulo?: string;
  comentario?: string;
  status: string;
  criado_em: string;
  card_id?: string | null;
  card_comando?: string | null;
  material_id?: string | null;
  material_nome?: string | null;
  usuario?: string;
};

const pendingStatuses = ["pendente", "aberto", "em_andamento", "em_analise"];

function labelTipo(tipo: string) {
  return tipo.replace(/_/g, " ");
}

export default function ReportsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [repRes, probRes] = await Promise.all([
        supabase.from("reports_erro").select("id, tipo, comentario, status, criado_em, card_id, usuario_id").order("criado_em", { ascending: false }).limit(100),
        supabase.from("problemas_admin").select("id, titulo, descricao, status, origem, criado_em, card_id").order("criado_em", { ascending: false }).limit(100),
      ]);

      if (repRes.error) throw repRes.error;
      if (probRes.error) throw probRes.error;

      const reps = (repRes.data as any[]) ?? [];
      const probs = (probRes.data as any[]) ?? [];
      const cardIds = Array.from(new Set([...reps.map((r) => r.card_id), ...probs.map((p) => p.card_id)].filter(Boolean)));
      const userIds = Array.from(new Set(reps.map((r) => r.usuario_id).filter(Boolean)));
      const materialIds = Array.from(new Set(probs.map((p) => {
        const match = String(p.descricao || "").match(/Material ID:\s*([^\n]+)/i);
        return match?.[1]?.trim();
      }).filter(Boolean)));

      const [cardsRes, profsRes, materialsRes] = await Promise.all([
        cardIds.length ? supabase.from("cards").select("id, comando").in("id", cardIds) : Promise.resolve({ data: [] as any[], error: null }),
        userIds.length ? supabase.from("profiles").select("id, nome, email").in("id", userIds) : Promise.resolve({ data: [] as any[], error: null }),
        materialIds.length ? supabase.from("materiais").select("id, nome").in("id", materialIds) : Promise.resolve({ data: [] as any[], error: null }),
      ]);

      const cardsById = Object.fromEntries(((cardsRes.data as any[]) ?? []).map((c) => [c.id, c.comando]));
      const profsById = Object.fromEntries(((profsRes.data as any[]) ?? []).map((p) => [p.id, p.nome || p.email]));
      const materialsById = Object.fromEntries(((materialsRes.data as any[]) ?? []).map((m) => [m.id, m.nome]));

      const merged: Item[] = [
        ...reps.map((r) => ({
          id: r.id,
          source: "reports_erro" as const,
          tipo: r.tipo,
          origem: "OQ" as const,
          comentario: r.comentario,
          status: r.status,
          criado_em: r.criado_em,
          card_id: r.card_id,
          card_comando: cardsById[r.card_id],
          usuario: profsById[r.usuario_id],
        })),
        ...probs.map((p) => {
          const description = String(p.descricao || "");
          const materialId = description.match(/Material ID:\s*([^\n]+)/i)?.[1]?.trim() || null;
          const comment = description.match(/Comentário:\s*([\s\S]*)$/i)?.[1]?.trim() || description;
          const tipo = description.match(/Tipo:\s*([^\n]+)/i)?.[1]?.trim() || p.origem || "material_report";
          return {
            id: p.id,
            source: "problemas_admin" as const,
            tipo,
            origem: "Material / resumo" as const,
            titulo: p.titulo,
            comentario: comment,
            status: p.status,
            criado_em: p.criado_em,
            card_id: p.card_id,
            card_comando: cardsById[p.card_id],
            material_id: materialId,
            material_nome: materialId ? materialsById[materialId] : null,
          };
        }),
      ].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

      setItems(merged);
    } catch (error) {
      console.error("Erro ao carregar reports:", error);
      toast.error("Erro ao carregar reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const markAsSeen = async (item: Item) => {
    const update = item.source === "reports_erro"
      ? { status: "resolvido", resolvido_em: new Date().toISOString() }
      : { status: "resolvido" };
    const { error } = await supabase.from(item.source as any).update(update).eq("id", item.id);
    if (error) {
      toast.error("Não foi possível marcar o report como visto");
      return;
    }
    toast.success("Report marcado como visto");
    setItems((current) => current.map((entry) => entry.id === item.id && entry.source === item.source ? { ...entry, status: "resolvido" } : entry));
  };

  const pending = items.filter((item) => pendingStatuses.includes(item.status));
  const resolved = items.filter((item) => !pendingStatuses.includes(item.status));

  const renderItem = (r: Item) => (
    <div key={`${r.source}-${r.id}`} className="p-4 rounded-xl bg-muted/20 border border-border/50 space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Badge className={r.origem === "OQ" ? "bg-primary/15 text-primary border-primary/20" : "bg-blue-500/15 text-blue-400 border-blue-500/20"}>
          {r.origem === "OQ" ? <BookOpen size={12} className="mr-1" /> : <FileText size={12} className="mr-1" />}
          {r.origem}
        </Badge>
        <Badge variant="outline" className="text-[10px] uppercase">{labelTipo(r.tipo)}</Badge>
        <Badge variant="outline" className="text-[10px] capitalize gap-1"><Clock size={10} /> {labelTipo(r.status)}</Badge>
        <span className="text-[10px] text-muted-foreground ml-auto">{new Date(r.criado_em).toLocaleString("pt-BR")}</span>
      </div>

      {r.origem === "OQ" ? (
        <div className="text-xs p-3 rounded-lg bg-background/50 border border-border/30">
          <p className="font-bold text-primary mb-1">OQ reportado</p>
          <p>{r.card_comando || `OQ não encontrado (${r.card_id || "sem vínculo"})`}</p>
        </div>
      ) : (
        <div className="text-xs p-3 rounded-lg bg-background/50 border border-border/30 space-y-1">
          <p className="font-bold text-blue-400">Material reportado</p>
          <p>{r.material_nome || "Material não encontrado"}</p>
          {r.material_id && <p className="text-[10px] text-muted-foreground font-mono">ID: {r.material_id}</p>}
        </div>
      )}

      {r.titulo && <p className="text-sm font-bold text-primary">{r.titulo}</p>}
      <div className="text-sm"><span className="font-semibold">Comentário do aluno:</span> {r.comentario || "Sem comentário"}</div>
      {r.usuario && <p className="text-[10px] text-muted-foreground">Enviado por: {r.usuario}</p>}

      <div className="flex gap-2 pt-1 flex-wrap">
        {r.origem === "OQ" && r.card_id && (
          <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => window.open(`/banco-cards?editar=${encodeURIComponent(r.card_id!)}`, "_blank") }>
            <ExternalLink size={12} /> Editar OQ / excluir
          </Button>
        )}
        {r.origem === "Material / resumo" && r.material_id && (
          <Button size="sm" variant="outline" className="h-8 text-[11px] gap-1" onClick={() => window.open(`/materiais?id=${encodeURIComponent(r.material_id!)}`, "_blank")}>
            <ExternalLink size={12} /> Abrir material
          </Button>
        )}
        {pendingStatuses.includes(r.status) && (
          <Button size="sm" className="h-8 text-[11px] gap-1 ml-auto" onClick={() => markAsSeen(r)}>
            <CheckCircle2 size={12} /> Marcar como visto
          </Button>
        )}
      </div>
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-red-500/20 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><AlertCircle className="text-red-400" /> Reports Pendentes</DialogTitle>
          <DialogDescription>{pending.length} pendente(s) • {resolved.length} já visto(s). O vínculo mostra exatamente se o report veio de um OQ ou de um material.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[560px] mt-2 pr-4">
          {loading ? <p className="text-center py-12 text-muted-foreground text-sm">Carregando…</p> : items.length === 0 ? <p className="text-center py-12 text-muted-foreground text-sm">Nenhum report registrado. 🎉</p> : (
            <div className="space-y-5">
              {pending.length > 0 && <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wider text-red-400">Aguardando ação</h3>{pending.map(renderItem)}</section>}
              {resolved.length > 0 && <section className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Já vistos</h3>{resolved.map(renderItem)}</section>}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { AlertCircle, ExternalLink, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";

type Item = {
  id: string;
  source: "reports_erro" | "problemas_admin";
  tipo: string;
  titulo?: string;
  comentario?: string;
  status: string;
  criado_em: string;
  card_id?: string | null;
  card_comando?: string | null;
  usuario?: string;
};

export default function ReportsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      // Buscar TODOS os reports (não só pendentes) para o admin ter visão completa
      const [repRes, probRes] = await Promise.all([
        supabase
          .from("reports_erro")
          .select("id, tipo, comentario, status, criado_em, card_id, usuario_id")
          .order("criado_em", { ascending: false })
          .limit(100),
        supabase
          .from("problemas_admin")
          .select("id, titulo, descricao, status, origem, criado_em, card_id")
          .order("criado_em", { ascending: false })
          .limit(100),
      ]);

      if (repRes.error) console.error("reports_erro:", repRes.error);
      if (probRes.error) console.error("problemas_admin:", probRes.error);

      const reps = (repRes.data as any[]) ?? [];
      const probs = (probRes.data as any[]) ?? [];

      // Buscar cards e profiles relacionados em paralelo
      const cardIds = Array.from(
        new Set([...reps.map((r) => r.card_id), ...probs.map((p) => p.card_id)].filter(Boolean)),
      );
      const userIds = Array.from(new Set(reps.map((r) => r.usuario_id).filter(Boolean)));

      const [cardsRes, profsRes] = await Promise.all([
        cardIds.length
          ? supabase.from("cards").select("id, comando").in("id", cardIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.from("profiles").select("id, nome, email").in("id", userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const cardsById: Record<string, string> = {};
      ((cardsRes.data as any[]) ?? []).forEach((c) => {
        cardsById[c.id] = c.comando;
      });
      const profsById: Record<string, { nome?: string; email?: string }> = {};
      ((profsRes.data as any[]) ?? []).forEach((p) => {
        profsById[p.id] = { nome: p.nome, email: p.email };
      });

      const merged: Item[] = [
        ...reps.map((r) => ({
          id: r.id,
          source: "reports_erro" as const,
          tipo: r.tipo,
          comentario: r.comentario,
          status: r.status,
          criado_em: r.criado_em,
          card_id: r.card_id,
          card_comando: r.card_id ? cardsById[r.card_id] : undefined,
          usuario: profsById[r.usuario_id]?.nome || profsById[r.usuario_id]?.email,
        })),
        ...probs.map((p) => ({
          id: p.id,
          source: "problemas_admin" as const,
          tipo: p.origem || "problema_admin",
          titulo: p.titulo,
          comentario: p.descricao,
          status: p.status,
          criado_em: p.criado_em,
          card_id: p.card_id,
          card_comando: p.card_id ? cardsById[p.card_id] : undefined,
        })),
      ].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

      setItems(merged);
    } catch (e) {
      console.error(e);
      toast.error("Erro ao carregar reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const updateStatus = async (it: Item, status: string) => {
    const { error } = await supabase.from(it.source as any).update({ status }).eq("id", it.id);
    if (error) toast.error("Erro ao atualizar");
    else {
      toast.success("Status atualizado");
      load();
    }
  };

  const pendentes = items.filter((i) => ["pendente", "aberto", "em_andamento", "em_analise"].includes(i.status));
  const resolvidos = items.filter((i) => !["pendente", "aberto", "em_andamento", "em_analise"].includes(i.status));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-red-500/20 max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="text-red-400" /> Reports do App
          </DialogTitle>
          <DialogDescription>
            {pendentes.length} pendente(s) • {resolvidos.length} resolvido(s). Edite o OQ diretamente ou marque como resolvido.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[500px] mt-2 pr-4">
          {loading ? (
            <p className="text-center py-12 text-muted-foreground text-sm">Carregando…</p>
          ) : items.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">Nenhum report registrado. 🎉</p>
          ) : (
            <div className="space-y-3">
              {items.map((r) => (
                <div key={`${r.source}-${r.id}`} className="p-3 rounded-lg bg-muted/20 border border-border/50 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-[10px] uppercase">{r.tipo.replace(/_/g, " ")}</Badge>
                    <Badge variant="outline" className="text-[10px] capitalize gap-1">
                      <Clock size={10} /> {r.status.replace("_", " ")}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {new Date(r.criado_em).toLocaleString("pt-BR")}
                    </span>
                  </div>
                  {r.titulo && <p className="text-sm font-bold text-primary">{r.titulo}</p>}
                  {r.comentario && <p className="text-xs">{r.comentario}</p>}
                  {r.card_comando && (
                    <div className="text-[11px] p-2 rounded bg-background/40 border border-border/30">
                      <span className="font-bold text-primary">OQ:</span> {r.card_comando.slice(0, 200)}
                      {r.card_comando.length > 200 && "…"}
                    </div>
                  )}
                  {r.usuario && <p className="text-[10px] text-muted-foreground">Por: {r.usuario}</p>}
                  <div className="flex gap-2 pt-1">
                    {r.card_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-[11px] gap-1"
                        onClick={() => window.open(`/estudo?id=${r.card_id}`, "_blank")}
                      >
                        <ExternalLink size={12} /> Abrir / Editar OQ
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-[11px] gap-1"
                      onClick={() => updateStatus(r, r.source === "problemas_admin" ? "em_andamento" : "em_analise")}
                    >
                      Em análise
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-[11px] gap-1 ml-auto"
                      onClick={() => updateStatus(r, "resolvido")}
                    >
                      <CheckCircle2 size={12} /> Resolver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

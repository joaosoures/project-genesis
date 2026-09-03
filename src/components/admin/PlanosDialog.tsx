import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ShieldCheck, Award, Star, XCircle, AlertCircle, Search } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Row = {
  usuario_id: string;
  plano: string;
  status: string;
  proxima_renovacao: string | null;
  valor_mensal: number;
  data_inicio_plano: string | null;
  nome?: string;
  email?: string;
};

export default function PlanosDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("assinaturas")
      .select("usuario_id, plano, status, proxima_renovacao, valor_mensal, data_inicio_plano")
      .neq("status", "trial")
      .order("data_inicio_plano", { ascending: false });

    if (error) {
      console.error("Erro planos:", error);
      toast.error("Erro ao carregar planos");
      setLoading(false);
      return;
    }

    const list = (data as any[]) ?? [];
    const userIds = Array.from(new Set(list.map((r) => r.usuario_id).filter(Boolean)));

    let profilesById: Record<string, { nome?: string; email?: string }> = {};
    if (userIds.length > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .in("id", userIds);
      (profs as any[] ?? []).forEach((p) => {
        profilesById[p.id] = { nome: p.nome, email: p.email };
      });
    }

    setRows(
      list.map((r) => ({
        ...r,
        nome: profilesById[r.usuario_id]?.nome,
        email: profilesById[r.usuario_id]?.email,
      })),
    );
    setLoading(false);
  };

  useEffect(() => {
    if (open) load();
  }, [open]);

  const update = async (userId: string, plano: string, status: string) => {
    const { error } = await supabase
      .from("assinaturas")
      .update({ plano: plano as any, status: status as any, atualizado_em: new Date().toISOString() })
      .eq("usuario_id", userId);
    if (error) toast.error("Erro");
    else {
      toast.success("Atualizado");
      load();
    }
  };

  const filtered = rows.filter(
    (r) =>
      !q ||
      r.nome?.toLowerCase().includes(q.toLowerCase()) ||
      r.email?.toLowerCase().includes(q.toLowerCase()),
  );

  const totalMrr = rows.reduce((s, r) => s + Number(r.valor_mensal || 0), 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-green-500/20 max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="text-green-400" /> Usuários Pagantes
          </DialogTitle>
          <DialogDescription>
            Controle de assinaturas Ouro e Prata ativas. MRR atual: <strong>R$ {totalMrr.toLocaleString("pt-BR")}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 h-9"
          />
        </div>

        <ScrollArea className="h-[500px] pr-3">
          {loading ? (
            <p className="text-center py-12 text-muted-foreground text-sm">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-center py-12 text-muted-foreground text-sm">Nenhum assinante ativo.</p>
          ) : (
            <div className="space-y-2">
              {filtered.map((r) => (
                <div
                  key={r.usuario_id}
                  className="p-3 rounded-lg bg-muted/20 border border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm truncate">{r.nome || "—"}</p>
                      {r.plano === "ouro" ? (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1"><Award size={10} /> Ouro</Badge>
                      ) : r.plano === "prata" ? (
                        <Badge className="bg-slate-300/20 text-slate-300 border-slate-300/30 gap-1"><Star size={10} /> Prata</Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">{r.plano}</Badge>
                      )}
                      <Badge variant="secondary" className={cn(
                        "text-[10px]",
                        r.status === 'ativo' ? "bg-green-500/10 text-green-400 border-green-500/20" : 
                        r.status === 'inadimplente' ? "bg-orange-500/10 text-orange-400 border-orange-500/20" :
                        "bg-red-500/10 text-red-400 border-red-500/20"
                      )}>
                        {r.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">{r.email}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Início: {r.data_inicio_plano ? new Date(r.data_inicio_plano).toLocaleDateString("pt-BR") : "—"} • Próx. renovação:{" "}
                      {r.proxima_renovacao ? new Date(r.proxima_renovacao).toLocaleDateString("pt-BR") : "—"} • R$ {Number(r.valor_mensal).toFixed(2)}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {r.plano !== "ouro" && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-yellow-500" onClick={() => update(r.usuario_id, "ouro", "ativo")}>
                        <Award size={12} /> Para Ouro
                      </Button>
                    )}
                    {r.plano !== "prata" && (
                      <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-slate-300" onClick={() => update(r.usuario_id, "prata", "ativo")}>
                        <Star size={12} /> Para Prata
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-orange-400" onClick={() => update(r.usuario_id, r.plano, "inadimplente")}>
                      <AlertCircle size={12} /> Inadimplente
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1 text-red-400" onClick={() => update(r.usuario_id, r.plano, "cancelado")}>
                      <XCircle size={12} /> Cancelar
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

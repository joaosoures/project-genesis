import { useEffect, useState } from "react";
import { Pencil, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TactileButton from "@/components/console/TactileButton";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";

type CardRow = any;

export function AdminEditCardBtn({ cardId, onSaved }: { cardId: string; onSaved?: (card: any) => void }) {
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [card, setCard] = useState<CardRow | null>(null);

  useEffect(() => {
    if (!open) {
      setCard(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase.from("cards").select("*").eq("id", cardId).maybeSingle().then(({ data, error }) => {
      if (cancelled) return;
      if (error) toast.error("Erro ao carregar OQ");
      setCard(data);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, cardId]);

  function update<K extends string>(key: K, value: any) {
    setCard((c: any) => (c ? { ...c, [key]: value } : c));
  }

  if (!isAdmin) return null;


  async function salvar() {
    if (!card) return;
    setSaving(true);
    const { id, criado_em, atualizado_em, criado_por_usuario_id, origem, ...payload } = card;
    const { error } = await supabase.from("cards").update(payload).eq("id", id);
    setSaving(false);
    if (error) { toast.error("Erro ao salvar: " + error.message); return; }
    toast.success("OQ atualizado com sucesso");
    setOpen(false);
    onSaved?.(card);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Editar OQ (admin)"
        className="h-10 w-10 rounded-full grid place-items-center hover:bg-[hsl(var(--muted))] transition"
      >
        <Pencil className="h-4 w-4 text-[hsl(var(--primary))]" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] p-0 rounded-2xl overflow-hidden flex flex-col">
          <DialogHeader className="px-5 py-4 border-b shrink-0">
            <DialogTitle>Editar OQ</DialogTitle>
            <DialogDescription className="text-xs">
              Edição de administrador • ID: <span className="font-mono">{cardId.slice(0, 8)}</span>
            </DialogDescription>
          </DialogHeader>

          {loading || !card ? (
            <div className="flex-1 grid place-items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ScrollArea className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-5">
                {/* Metadados */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Especialidade</Label>
                    <Select value={card.especialidade} onValueChange={(v) => update("especialidade", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {Object.entries(ESPECIALIDADE_LABEL).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v as string}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Modo</Label>
                    <Select value={card.modo} onValueChange={(v) => update("modo", v)}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="abcde">ABCDE</SelectItem>
                        <SelectItem value="lacuna">Lacuna</SelectItem>
                        <SelectItem value="oq_falta">OQ Falta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Peso (1-10)</Label>
                    <Input
                      type="number" min={1} max={10}
                      value={card.peso_importancia ?? 5}
                      onChange={(e) => update("peso_importancia", parseInt(e.target.value) || 5)}
                    />
                  </div>
                </div>

                {/* Comando */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Comando / Pergunta</Label>
                  <Textarea
                    value={card.comando ?? ""}
                    onChange={(e) => update("comando", e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Alternativas (apenas para abcde) */}
                {card.modo === "abcde" && (
                  <div className="space-y-3">
                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Alternativas</Label>
                    {(["a", "b", "c", "d", "e"] as const).map((letra) => {
                      const key = `alternativa_${letra}` as const;
                      const isCorreta = card.alternativa_correta?.toLowerCase() === letra;
                      return (
                        <div key={letra} className="flex gap-2 items-start">
                          <button
                            type="button"
                            onClick={() => update("alternativa_correta", letra.toUpperCase())}
                            translate="no"
                            className={`shrink-0 h-9 w-9 rounded-lg font-black text-sm grid place-items-center transition ${
                              isCorreta
                                ? "bg-emerald-500 text-white shadow-md"
                                : "bg-muted text-muted-foreground hover:bg-muted/70"
                            }`}
                            title="Marcar como correta"
                          >
                            {letra.toUpperCase()}
                          </button>
                          <Textarea
                            value={card[key] ?? ""}
                            onChange={(e) => update(key, e.target.value)}
                            rows={2}
                            className="resize-none text-sm"
                            placeholder={`Alternativa ${letra.toUpperCase()}`}
                          />
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Variações + Infos (1-5) */}
                <div className="space-y-3">
                  <Label className="text-xs uppercase tracking-wide text-muted-foreground">Variações / Infos</Label>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <div key={n} className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        placeholder={`var_${n}`}
                        value={card[`var_${n}`] ?? ""}
                        onChange={(e) => update(`var_${n}`, e.target.value)}
                      />
                      <Input
                        placeholder={`info_${n}`}
                        value={card[`info_${n}`] ?? ""}
                        onChange={(e) => update(`info_${n}`, e.target.value)}
                      />
                    </div>
                  ))}
                </div>

                {/* Explicação */}
                <div className="space-y-1.5">
                  <Label className="text-xs">Explicação</Label>
                  <Textarea
                    value={card.explicacao ?? ""}
                    onChange={(e) => update("explicacao", e.target.value)}
                    rows={5}
                    className="resize-none"
                  />
                </div>

                {/* Verificado */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/40">
                  <div>
                    <Label className="text-sm">Verificado</Label>
                    <p className="text-[11px] text-muted-foreground">OQs verificados aparecem para todos os usuários</p>
                  </div>
                  <Switch
                    checked={!!card.verificado}
                    onCheckedChange={(v) => update("verificado", v)}
                  />
                </div>
              </div>
            </ScrollArea>
          )}

          <DialogFooter className="px-5 py-3 border-t shrink-0 gap-2">
            <TactileButton variant="neutral" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </TactileButton>
            <TactileButton variant="primary" onClick={salvar} disabled={saving || loading}>
              {saving ? "Salvando..." : "Salvar"}
            </TactileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
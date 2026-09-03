import { useState } from "react";
import { Heart, Flag } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";
import TactileButton from "@/components/console/TactileButton";

export function FavoritoBtn({ cardId, isFav, onToggle }: { cardId: string; isFav: boolean; onToggle: (b: boolean) => void }) {
  const { user } = useAuth();
  async function toggle() {
    if (!user) return;
    feedback("flip");
    if (isFav) {
      await supabase.from("favoritos").delete().eq("usuario_id", user.id).eq("card_id", cardId);
      onToggle(false);
    } else {
      await supabase.from("favoritos").insert({ usuario_id: user.id, card_id: cardId });
      onToggle(true);
    }
  }
  return (
    <button
      onClick={toggle}
      title="Favoritar"
      className="h-10 w-10 rounded-full grid place-items-center hover:bg-[hsl(var(--muted))] transition"
    >
      <Heart className={cn("h-5 w-5 transition-colors", isFav ? "fill-[hsl(var(--accent))] text-[hsl(var(--accent))]" : "text-muted-foreground")} />
    </button>
  );
}

export function ReportBtn({ cardId }: { cardId: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("conteudo_incorreto");
  const [comentario, setComentario] = useState("");

  async function enviar() {
    if (!user) return;
    const { error } = await supabase.from("reports_erro").insert({
      usuario_id: user.id, card_id: cardId, tipo: tipo as any,
      comentario: comentario.trim() || null,
    });
    if (error) { toast.error("Erro ao enviar"); return; }
    toast.success("Obrigado pelo report!");
    setOpen(false); setComentario("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Reportar erro"
        className="h-10 w-10 rounded-full grid place-items-center hover:bg-[hsl(var(--muted))] transition"
      >
        <Flag className="h-4 w-4 text-muted-foreground" />
      </button>
      <Dialog open={open} onOpenChange={setOpen} modal={false}>
        <DialogContent className="rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] border-white/10">
          <DialogHeader><DialogTitle>Reportar erro neste OQ</DialogTitle></DialogHeader>
          <RadioGroup value={tipo} onValueChange={setTipo} className="space-y-2">
            {[
              ["conteudo_incorreto", "Conteúdo incorreto"],
              ["erro_digitacao", "Erro de digitação"],
              ["ambiguidade", "Ambiguidade"],
              ["outro", "Outro"],
            ].map(([v, l]) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem id={v} value={v} />
                <Label htmlFor={v}>{l}</Label>
              </div>
            ))}
          </RadioGroup>
          <Textarea
            placeholder="Comentário (opcional)"
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            maxLength={500}
          />
          <DialogFooter>
            <TactileButton variant="neutral" onClick={() => setOpen(false)}>Cancelar</TactileButton>
            <TactileButton variant="primary" onClick={enviar}>Enviar</TactileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

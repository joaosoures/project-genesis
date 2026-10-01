import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import type { AulaPlano } from "@/hooks/useTrilhaPlano";
import { AlertCircle, ArrowRight } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pendencias: AulaPlano[];
  maxPorSemana: number; // 4
  proximasSemanas: (qtd: number) => number[];
  currentWeekIndex: number;
  preselecionarTodas?: boolean;
  onConfirm: (params: {
    redistribuir: { aula_id: string; semana_index: number }[];
    perder: string[];
  }) => void;
}

export default function RedistribuirDialog({
  open,
  onOpenChange,
  pendencias,
  maxPorSemana,
  proximasSemanas,
  currentWeekIndex,
  preselecionarTodas = false,
  onConfirm,
}: Props) {
  const [selecionadas, setSelecionadas] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      // A ação é aberta para recuperar as pendências encontradas. Portanto, a
      // seleção inicial deve representar todas elas, não apenas um recorte fixo.
      setSelecionadas(preselecionarTodas ? pendencias.map((a) => a.id) : []);
    }
  }, [open, pendencias, preselecionarTodas]);

  const slots = useMemo(() => {
    const semanasNecessarias = Math.ceil(
      pendencias.length / Math.max(1, maxPorSemana),
    );
    return proximasSemanas(semanasNecessarias)
      .flatMap((semana) => Array.from({ length: Math.max(1, maxPorSemana) }, () => semana))
      .slice(0, pendencias.length);
  }, [proximasSemanas, pendencias.length, maxPorSemana, open]);

  function toggle(id: string) {
    setSelecionadas((sel) =>
      sel.includes(id) ? sel.filter((x) => x !== id) : [...sel, id],
    );
  }

  function confirmar() {
    const redistribuir = selecionadas.map((id, i) => ({
      aula_id: id,
      semana_index: slots[i] ?? currentWeekIndex + 1 + i,
    }));
    const perder = pendencias
      .map((a) => a.id)
      .filter((id) => !selecionadas.includes(id));
    onConfirm({ redistribuir, perder });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto minimal-scroll rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-black text-lg">
            <AlertCircle className="h-5 w-5 text-[hsl(var(--destructive))]" />
            Redistribuir pendências
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            Encontramos <strong>{pendencias.length}</strong>{" "}
            {pendencias.length === 1 ? "pendência" : "pendências"}. Selecione as matérias que deseja recolocar nas próximas semanas. O limite é de <strong>{maxPorSemana} matérias por semana</strong>; matérias concluídas não serão movidas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-3">
          {pendencias.map((a) => {
            const checked = selecionadas.includes(a.id);
            const ordemSel = checked ? selecionadas.indexOf(a.id) : -1;
            const semanaDestino = ordemSel >= 0 ? slots[ordemSel] : null;
            return (
              <label
                key={a.id}
                className={`flex items-start gap-3 p-3 rounded-2xl border transition-colors cursor-pointer ${
                  checked
                    ? "border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/5"
                    : "border-border hover:bg-muted/40"
                }`}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggle(a.id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm leading-tight break-words">{a.nome}</div>
                  <div className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mt-1">
                    {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ??
                      a.especialidade}
                  </div>
                  {checked && semanaDestino !== null && (
                    <div className="text-[10px] font-bold text-[hsl(var(--accent))] mt-1.5 flex items-center gap-1">
                      <ArrowRight className="h-3 w-3" />
                      Semana {semanaDestino + 1}
                    </div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="text-[11px] text-muted-foreground bg-muted/30 rounded-xl p-3">
          <strong>{selecionadas.length}</strong> de {pendencias.length} selecionadas ·{" "}
          <strong>{pendencias.length - selecionadas.length}</strong>{" "}
          {pendencias.length - selecionadas.length === 1 ? "ficará" : "ficarão"} em{" "}
          <em>"Estudos que você perdeu"</em>.
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={selecionadas.length === 0}>
            Confirmar redistribuição
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

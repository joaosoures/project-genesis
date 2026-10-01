import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function ConfirmarRedistribuicaoDialog({
  open,
  onOpenChange,
  onConfirm,
}: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl">
        <DialogHeader className="space-y-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <DialogTitle className="text-xl font-black">
            Redistribuir matérias atrasadas?
          </DialogTitle>
          <DialogDescription className="text-sm leading-relaxed">
            Encontramos matérias não concluídas em semanas anteriores. Deseja redistribuí-las para as próximas semanas, respeitando o limite semanal definido?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button className="rounded-xl bg-amber-600 text-white hover:bg-amber-700" onClick={onConfirm}>
            Redistribuir pendências
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

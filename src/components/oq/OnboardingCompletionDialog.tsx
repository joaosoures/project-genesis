import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { OnboardingCompletionState } from "@/lib/onboarding";

export function OnboardingCompletionDialog({ state, onOpenChange, onNavigate }: {
  state: OnboardingCompletionState;
  onOpenChange: (open: boolean) => void;
  onNavigate: (path: string) => void;
}) {
  return (
    <Dialog open={state !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader className="items-center text-center sm:text-center">
          <div className="mb-2 grid h-16 w-16 place-items-center rounded-full bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-9 w-9" aria-hidden="true" />
          </div>
          <DialogTitle className="font-display text-2xl font-black">Primeira revisão concluída!</DialogTitle>
          <DialogDescription className="pt-2 text-base">
            {state === "needs-trilha-setup"
              ? "Você concluiu os 20 OQs iniciais. Configure as datas de início e da prova na Trilha para organizar seus estudos."
              : "Você concluiu os 20 OQs iniciais e sua fila de revisão está em dia. Comece uma aula pela Trilha para adicionar OQs regulares à sua fila."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button size="lg" className="w-full" onClick={() => onNavigate("/trilha")}>
            Ir para a Trilha
          </Button>
          <Button variant="ghost" className="w-full" onClick={() => onNavigate("/dashboard")}>
            Voltar ao início
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

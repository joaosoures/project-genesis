import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { QuestaoRealState } from "@/lib/questoes-reais";

export default function ResumeSessionDialog({ state, open, onContinue, onDiscard }: { state: QuestaoRealState; open: boolean; onContinue: () => void; onDiscard: () => void }) {
  const castigo = state.sessao.fase === "castigo";
  const position = castigo ? state.sessao.posicao_castigo : state.sessao.posicao_base;
  const total = state.itens.filter((item) => item.tipo === (castigo ? "castigo" : "base")).length;
  return <AlertDialog open={open}>
    <AlertDialogContent className="backdrop-blur-xl">
      <AlertDialogHeader>
        <AlertDialogTitle>Você tem uma fila em andamento</AlertDialogTitle>
        <AlertDialogDescription className="space-y-2">
          <span className="block font-semibold">Fase atual: {castigo ? "Castigo" : "Bloco-base"}</span>
          <span className="block">Questão {Math.min(position + 1, total)} de {total} · {state.erros_base} {state.erros_base === 1 ? "erro confirmado" : "erros confirmados"}</span>
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel onClick={onDiscard}>Descartar {castigo ? "e sair" : "e começar nova fila"}</AlertDialogCancel>
        <AlertDialogAction onClick={onContinue}>Continuar de onde parou</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}

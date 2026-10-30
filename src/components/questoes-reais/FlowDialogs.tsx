import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export function PerfectDialog({ open, onFinish }: { open: boolean; onFinish: () => void }) {
  return <AlertDialog open={open}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Fila perfeita! 🎉</AlertDialogTitle><AlertDialogDescription>Parabéns, você acertou todas e não tem nenhum castigo para cumprir!</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={onFinish}>Confirmar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
export function PunishmentDecisionDialog({ open, errors, busy, onSkip, onAccept }: { open: boolean; errors: number; busy: boolean; onSkip: () => void; onAccept: () => void }) {
  return <AlertDialog open={open}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Reforce suas lacunas</AlertDialogTitle><AlertDialogDescription>Você errou {errors} {errors === 1 ? "questão" : "questões"}. Deseja fazer o castigo desta fila agora?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy} onClick={onSkip}>Pular</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={onAccept}>Sim, começar</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}
export function CompletionDialog({ open, onFinish }: { open: boolean; onFinish: () => void }) {
  return <AlertDialog open={open}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Lacunas corrigidas! ✨</AlertDialogTitle><AlertDialogDescription>Você concluiu o castigo desta fila. Continue avançando com consistência.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogAction onClick={onFinish}>Voltar ao dashboard</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>;
}

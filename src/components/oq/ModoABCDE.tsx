import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react";
import { CardRow } from "@/lib/oq";
import { fetchExplicacao } from "@/lib/queue";
import { cn } from "@/lib/utils";

import { Check, X } from "lucide-react";
import { feedback } from "@/lib/sensory";

const LETTERS = ["A", "B", "C", "D", "E"] as const;

import { ModoHandle } from "@/types/modo";
export type { ModoHandle };


export interface ModoProps {
  card: CardRow;
  onFinalizar: (r: { acertou: boolean; nivelPista: number; tentativas: number }) => void;
  onState?: (s: { hintsUsed: number; canConfirm: boolean; finalized: boolean; canSkip?: boolean; showDontKnow?: boolean }) => void;
}

const ModoABCDE = forwardRef<ModoHandle, ModoProps>(function ModoABCDE({ card, onFinalizar, onState }, ref) {
  const [selecionada, setSelecionada] = useState<string | null>(null);
  const [eliminadas, setEliminadas] = useState<string[]>([]);
  const [finalized, setFinalized] = useState(false);
  const [acertou, setAcertou] = useState(false);
  const [explicacao, setExplicacao] = useState<string | null>(null);
  const [loadingExpl, setLoadingExpl] = useState(false);

  const correta = card.alternativa_correta;
  const alternativas = LETTERS
    .map((L) => ({ letra: L, texto: (card as any)[`alternativa_${L.toLowerCase()}`] as string | null }))
    .filter((a) => !!a.texto);

  useEffect(() => {
    setSelecionada(null); setEliminadas([]); setFinalized(false); setAcertou(false);
    setExplicacao(null); setLoadingExpl(false);

  }, [card.id]);

  function hint() {
    if (finalized) return;
    if (eliminadas.length >= 3) {
      // No modo ABCDE, o aluno deve chutar entre as restantes após as 3 dicas
      feedback("error");
      return;
    }
    const restantes = alternativas.filter((a) => a.letra !== correta && !eliminadas.includes(a.letra));
    if (restantes.length === 0) return;
    const sorteada = restantes[Math.floor(Math.random() * restantes.length)];
    setEliminadas((e) => [...e, sorteada.letra]);
    if (selecionada === sorteada.letra) setSelecionada(null);
  }

  async function skip() {
    if (finalized) return;
    setFinalized(true);
    feedback("error");
    onFinalizar({ acertou: false, nivelPista: eliminadas.length + 1, tentativas: 1 });

    setLoadingExpl(true);
    const text = await fetchExplicacao(card.id);
    setExplicacao(text);
    setLoadingExpl(false);
  }

  async function confirm() {
    if (finalized || !selecionada) return;
    const ok = selecionada === correta;
    setAcertou(ok); setFinalized(true);
    feedback(ok ? "success" : "error");
    onFinalizar({ acertou: ok, nivelPista: eliminadas.length, tentativas: 1 });

    // Lazy load explanation
    setLoadingExpl(true);
    const text = await fetchExplicacao(card.id);
    setExplicacao(text);
    setLoadingExpl(false);
  }


  useImperativeHandle(ref, () => ({
    confirm, hint, skip,
    hintsUsed: eliminadas.length,
    hintsMax: 3,
    canConfirm: !!selecionada && !finalized,
    finalized,
  }), [selecionada, eliminadas.length, finalized]);

  useEffect(() => { 
    onState?.({ 
      hintsUsed: eliminadas.length, 
      canConfirm: !!selecionada && !finalized, 
      finalized,
      showDontKnow: false
    }); 
  }, [selecionada, eliminadas.length, finalized, onState]);

  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed font-medium">{card.comando}</p>
      <div className="space-y-2">
        {alternativas.map((a) => {
          const isElim = eliminadas.includes(a.letra);
          const isSelected = selecionada === a.letra;
          const isCorreta = a.letra === correta;
          const wrongPick = finalized && isSelected && !isCorreta;
          return (
            <button
              key={a.letra}
              disabled={isElim || finalized}
              onClick={() => { if (!finalized && !isElim) { feedback("flip"); setSelecionada(a.letra); } }}
              className={cn(
                "w-full text-left p-4 rounded-2xl border bg-white transition-all duration-200 flex gap-3 items-start",
                "shadow-[0_1px_2px_hsl(230_30%_20%/0.06)]",
                "hover:border-[hsl(var(--accent))]/40 hover:-translate-y-[1px] hover:shadow-md",
                isSelected && !finalized && "border-[hsl(var(--accent))] bg-[hsl(var(--accent))/0.06] shadow-neon-blue",
                finalized && isCorreta && "border-[hsl(var(--success))] bg-[hsl(var(--success))/0.08]",
                wrongPick && "border-[hsl(var(--destructive))] bg-[hsl(var(--destructive))/0.08]",
                isElim && "opacity-20 line-through grayscale pointer-events-none transition-all",
              )}
            >
              <span 
                translate="no"
                className={cn(
                "h-8 w-8 rounded-full grid place-items-center font-bold text-sm shrink-0 transition-colors",
                isSelected && !finalized && "bg-[hsl(var(--accent))] text-white",
                !(isSelected && !finalized) && "bg-[hsl(var(--muted))] text-[hsl(var(--primary))]",
                finalized && isCorreta && "bg-[hsl(var(--success))] text-white",
                wrongPick && "bg-[hsl(var(--destructive))] text-white",
              )}>{a.letra}</span>
              <span className="flex-1 pt-1">{a.texto}</span>
              {finalized && isCorreta && <Check className="text-[hsl(var(--success))] h-5 w-5 shrink-0 mt-1" />}
              {wrongPick && <X className="text-[hsl(var(--destructive))] h-5 w-5 shrink-0 mt-1" />}
            </button>
          );
        })}
      </div>

      {finalized && (
        <div className="rounded-2xl border border-border/60 bg-[hsl(var(--muted))/0.4] p-5 animate-fade-up">
          <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-semibold">Explicação</p>
          <div className="leading-relaxed text-[15px]">
            {loadingExpl ? (
              <div className="flex items-center gap-2 text-muted-foreground italic">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-[hsl(var(--accent))] border-t-transparent" />
                Carregando explicação…
              </div>
            ) : (
              explicacao || "Explicação não disponível."
            )}
          </div>

        </div>
      )}
    </div>
  );
});

export default ModoABCDE;
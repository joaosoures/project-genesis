import { useEffect, useImperativeHandle, useState, forwardRef, useRef } from "react";
import { CardRow, matchAnswer } from "@/lib/oq";
import { fetchExplicacao } from "@/lib/queue";
import { cn } from "@/lib/utils";

import { feedback } from "@/lib/sensory";
import { ModoHandle, ModoProps } from "./ModoABCDE";

function revelar(resp: string, nivel: number): string {
  const len = resp.length;
  const reveal = nivel === 1 ? 1 : nivel === 2 ? Math.ceil(len * 0.3) : Math.ceil(len * 0.6);
  return resp.split("").map((c, i) => (c === " " ? " " : i < reveal ? c : "_")).join(" ");
}

const ModoLacuna = forwardRef<ModoHandle, ModoProps & { renderInput?: (props: { value: string; setValue: (v: string) => void; onEnter: () => void; shake: boolean; disabled: boolean; placeholder: string }) => React.ReactNode }>(
function ModoLacuna({ card, onFinalizar, onState, renderInput }, ref) {
  const [valor, setValor] = useState("");
  const [tentativas, setTentativas] = useState(0);
  const [shake, setShake] = useState(false);
  const [nivelPista, setNivelPista] = useState(0);
  const [acertou, setAcertou] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [explicacao, setExplicacao] = useState<string | null>(null);
  const [loadingExpl, setLoadingExpl] = useState(false);


  const respostaCorreta = card.info_1 ?? "";

  useEffect(() => {
    setValor(""); setTentativas(0); setShake(false); setNivelPista(0); setAcertou(false); setFinalized(false);
    setExplicacao(null); setLoadingExpl(false);
  }, [card.id]);


  async function tentar() {
    if (finalized || !valor.trim()) return;
    setTentativas((t) => t + 1);
    if (matchAnswer(valor, respostaCorreta, card.var_1)) {
      setAcertou(true); setFinalized(true); feedback("success");
      onFinalizar({ acertou: true, nivelPista, tentativas: tentativas + 1 });
      
      // Lazy load explanation
      setLoadingExpl(true);
      const text = await fetchExplicacao(card.id);
      setExplicacao(text);
      setLoadingExpl(false);
    } else {

      setShake(true); feedback("error");
      setTimeout(() => setShake(false), 500);
    }
  }
  function hint() {
    if (finalized) return;
    setNivelPista((n) => Math.min(n + 1, 3));
  }

  async function skip() {
    if (finalized) return;
    setFinalized(true);
    feedback("error");
    onFinalizar({ acertou: false, nivelPista: 4, tentativas });

    // Lazy load explanation
    setLoadingExpl(true);
    const text = await fetchExplicacao(card.id);
    setExplicacao(text);
    setLoadingExpl(false);
  }


  useImperativeHandle(ref, () => ({
    confirm: tentar, hint, skip,
    hintsUsed: nivelPista,
    hintsMax: 3,
    canConfirm: !!valor.trim() && !finalized,
    finalized,
  }), [valor, nivelPista, finalized, tentativas]);

  useEffect(() => { 
    onState?.({ 
      hintsUsed: nivelPista, 
      canConfirm: !!valor.trim() && !finalized, 
      finalized,
      showDontKnow: nivelPista >= 3 && !finalized
    }); 
  }, [valor, nivelPista, finalized, onState]);

  return (
    <div className="space-y-5">
      <p className="text-lg leading-relaxed font-medium">{card.comando}</p>

      {nivelPista > 0 && !finalized && (
        <p className="text-center text-2xl tracking-[0.4em] font-mono text-[hsl(var(--accent))]">
          {revelar(respostaCorreta, nivelPista)}
        </p>
      )}

      {/* Input (no card quando não há renderInput externo) */}
      {!renderInput && !finalized && (
        <input
          autoFocus
          maxLength={300}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => { 
            if (e.key === "Enter") {
              if (finalized) {
                // Deixa o Enter global do Estudo.tsx cuidar do próximo se já finalizou
                return;
              }
              tentar(); 
            }
          }}
          placeholder="Digite sua resposta…"
          className={cn(
            "w-full h-14 px-5 rounded-2xl bg-white border border-border text-lg",
            "focus:outline-none focus:border-[hsl(var(--accent))] focus:shadow-neon-blue transition",
            shake && "animate-shake",
          )}
        />
      )}
      {renderInput && !finalized && renderInput({
        value: valor, setValue: setValor, onEnter: tentar, shake, disabled: finalized,
        placeholder: "Digite sua resposta…",
      })}

      {finalized && (
        <div className="space-y-3 animate-fade-up">
          <div className={cn(
            "rounded-2xl border p-5",
            acertou ? "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))/0.06]" : "border-[hsl(var(--destructive))]/40 bg-[hsl(var(--destructive))/0.06]"
          )}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Resposta correta</p>
            <p className="font-medium text-lg">{respostaCorreta}</p>
          </div>
          <div className="rounded-2xl border border-border/60 bg-[hsl(var(--muted))/0.4] p-5">
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
        </div>
      )}
    </div>
  );
});

export default ModoLacuna;

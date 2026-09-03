import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import { CardRow, getInfos, matchAnswer, sortearLacuna } from "@/lib/oq";
import { fetchExplicacao } from "@/lib/queue";
import { cn } from "@/lib/utils";

import { feedback } from "@/lib/sensory";
import { ModoHandle, ModoProps } from "./ModoABCDE";

function revelar(resp: string, nivel: number): string {
  const len = resp.length;
  const reveal = nivel === 1 ? 1 : nivel === 2 ? Math.ceil(len * 0.3) : Math.ceil(len * 0.6);
  return resp.split("").map((c, i) => (c === " " ? " " : i < reveal ? c : "_")).join(" ");
}

const ModoOQFalta = forwardRef<ModoHandle, ModoProps & { renderInput?: (p: { value: string; setValue: (v: string) => void; onEnter: () => void; shake: boolean; disabled: boolean; placeholder: string }) => React.ReactNode }>(
function ModoOQFalta({ card, onFinalizar, onState, renderInput }, ref) {
  const infos = useMemo(() => getInfos(card), [card]);
  const lacunaIdx = useMemo(() => sortearLacuna(card), [card.id]);
  const lacuna = infos.find((i) => i.idx === lacunaIdx)!;

  const [valor, setValor] = useState("");
  const [tentativas, setTentativas] = useState(0);
  const [shake, setShake] = useState(false);
  const [nivelPista, setNivelPista] = useState(0);
  const [acertou, setAcertou] = useState(false);
  const [finalized, setFinalized] = useState(false);
  const [explicacao, setExplicacao] = useState<string | null>(null);
  const [loadingExpl, setLoadingExpl] = useState(false);


  useEffect(() => {
    setValor(""); setTentativas(0); setShake(false); setNivelPista(0); setAcertou(false); setFinalized(false);
    setExplicacao(null); setLoadingExpl(false);
  }, [card.id]);


  async function tentar() {
    if (finalized || !valor.trim()) return;
    setTentativas((t) => t + 1);
    if (matchAnswer(valor, lacuna.info, lacuna.vars)) {
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
    hintsUsed: nivelPista, hintsMax: 3,
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

      <ul className="space-y-2.5">
        {infos.map((i) => {
          const isLacuna = i.idx === lacunaIdx;
          return (
            <li key={i.idx} className="flex items-start gap-3">
              <span className="mt-2 h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))] shrink-0" />
              <span className="flex-1">
                {isLacuna ? (
                  finalized ? (
                    <span className={cn("font-semibold", acertou ? "text-[hsl(var(--success))]" : "text-[hsl(var(--destructive))]")}>
                      {i.info}
                    </span>
                  ) : nivelPista > 0 ? (
                    <span className="font-mono tracking-widest text-[hsl(var(--accent))]">{revelar(i.info, nivelPista)}</span>
                  ) : (
                    <span className="text-muted-foreground italic">— OQ falta —</span>
                  )
                ) : (
                  <span>{i.info}</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {!renderInput && !finalized && (
        <input
          autoFocus
          maxLength={300}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => { 
            if (e.key === "Enter") {
              if (finalized) return;
              tentar(); 
            }
          }}
          placeholder="Digite a informação que falta…"
          className={cn(
            "w-full h-14 px-5 rounded-2xl bg-white border border-border text-lg",
            "focus:outline-none focus:border-[hsl(var(--accent))] focus:shadow-neon-blue transition",
            shake && "animate-shake",
          )}
        />
      )}
      {renderInput && !finalized && renderInput({
        value: valor, setValue: setValor, onEnter: tentar, shake, disabled: finalized,
        placeholder: "Digite a informação que falta…",
      })}

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

export default ModoOQFalta;

import { useRef, useState, PointerEvent, useEffect, useCallback, useMemo } from "react";
import { cn } from "@/lib/utils";
import { feedback, ensureAudio } from "@/lib/sensory";

interface Props {
  onTick?: (dir: 1 | -1) => void;
  size?: number;
  color?: "blue" | "orange" | "purple";
  variant?: string;
  label?: string;
  className?: string;
  // New props for thumbwheel sync
  scrollContainerRef?: React.RefObject<HTMLDivElement>;
}

const TICK_DEG = 120; // Drastic reduction in sensitivity (from 60 to 120 degrees per tick)

export default function ScrollWheel({ 
  onTick, 
  size = 96, 
  label, 
  className, 
  variant = "default",
  scrollContainerRef
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [angle, setAngle] = useState(0);
  const [dragging, setDragging] = useState(false);
  const stateRef = useRef({ dragging: false, lastAngle: 0, lastY: 0, accum: 0 });

  // Sincronização automática para a variante thumbwheel
  useEffect(() => {
    if (variant !== "thumbwheel" || !scrollContainerRef?.current) return;

    const el = scrollContainerRef.current;
    const updateFromScroll = () => {
      if (stateRef.current.dragging) return;
      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 0) return;
      
      const percent = el.scrollTop / maxScroll;
      // Rotaciona a roda proporcionalmente ao scroll (ex: 2 voltas completas de 0 a 100%)
      setAngle(percent * 720);
    };

    el.addEventListener("scroll", updateFromScroll, { passive: true });
    updateFromScroll();
    return () => el.removeEventListener("scroll", updateFromScroll);
  }, [variant, scrollContainerRef]);

  function onDown(e: PointerEvent<HTMLDivElement>) {
    ensureAudio();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    stateRef.current.dragging = true;
    stateRef.current.lastY = e.clientY;
    stateRef.current.accum = 0;
    
    // Captura o ângulo atual para delta circular (usado em variantes não-thumbwheel)
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      stateRef.current.lastAngle = Math.atan2(
        e.clientY - (r.top + r.height / 2), 
        e.clientX - (r.left + r.width / 2)
      ) * (180 / Math.PI);
    }
    
    setDragging(true);
  }

  function onMove(e: PointerEvent<HTMLDivElement>) {
    if (!stateRef.current.dragging) return;
    
    let delta = 0;
    if (variant === "thumbwheel") {
      // Movimento linear vertical para o Thumbwheel
      // Aumentando sensibilidade (de 4.5 para 8.0)
      delta = (stateRef.current.lastY - e.clientY) * 20.0; // Significant increase in sensitivity (was 12.0) 
      stateRef.current.lastY = e.clientY;

      if (scrollContainerRef?.current) {
        const el = scrollContainerRef.current;
        const maxScroll = el.scrollHeight - el.clientHeight;
        
        // Aplica o scroll
        const oldScroll = el.scrollTop;
        el.scrollTop += delta;
        
        // Se bateu no limite (não mudou o scroll), delta real é 0 para não girar a roda
        if (Math.abs(el.scrollTop - oldScroll) < 0.1) {
          delta = 0;
        } else if (maxScroll > 0) {
          // Converte o delta de scroll em delta de ângulo
          delta = (delta / maxScroll) * 720;
        }
      }
    } else {
      // Movimento circular para as outras variantes
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const cur = Math.atan2(
          e.clientY - (r.top + r.height / 2), 
          e.clientX - (r.left + r.width / 2)
        ) * (180 / Math.PI);
        delta = cur - stateRef.current.lastAngle;
        if (delta > 180) delta -= 360;
        if (delta < -180) delta += 360;
        stateRef.current.lastAngle = cur;
      }
    }

    if (delta !== 0) {
      stateRef.current.accum += delta;
      
      const threshold = variant === "thumbwheel" ? 5 : TICK_DEG;
      if (Math.abs(stateRef.current.accum) >= threshold) {
        const sign = stateRef.current.accum > 0 ? 1 : -1;
        stateRef.current.accum -= sign * threshold;
        feedback("tick");
        if (variant !== "thumbwheel") onTick?.(sign as 1 | -1);
      }
      
      setAngle((a) => a + delta);
    }
  }

  function onUp() { stateRef.current.dragging = false; setDragging(false); }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (document.activeElement !== ref.current) return;
      if (e.key === "ArrowUp" || e.key === "ArrowRight") { setAngle(a => a + TICK_DEG); feedback("tick"); onTick?.(1); }
      if (e.key === "ArrowDown" || e.key === "ArrowLeft") { setAngle(a => a - TICK_DEG); feedback("tick"); onTick?.(-1); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onTick]);

  const renderVariant = () => {
    switch (variant) {
      case "thumbwheel":
        return (
          <div className="absolute inset-0 flex items-center justify-center">
            {/* Compartimento "Enfiado" - Agora integrado à cor do console */}
            <div 
              className="relative w-full h-[120%] rounded-[1.8rem] overflow-hidden flex items-center justify-center"
              style={{
                background: "hsl(var(--console-base))",
                boxShadow: `
                  inset 4px 4px 12px hsl(var(--console-shadow-dark) / 0.8), 
                  inset -4px -4px 12px hsl(var(--console-shadow-light) / 0.9),
                  0 1px 2px rgba(255,255,255,0.8)
                `,
                border: "1px solid hsl(var(--console-shadow-dark) / 0.15)",
              }}
            >
              {/* Sombra interna para profundidade cilíndrica */}
              <div className="absolute inset-0 pointer-events-none z-30 shadow-[inset_0_15px_25px_rgba(0,0,0,0.1),inset_0_-15px_25px_rgba(0,0,0,0.1)]" />
              
              {/* Roda (Dial) - Mesma cor do console mas com destaque 3D */}
              <div 
                className="relative w-[85%] h-full flex flex-col items-center"
                style={{
                  background: "linear-gradient(to right, hsl(var(--console-shadow-dark)/0.2) 0%, hsl(var(--console-base)) 40%, hsl(var(--console-base)) 60%, hsl(var(--console-shadow-dark)/0.2) 100%)",
                  transform: `translateY(${-((angle * 1.5) % 40)}px)`,
                  transition: dragging ? "none" : "transform 0.1s linear",
                }}
              >
                {/* Dentes (Grooves) - Escavados sutilmente */}
                {Array.from({ length: 20 }).map((_, i) => (
                  <div 
                    key={i}
                    className="w-full shrink-0"
                    style={{
                      height: "1px",
                      margin: "19px 0",
                      background: "hsl(var(--console-shadow-dark) / 0.3)",
                      boxShadow: "0 1px 0 hsl(var(--console-shadow-light) / 0.8)",
                    }}
                  />
                ))}
              </div>
              
              {/* Gradiente de curvatura cilíndrica */}
              <div className="absolute inset-0 pointer-events-none z-40 bg-gradient-to-b from-black/5 via-transparent to-black/5" />
              
              {/* Reflexo de luz vertical centralizado e sutil - Removido a pedido do usuário */}
              {/* <div className="absolute inset-y-0 w-[15%] left-[42.5%] pointer-events-none z-50 bg-gradient-to-r from-transparent via-white/40 to-transparent" /> */}
              
              {/* Sombras de oclusão nas bordas do compartimento */}
              <div className="absolute inset-y-0 left-0 w-2 z-50 bg-gradient-to-r from-black/5 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-2 z-50 bg-gradient-to-l from-black/5 to-transparent" />
            </div>
          </div>
        );
      case "minimal":
        // Anel fino, plano, com indicador
        return (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                border: "2px solid hsl(var(--foreground) / 0.25)",
                background: "transparent",
              }}
            />
            <div
              className="absolute inset-[8%] rounded-full"
              style={{
                border: "1px solid hsl(var(--foreground) / 0.12)",
                transform: `rotate(${angle}deg)`,
                transition: dragging ? "none" : "transform 0.5s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  width: "10%", height: "10%", left: "85%", top: "45%",
                  background: dragging ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.5)",
                  boxShadow: dragging ? "0 0 8px hsl(var(--accent))" : "none",
                }}
              />
            </div>
          </>
        );

      case "industrial":
        // Anel metálico escuro com dentes/serrilha
        return (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "conic-gradient(from 0deg, hsl(220 15% 22%), hsl(220 15% 38%), hsl(220 15% 22%), hsl(220 15% 38%), hsl(220 15% 22%))",
                boxShadow: "0 6px 18px hsl(0 0% 0% / 0.45), inset 0 2px 4px hsl(0 0% 100% / 0.15)",
              }}
            />
            {/* Dentes */}
            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100"
              style={{ transform: `rotate(${angle}deg)`, transition: dragging ? "none" : "transform 0.4s ease-out" }}>
              {Array.from({ length: 24 }).map((_, i) => {
                const a = (i * 15) * Math.PI / 180;
                const x1 = 50 + 47 * Math.cos(a);
                const y1 = 50 + 47 * Math.sin(a);
                const x2 = 50 + 42 * Math.cos(a);
                const y2 = 50 + 42 * Math.sin(a);
                return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(0 0% 0% / 0.6)" strokeWidth="1" />;
              })}
            </svg>
            {/* Núcleo */}
            <div
              className="absolute inset-[28%] rounded-full grid place-items-center"
              style={{
                background: "radial-gradient(circle at 35% 30%, hsl(220 15% 55%), hsl(220 18% 18%) 70%)",
                boxShadow: "inset 0 2px 4px hsl(0 0% 100% / 0.2), inset 0 -3px 6px hsl(0 0% 0% / 0.5), 0 0 12px hsl(var(--accent) / 0.4)",
              }}
            >
              <div
                className="rounded-full"
                style={{
                  width: "30%", height: "30%",
                  background: dragging ? "hsl(var(--accent))" : "hsl(220 15% 30%)",
                  boxShadow: dragging ? "0 0 10px hsl(var(--accent))" : "none",
                }}
              />
            </div>
          </>
        );

      case "classic":
        // Estilo High-Tech Precision: Anel de vidro fosco com marcas gravadas a laser e centro metálico
        return (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(135deg, hsl(220 20% 12%), hsl(220 25% 6%))",
                boxShadow: "0 10px 30px hsl(0 0% 0% / 0.6), inset 0 2px 4px hsl(0 0% 100% / 0.1)",
              }}
            />
            {/* Anel Externo Giratório */}
            <div
              className="absolute inset-[4%] rounded-full overflow-hidden"
              style={{
                background: "conic-gradient(from 0deg, hsl(var(--accent) / 0.05), transparent 40%, transparent 60%, hsl(var(--accent) / 0.05))",
                border: "1.5px solid hsl(var(--accent) / 0.2)",
                transform: `rotate(${angle}deg)`,
                transition: dragging ? "none" : "transform 0.5s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              {/* Marcas Gravadas */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                {Array.from({ length: 12 }).map((_, i) => {
                  const a = (i * 30) * Math.PI / 180;
                  const r1 = 40, r2 = 46;
                  return (
                    <line
                      key={i}
                      x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)}
                      x2={50 + r2 * Math.cos(a)} y2={50 + r2 * Math.sin(a)}
                      stroke="hsl(var(--accent) / 0.4)"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  );
                })}
              </svg>
              {/* Indicador Ativo */}
              <div
                className="absolute w-[6%] h-[12%] left-[47%] top-[4%]"
                style={{
                  background: dragging ? "hsl(var(--accent))" : "hsl(var(--accent) / 0.6)",
                  boxShadow: dragging ? "0 0 12px hsl(var(--accent))" : "none",
                  borderRadius: "2px",
                }}
              />
            </div>
            {/* Centro Estático Metálico */}
            <div
              className="absolute inset-[30%] rounded-full grid place-items-center"
              style={{
                background: "radial-gradient(circle at 35% 35%, hsl(220 20% 28%), hsl(220 25% 10%))",
                boxShadow: "0 0 0 1.5px hsl(0 0% 0% / 0.5), inset 0 2px 5px hsl(0 0% 100% / 0.15), 0 4px 10px hsl(0 0% 0% / 0.4)",
              }}
            >
              <div
                className="w-[40%] h-[40%] rounded-full"
                style={{
                  background: dragging ? "hsl(var(--accent) / 0.3)" : "transparent",
                  border: `1.5px solid ${dragging ? "hsl(var(--accent))" : "hsl(var(--accent) / 0.25)"}`,
                  boxShadow: dragging ? "0 0 15px hsl(var(--accent) / 0.4)" : "none",
                  transition: "all 0.2s ease",
                }}
              />
            </div>
          </>
        );

      default:
        // Neumorphic dial original
        return (
          <>
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "hsl(var(--background))",
                boxShadow: [
                  "12px 12px 28px hsl(var(--neu-dark) / 0.7)",
                  "-12px -12px 28px hsl(var(--neu-light) / 0.45)",
                  "0 0 40px hsl(var(--accent) / 0.15)",
                ].join(", "),
              }}
            />
            <div
              className="absolute inset-[3%] rounded-full"
              style={{
                background: "radial-gradient(circle at 50% 50%, hsl(var(--background)) 60%, hsl(var(--neu-dark) / 0.1) 100%)",
                boxShadow: [
                  "0 0 0 1.5px hsl(var(--foreground) / 0.85)",
                  "inset 6px 6px 14px hsl(var(--neu-dark) / 0.55)",
                  "inset -6px -6px 14px hsl(var(--neu-light) / 0.45)",
                ].join(", "),
                transform: `rotate(${angle}deg)`,
                transition: dragging ? "none" : "transform 0.5s cubic-bezier(.2,.8,.2,1)",
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  width: "9%", height: "9%", left: "82%", top: "46%",
                  background: dragging
                    ? "radial-gradient(circle at 35% 30%, hsl(140 90% 78%), hsl(140 80% 45%) 70%)"
                    : "radial-gradient(circle at 35% 30%, hsl(220 12% 35%), hsl(220 18% 18%) 70%)",
                  boxShadow: dragging
                    ? "0 0 12px hsl(140 80% 55% / 0.95), 0 0 26px hsl(140 80% 55% / 0.55)"
                    : "inset 0 1px 2px hsl(0 0% 0% / 0.5)",
                }}
              />
            </div>
            <div
              className="absolute inset-[22%] rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle at 38% 32%, hsl(var(--neu-light) / 0.5) 0%, hsl(var(--background)) 45%, hsl(var(--neu-dark)) 100%)",
                boxShadow: "inset 4px 4px 10px hsl(var(--neu-light) / 0.4), inset -6px -6px 14px hsl(var(--neu-dark) / 0.55)",
              }}
            />
            <div
              className="absolute pointer-events-none rounded-full"
              style={{
                inset: "26%",
                background: "radial-gradient(ellipse at 40% 25%, hsl(0 0% 100% / 0.85) 0%, hsl(0 0% 100% / 0) 55%)",
                filter: "blur(1px)",
              }}
            />
          </>
        );
    }
  };

  return (
    <div className={cn("flex flex-col items-center gap-1.5 select-none", className)}>
      <div
        ref={ref}
        tabIndex={0}
        role="slider"
        aria-label={label ?? "Rodinha de navegação"}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        className={cn(
          "relative cursor-grab active:cursor-grabbing touch-none transition-shadow",
          variant === "thumbwheel" ? "rounded-[1.8rem]" : "rounded-full",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]",
          // Expand hit area for better touch amplitude on thumbwheel
          variant === "thumbwheel" && "before:absolute before:-inset-y-32 before:inset-x-0 before:content-[''] before:z-[60]"
        )}
        style={{ width: size, height: size }}
      >
        {renderVariant()}
      </div>
      {/* {label && <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>} */}
    </div>
  );
}

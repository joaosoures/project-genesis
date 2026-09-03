import { Lightbulb, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";

export default function NeonHintLamp({
  used, max = 3, onClick, disabled, className, variant = "default",
}: { used: number; max?: number; onClick: () => void; disabled?: boolean; className?: string; variant?: string }) {
  const remaining = max - used;
  const off = disabled || remaining <= 0;

  const renderButton = () => {
    switch (variant) {
      case "led":
        // LED matrix: pixelado, retangular, monocromático
        return (
          <div
            className="relative h-16 w-16 rounded-lg grid place-items-center"
            style={{
              background: "hsl(220 25% 8%)",
              boxShadow: "inset 0 2px 6px hsl(0 0% 0% / 0.7), 0 0 0 2px hsl(220 15% 25%), 0 4px 12px hsl(0 0% 0% / 0.4)",
            }}
          >
            {/* LED grid 5x5 simulando lâmpada */}
            <div className="grid grid-cols-5 gap-[2px] p-2">
              {[
                0,1,1,1,0,
                1,1,1,1,1,
                1,1,1,1,1,
                0,1,1,1,0,
                0,0,1,0,0,
              ].map((on, i) => (
                <span
                  key={i}
                  className="w-[3px] h-[3px] rounded-[1px]"
                  style={{
                    background: on && remaining > 0 ? "hsl(140 85% 55%)" : "hsl(220 20% 18%)",
                    boxShadow: on && remaining > 0 ? "0 0 4px hsl(140 85% 55%)" : "none",
                  }}
                />
              ))}
            </div>
          </div>
        );

      case "holo":
        // Líquido Motion: Efeito de lava/mercúrio iridescente com animação fluida
        return (
          <div
            className="relative h-16 w-16 rounded-full grid place-items-center overflow-hidden"
            style={{
              background: "hsl(var(--background))",
              boxShadow: "0 0 0 2px hsl(var(--accent) / 0.3), 0 8px 24px hsl(0 0% 0% / 0.3)",
            }}
          >
            {/* Formas líquidas animadas */}
            <div className="absolute inset-0 opacity-60">
              <div 
                className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] animate-[spin_8s_linear_infinite]"
                style={{
                  background: "radial-gradient(circle at center, hsl(var(--accent) / 0.8) 0%, transparent 60%)",
                  filter: "blur(12px)",
                }}
              />
              <div 
                className="absolute top-[-10%] left-[-10%] w-[120%] h-[120%] animate-[spin_12s_linear_infinite_reverse]"
                style={{
                  background: "radial-gradient(circle at center, hsl(280 100% 70% / 0.6) 0%, transparent 60%)",
                  filter: "blur(15px)",
                }}
              />
            </div>
            
            <div 
              className={cn(
                "relative z-10 transition-transform duration-300",
                remaining > 0 ? "scale-110" : "scale-100 opacity-40"
              )}
            >
              <Zap
                className={cn(
                  "h-7 w-7",
                  remaining > 0 ? "animate-pulse" : ""
                )}
                strokeWidth={2}
                style={{
                  color: remaining > 0 ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.4)",
                  filter: remaining > 0 ? "drop-shadow(0 0 10px hsl(var(--accent)))" : "none",
                }}
              />
            </div>
            
            {/* Overlay de brilho vítreo */}
            <div 
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, hsl(0 0% 100% / 0.2) 0%, transparent 50%, hsl(0 0% 0% / 0.1) 100%)",
              }}
            />
          </div>
        );

      case "minimal":
        // Outline limpo, sem dome, sem sombras
        return (
          <div
            className="relative h-16 w-16 rounded-full grid place-items-center"
            style={{
              background: "transparent",
              border: "1.5px solid hsl(var(--foreground) / 0.3)",
            }}
          >
            <Lightbulb
              className="h-7 w-7"
              strokeWidth={1.5}
              style={{
                color: remaining > 0 ? "hsl(var(--accent))" : "hsl(var(--foreground) / 0.3)",
              }}
            />
          </div>
        );

      default:
        // Neumórfico domo original
        return (
          <div
            className="relative h-16 w-16 rounded-full grid place-items-center"
            style={{
              background: "radial-gradient(circle at 30% 25%, hsl(var(--neu-light) / 0.5) 0%, hsl(var(--background)) 55%, hsl(var(--neu-dark)) 100%)",
              boxShadow: [
                "0 0 0 1.5px hsl(var(--border))",
                "0 1px 0 hsl(var(--neu-light) / 0.4) inset",
                "0 -3px 8px hsl(var(--neu-dark) / 0.35) inset",
                "0 8px 18px -6px hsl(var(--neu-dark) / 0.35)",
              ].join(", "),
            }}
          >
            <span
              aria-hidden
              className="absolute inset-[14%] rounded-full"
              style={{
                background: "radial-gradient(circle at 35% 28%, hsl(var(--neu-light) / 0.4) 0%, hsl(var(--background)) 60%, hsl(var(--neu-dark)) 100%)",
                boxShadow: "0 1px 0 hsl(var(--neu-light) / 0.4) inset, 0 -2px 6px hsl(var(--neu-dark) / 0.25) inset",
              }}
            />
            <Lightbulb
              className="relative h-7 w-7"
              strokeWidth={2.4}
              style={{
                color: "hsl(var(--accent))",
                filter: remaining > 0
                  ? "drop-shadow(0 0 6px hsl(var(--accent) / 0.85)) drop-shadow(0 0 12px hsl(var(--accent) / 0.4))"
                  : "none",
              }}
            />
          </div>
        );
    }
  };

  return (
    <div className="flex flex-col items-center gap-2.5">
      <button
        onClick={() => { if (off) return; feedback("hint"); onClick(); }}
        disabled={off}
        aria-label="Desmistificar"
        className={cn(
          "select-none transition-[transform,filter] duration-150 ease-out active:translate-y-[2px] rounded-full",
          remaining > 0 && variant === "default" && "animate-lamp-pulse",
          off && "opacity-50",
          className,
        )}
      >
        {renderButton()}
      </button>

      {/* Indicadores */}
      <div className="flex gap-1.5">
        {Array.from({ length: max }).map((_, i) => {
          const isOn = i >= used;
          return (
            <span
              key={i}
              className="relative h-3.5 w-3.5 rounded-full grid place-items-center"
              style={{
                background: "linear-gradient(180deg, hsl(var(--background)), hsl(var(--neu-dark)))",
                boxShadow: "0 0 0 1px hsl(var(--border)), 0 -1px 2px hsl(var(--neu-light) / 0.5) inset, 0 1px 2px hsl(var(--neu-dark) / 0.25) inset",
              }}
            >
              <span
                className={cn("h-2 w-2 rounded-full transition")}
                style={
                  isOn
                    ? {
                        background: "radial-gradient(circle at 30% 25%, hsl(var(--accent) / 0.5), hsl(var(--accent)) 60%, hsl(var(--primary-glow)))",
                        boxShadow: "0 0 6px hsl(var(--accent) / 0.9)",
                      }
                    : { background: "hsl(220 14% 78%)" }
                }
              />
            </span>
          );
        })}
      </div>
    </div>
  );
}

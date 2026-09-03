import { cn } from "@/lib/utils";

/**
 * Barra de progresso neumorphism: trilho côncavo + LEDs azuis acendendo
 * progressivamente + esfera 3D ("knob") deslizando no fim. Inspirada no
 * mock anexado.
 */
export default function NeonProgressBar({
  value, total, className,
}: { value: number; total: number; className?: string }) {
  const safeTotal = Math.max(1, total);
  const dots = Math.min(safeTotal, 12); // até 12 leds para não poluir
  const lit = Math.min(dots, Math.round((value / safeTotal) * dots));
  const knobPct = Math.min(100, Math.max(0, (value / safeTotal) * 100));

  return (
    <div className={cn("relative w-full", className)}>
      {/* Trilho neumorphism côncavo */}
      <div
        className="relative h-3 w-full rounded-full"
        style={{
          background: "hsl(var(--background))",
          boxShadow: [
            "inset 2px 2px 4px hsl(var(--neu-dark) / 0.65)",
            "inset -2px -2px 4px hsl(var(--neu-light) / 0.95)",
            "0 1px 0 hsl(var(--neu-light) / 0.6)",
          ].join(", "),
        }}
      >
        {/* LEDs */}
        <div className="absolute inset-0 flex items-center justify-around px-4">
          {Array.from({ length: dots }).map((_, i) => {
            const on = i < lit;
            return (
              <span
                key={i}
                className="block h-1 w-1 rounded-full transition-all duration-500"
                style={{
                  background: on
                    ? "radial-gradient(circle at 30% 30%, hsl(var(--accent) / 0.4), hsl(var(--accent)) 70%)"
                    : "radial-gradient(circle at 30% 30%, hsl(var(--muted-foreground) / 0.3), hsl(var(--muted-foreground) / 0.5) 70%)",
                  boxShadow: on
                    ? "0 0 4px hsl(var(--accent) / 0.95), 0 0 8px hsl(var(--accent) / 0.45)"
                    : "inset 0 0.5px 1px hsl(var(--neu-dark) / 0.15)",
                }}
              />
            );
          })}
        </div>

        {/* Knob (esfera 3D) */}
        <div
          className="absolute top-1/2 -translate-y-1/2 transition-[left] duration-700 ease-out"
          style={{ left: `calc(${knobPct}% - 8px)` }}
        >
          <div
            className="h-4 w-4 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 32% 28%, hsl(var(--neu-light)) 0%, hsl(var(--background)) 50%, hsl(var(--neu-dark)) 100%)",
              boxShadow: [
                "0 0 0 1px hsl(var(--border))",
                "inset 1px 1px 2px hsl(var(--neu-light) / 0.9)",
                "inset -1px -1px 3px hsl(var(--neu-dark) / 0.55)",
                "2px 2px 5px hsl(0 0% 0% / 0.4)",
                "0 0 10px hsl(var(--accent) / 0.3)",
              ].join(", "),
            }}
          />
        </div>
      </div>
    </div>
  );
}

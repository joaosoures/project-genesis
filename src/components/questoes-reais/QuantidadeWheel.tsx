import { useEffect, useRef, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { feedback } from "@/lib/sensory";

const MIN = 5;
const MAX = 15;
const STEP = 50;
const values = Array.from({ length: MAX - MIN + 1 }, (_, index) => MIN + index);
const clamp = (number: number, min: number, max: number) => Math.max(min, Math.min(max, number));

export default function QuantidadeWheel({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [position, setPosition] = useState(value - MIN);
  const positionRef = useRef(value - MIN);
  const selectedRef = useRef(value);
  const targetRef = useRef(value - MIN);
  const onChangeRef = useRef(onChange);
  const frameRef = useRef<number | null>(null);
  const settleRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dragRef = useRef<{ pointerId: number; y: number; time: number; velocity: number } | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  onChangeRef.current = onChange;

  const stop = () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    if (settleRef.current !== null) clearTimeout(settleRef.current);
    frameRef.current = null;
    settleRef.current = null;
  };

  const moveTo = (next: number) => {
    positionRef.current = next;
    setPosition(next);
    const selected = MIN + clamp(Math.round(next), 0, MAX - MIN);
    if (selected !== selectedRef.current) {
      selectedRef.current = selected;
      onChangeRef.current(selected);
      feedback("tick");
    }
  };

  const snapTo = (target: number) => {
    stop();
    const end = clamp(Math.round(target), 0, MAX - MIN);
    targetRef.current = end;
    const start = positionRef.current;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.dataset.reduceMotion === "1") {
      moveTo(end);
      return;
    }
    const began = performance.now();
    const animate = (now: number) => {
      const progress = clamp((now - began) / 300, 0, 1);
      moveTo(start + (end - start) * (1 - Math.pow(1 - progress, 3)));
      if (progress < 1) frameRef.current = requestAnimationFrame(animate);
      else frameRef.current = null;
    };
    frameRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (value !== selectedRef.current) {
      stop();
      selectedRef.current = value;
      targetRef.current = value - MIN;
      positionRef.current = value - MIN;
      setPosition(value - MIN);
    }
  }, [value]);

  useEffect(() => {
    const wheel = wheelRef.current;
    if (!wheel) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      if (dragRef.current) return;
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
      const delta = event.deltaMode === 1 ? event.deltaY * 16 : event.deltaMode === 2 ? event.deltaY * STEP : event.deltaY;
      moveTo(clamp(positionRef.current + clamp(delta / STEP, -1.5, 1.5), 0, MAX - MIN));
      if (settleRef.current !== null) clearTimeout(settleRef.current);
      settleRef.current = setTimeout(() => snapTo(positionRef.current), 110);
    };
    wheel.addEventListener("wheel", onWheel, { passive: false });
    return () => wheel.removeEventListener("wheel", onWheel);
  }, []);

  useEffect(() => () => stop(), []);

  const changeBy = (delta: number) => {
    snapTo(targetRef.current + delta);
  };

  return (
    <div className="flex flex-col items-center gap-5" role="group" aria-label="Quantidade de questões">
      <div className="flex w-full max-w-[390px] items-center justify-center gap-3 sm:gap-5">
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-full border-border/70 bg-card shadow-[var(--shadow-neu-out-sm)] active:scale-95" onClick={() => changeBy(-1)} disabled={value === MIN} aria-label="Diminuir quantidade">
          <Minus className="h-4 w-4" />
        </Button>
        <div
          ref={wheelRef}
          tabIndex={0}
          role="spinbutton"
          aria-label="Número de questões"
          aria-valuemin={MIN}
          aria-valuemax={MAX}
          aria-valuenow={value}
          aria-valuetext={`${value} questões`}
          onKeyDown={(event) => {
            if (["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft", "Home", "End"].includes(event.key)) event.preventDefault();
            if (event.key === "ArrowUp" || event.key === "ArrowRight") changeBy(1);
            if (event.key === "ArrowDown" || event.key === "ArrowLeft") changeBy(-1);
            if (event.key === "Home") snapTo(0);
            if (event.key === "End") snapTo(MAX - MIN);
          }}
          onPointerDown={(event) => {
            if (!event.isPrimary) return;
            stop();
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { pointerId: event.pointerId, y: event.clientY, time: performance.now(), velocity: 0 };
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            const now = performance.now();
            const delta = (drag.y - event.clientY) / STEP;
            moveTo(clamp(positionRef.current + delta, -0.35, MAX - MIN + 0.35));
            drag.velocity = delta / Math.max(now - drag.time, 8);
            drag.y = event.clientY;
            drag.time = now;
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current;
            if (!drag || drag.pointerId !== event.pointerId) return;
            dragRef.current = null;
            const velocity = performance.now() - drag.time < 80 ? drag.velocity : 0;
            snapTo(positionRef.current + clamp(velocity * 160, -2.5, 2.5));
          }}
          onPointerCancel={() => {
            dragRef.current = null;
            snapTo(positionRef.current);
          }}
          className="relative h-[250px] w-[min(100%,270px)] min-w-0 cursor-grab select-none overflow-hidden rounded-[2rem] border border-border/70 bg-gradient-to-b from-background via-card to-background shadow-[var(--shadow-neu-in)] outline-none touch-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          style={{ perspective: "850px", WebkitUserSelect: "none" }}
        >
          <div aria-hidden="true" className="absolute inset-x-4 top-1/2 z-10 h-[58px] -translate-y-1/2 rounded-2xl border-y border-accent/50 bg-accent/10 shadow-[inset_0_1px_0_hsl(var(--neu-light)/0.6),0_0_24px_hsl(var(--accent)/0.12)]" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
            {values.map((number, index) => {
              const distance = index - position;
              const near = Math.abs(distance);
              return (
                <div
                  key={number}
                  className="absolute left-0 top-1/2 flex h-[50px] w-full items-center justify-center tabular-nums"
                  style={{
                    transform: `translateY(-50%) rotateX(${-distance * 20}deg) translateZ(140px)`,
                    opacity: near > 4.2 ? 0 : near < 0.55 ? 1 : Math.max(0.18, 0.8 - near * 0.16),
                    color: near < 0.55 ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
                    fontSize: near < 0.55 ? 36 : 28,
                    fontWeight: near < 0.55 ? 800 : 600,
                    backfaceVisibility: "hidden",
                  }}
                >{number}</div>
              );
            })}
          </div>
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-20 rounded-[2rem] bg-gradient-to-b from-background via-transparent to-background [background-size:100%_100%]" style={{ maskImage: "linear-gradient(to bottom, black 0%, transparent 36%, transparent 64%, black 100%)", WebkitMaskImage: "linear-gradient(to bottom, black 0%, transparent 36%, transparent 64%, black 100%)" }} />
        </div>
        <Button variant="outline" size="icon" className="h-11 w-11 shrink-0 rounded-full border-border/70 bg-card shadow-[var(--shadow-neu-out-sm)] active:scale-95" onClick={() => changeBy(1)} disabled={value === MAX} aria-label="Aumentar quantidade">
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-center text-xs font-medium text-muted-foreground">Deslize ou role para escolher · {MIN} a {MAX} questões</p>
    </div>
  );
}

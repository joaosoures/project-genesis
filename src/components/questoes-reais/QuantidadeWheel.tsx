import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuantidadeWheel({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const update = (next: number) => onChange(Math.max(5, Math.min(15, next)));
  return (
    <div className="flex items-center justify-center gap-5" role="group" aria-label="Quantidade de questões">
      <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => update(value - 1)} disabled={value === 5} aria-label="Diminuir quantidade"><Minus /></Button>
      <div
        tabIndex={0}
        role="spinbutton"
        aria-valuemin={5}
        aria-valuemax={15}
        aria-valuenow={value}
        onKeyDown={(event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowRight") update(value + 1);
          if (event.key === "ArrowDown" || event.key === "ArrowLeft") update(value - 1);
        }}
        onWheel={(event) => update(value + (event.deltaY > 0 ? -1 : 1))}
        className="grid h-40 w-32 place-items-center rounded-[2.5rem] border border-accent/30 bg-gradient-to-b from-accent/5 via-card to-accent/5 shadow-xl outline-none ring-accent focus:ring-2"
      >
        <span className="text-7xl font-black tabular-nums text-accent">{value}</span>
      </div>
      <Button variant="outline" size="icon" className="h-12 w-12 rounded-full" onClick={() => update(value + 1)} disabled={value === 15} aria-label="Aumentar quantidade"><Plus /></Button>
    </div>
  );
}

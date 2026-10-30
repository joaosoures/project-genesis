import { Checkbox } from "@/components/ui/checkbox";
import { QUESTOES_REAIS_AREAS, QuestaoRealArea } from "@/lib/questoes-reais";

export default function AreaSelector({ value, onChange }: { value: QuestaoRealArea[]; onChange: (areas: QuestaoRealArea[]) => void }) {
  const all = value.length === QUESTOES_REAIS_AREAS.length;
  const some = value.length > 0 && !all;
  return (
    <div className="space-y-3">
      <label className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4 font-bold">
        <Checkbox checked={all ? true : some ? "indeterminate" : false} onCheckedChange={(checked) => onChange(checked ? QUESTOES_REAIS_AREAS.map((a) => a.value) : [])} />
        Marcar todas
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        {QUESTOES_REAIS_AREAS.map((area) => {
          const checked = value.includes(area.value);
          return <label key={area.value} className="flex cursor-pointer items-center gap-3 rounded-2xl border bg-card p-4 hover:border-accent/50">
            <Checkbox checked={checked} onCheckedChange={(next) => onChange(next ? [...value, area.value] : value.filter((item) => item !== area.value))} />
            <span>{area.label}</span>
          </label>;
        })}
      </div>
    </div>
  );
}

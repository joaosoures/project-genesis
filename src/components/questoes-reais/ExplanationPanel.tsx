import { BookOpenCheck } from "lucide-react";

type ExplanationValue = string | null | undefined | Record<string, unknown>;

function toText(value: ExplanationValue) {
  if (typeof value === "string") {
    const text = value.trim();
    return text && text !== "[object Object]" ? text : null;
  }
  if (!value || typeof value !== "object") return null;

  const text = Object.values(value)
    .filter((part): part is string => typeof part === "string")
    .join(" ")
    .trim();
  return text || null;
}

export default function ExplanationPanel({ explanations }: { explanations: ExplanationValue[] }) {
  const visible = explanations.map(toText).filter((item): item is string => Boolean(item));
  if (!visible.length) return null;
  return <div className="mt-6 space-y-3 border-t pt-5">
    <div className="flex items-center gap-2 font-bold text-accent"><BookOpenCheck className="h-5 w-5" /> Justificativa</div>
    {visible.map((text, index) => <div key={index} className="rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed">{text}</div>)}
  </div>;
}

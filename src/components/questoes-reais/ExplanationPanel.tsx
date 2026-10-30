import { BookOpenCheck } from "lucide-react";

export default function ExplanationPanel({ explanations }: { explanations: Array<string | null> }) {
  const visible = explanations.filter((item): item is string => Boolean(item?.trim()));
  if (!visible.length) return null;
  return <div className="mt-6 space-y-3 border-t pt-5">
    <div className="flex items-center gap-2 font-bold text-accent"><BookOpenCheck className="h-5 w-5" /> Justificativa</div>
    {visible.map((text, index) => <div key={index} className="rounded-2xl bg-muted/60 p-4 text-sm leading-relaxed">{text}</div>)}
  </div>;
}

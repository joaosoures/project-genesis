import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import type { AulaPlano } from "@/hooks/useTrilhaPlano";

interface Props {
  aulas: AulaPlano[];
}

export default function RevisaoEspecifica({ aulas }: Props) {
  const navigate = useNavigate();
  const [q, setQ] = useState("");

  const filtradas = q.trim().length < 2
    ? []
    : aulas
        .filter((a) => {
          const t = q.toLowerCase();
          return (
            a.nome.toLowerCase().includes(t) ||
            a.especialidade.toLowerCase().includes(t) ||
            (a.key_words ?? "").toLowerCase().includes(t)
          );
        })
        .slice(0, 8);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Revisão específica — furar a fila</h3>
      </div>
      <Input
        placeholder="Buscar matéria, aula ou tema..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {filtradas.length > 0 && (
        <div className="mt-2 max-h-64 overflow-y-auto minimal-scroll space-y-1">
          {filtradas.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate(`/estudo?tipo=aula&aula_id=${a.id}`)}
              className="w-full text-left p-2.5 rounded-lg hover:bg-muted transition flex items-center justify-between gap-2"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{a.nome}</div>
                <div className="text-[11px] text-muted-foreground">
                  {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade} · {a.total_oqs} OQs
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

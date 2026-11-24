import { useState } from "react";
import { Check, Eraser, FileJson, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { parseOqsJson, type ImportedOq } from "@/lib/oq-import";
import type { Especialidade } from "@/lib/oq";

export function OqJsonImport({ specialty, onLoad }: { specialty?: Especialidade; onLoad: (items: ImportedOq[]) => void }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const load = () => {
    if (!specialty) return;
    setBusy(true);
    try {
      const parsed = parseOqsJson(text, specialty);
      onLoad(parsed);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível interpretar o JSON.");
    } finally {
      setBusy(false);
    }
  };
  return <Card className="min-w-0 space-y-4 p-5">
    <div className="flex items-center gap-2"><FileJson className="h-4 w-4 text-accent"/><div><h3 className="font-bold">2. Importar JSON</h3><p className="text-xs text-muted-foreground">Aceita array ou objeto {`{ "oqs": [...] }`}, com modo ABCDE, Lacuna ou OQ Falta.</p></div></div>
    <Textarea value={text} onChange={event => setText(event.target.value)} rows={12} className="min-h-64 w-full max-w-full resize-y font-mono text-xs" placeholder={'[{"modo":"ABCDE","comando":"...","respostas":{"A":"...","B":"...","C":"...","D":"...","E":"..."},"gabarito":"A"}]'} />
    <div className="space-y-1 rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground"><p><strong>ABCDE:</strong> comando, respostas A–E e gabarito.</p><p><strong>Lacuna:</strong> comando com <code>____</code>, resposta e variações.</p><p><strong>OQ Falta:</strong> comando, 2–5 respostas e variações correspondentes.</p><p>Especialidade omitida será herdada da aula; uma divergente será recusada. Nada é salvo antes da confirmação final.</p></div>
    {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2"><Button onClick={load} disabled={!specialty || !text.trim() || busy}>{busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}Carregar Novos OQs</Button><Button variant="outline" onClick={() => { setText(""); setError(""); onLoad([]); }}><Eraser className="mr-2 h-4 w-4"/>Limpar</Button></div>
  </Card>;
}

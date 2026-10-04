import { useEffect, useState } from "react";
import { Check, Loader2, Cpu } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

export default function CastigoModelSettings() {
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.functions.invoke("admin-castigo-model", { body: { action: "get" } }).then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar o modelo do Castigo.");
      else setModel(data?.model ?? "");
      setLoading(false);
    });
  }, []);

  const validateAndSave = async () => {
    setChecking(true);
    setValid(null);
    const { data, error } = await supabase.functions.invoke("admin-castigo-model", { body: { model: model.trim() } });
    setChecking(false);
    if (error || !data?.valid) {
      setValid(false);
      toast.error(data?.error ?? "Não foi possível validar o modelo.");
      return;
    }
    setModel(data.model);
    setValid(true);
    toast.success("Modelo validado e salvo.");
  };

  return <Card className="border-primary/20 bg-card/50 p-4">
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 mr-auto">
        <Cpu className="h-4 w-4 text-primary" />
        <div><p className="text-sm font-semibold">Modelo da IA do Castigo</p><p className="text-xs text-muted-foreground">Validado no servidor antes de salvar</p></div>
      </div>
      {valid === true && <Badge className="gap-1 bg-emerald-500/15 text-emerald-600"><Check className="h-3 w-3" /> válido</Badge>}
      {valid === false && <Badge variant="destructive">inválido</Badge>}
      <div className="flex w-full gap-2 sm:w-auto">
        <Input value={model} onChange={event => { setModel(event.target.value); setValid(null); }} disabled={loading || checking} placeholder="provider/model" className="h-9 min-w-0 sm:w-72" aria-label="Modelo de IA do Castigo" />
        <Button type="button" size="sm" className="h-9 shrink-0" onClick={validateAndSave} disabled={loading || checking || !model.trim()} aria-label="Validar e salvar modelo">
          {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  </Card>;
}

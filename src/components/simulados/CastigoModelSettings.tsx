import { useEffect, useState } from "react";
import { Check, Loader2, Cpu, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const MAX_EDITORIAL_LENGTH = 12000;

export default function CastigoModelSettings() {
  const [model, setModel] = useState("");
  const [editorialPrompt, setEditorialPrompt] = useState("");
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [savingEditorial, setSavingEditorial] = useState(false);
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    supabase.functions.invoke("admin-castigo-model", { body: { action: "get" } }).then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar a configuração do Castigo.");
      else {
        setModel(data?.model ?? "");
        setEditorialPrompt(data?.editorialPrompt ?? "");
      }
      setLoading(false);
    });
  }, []);

  const validateAndSaveModel = async () => {
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

  const saveEditorialPrompt = async () => {
    const value = editorialPrompt.trim();
    if (!value || value.length > MAX_EDITORIAL_LENGTH) {
      toast.error("Informe uma diretriz editorial de até 12.000 caracteres.");
      return;
    }
    setSavingEditorial(true);
    const { data, error } = await supabase.functions.invoke("admin-castigo-model", { body: { editorialPrompt: value } });
    setSavingEditorial(false);
    if (error || !data?.valid) {
      toast.error(data?.error ?? "Não foi possível salvar as diretrizes editoriais.");
      return;
    }
    setEditorialPrompt(data.editorialPrompt);
    toast.success("Diretrizes editoriais salvas.");
  };

  return <div className="space-y-4">
    <Card className="border-primary/20 bg-card/50 p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 mr-auto">
          <Cpu className="h-4 w-4 text-primary" />
          <div><p className="text-sm font-semibold">Modelo da IA do Castigo e do Laboratório de OQs</p><p className="text-xs text-muted-foreground">A mesma chave OpenRouter e este modelo também são usados para extrair OQs das questões respondidas.</p></div>
        </div>
        {valid === true && <Badge className="gap-1 bg-emerald-500/15 text-emerald-600"><Check className="h-3 w-3" /> válido</Badge>}
        {valid === false && <Badge variant="destructive">inválido</Badge>}
        <div className="flex w-full gap-2 sm:w-auto">
          <Input value={model} onChange={event => { setModel(event.target.value); setValid(null); }} disabled={loading || checking} placeholder="provider/model" className="h-9 min-w-0 sm:w-72" aria-label="Modelo de IA do Castigo" />
          <Button type="button" size="sm" className="h-9 shrink-0" onClick={validateAndSaveModel} disabled={loading || checking || !model.trim()} aria-label="Validar e salvar modelo">
            {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </Card>

    <Card className="border-primary/20 bg-card/50 p-4 space-y-4">
      <div className="flex items-start gap-2">
        <ShieldCheck className="mt-0.5 h-4 w-4 text-primary" />
        <div><p className="text-sm font-semibold">Configuração do prompt do Castigo</p><p className="text-xs text-muted-foreground">As regras de segurança, formato JSON, validação, quantidade e distribuição dos gabaritos são protegidas no backend.</p></div>
      </div>
      <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Regras obrigatórias do sistema · somente leitura</p>
        <p className="mt-1">Incluem proteção contra prompt injection, três questões filhas, cinco alternativas, gabaritos distintos, plausibilidade clínica, critérios de qualidade e compatibilidade com a publicação.</p>
      </div>
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2"><label htmlFor="castigo-editorial-prompt" className="text-sm font-medium">Diretrizes editoriais complementares</label><span className="text-xs text-muted-foreground">{editorialPrompt.length.toLocaleString("pt-BR")} / {MAX_EDITORIAL_LENGTH.toLocaleString("pt-BR")}</span></div>
        <Textarea id="castigo-editorial-prompt" value={editorialPrompt} onChange={event => setEditorialPrompt(event.target.value)} disabled={loading || savingEditorial} maxLength={MAX_EDITORIAL_LENGTH} rows={8} placeholder="Defina preferências editoriais para estilo, densidade e abordagem das questões..." />
        <p className="text-xs text-muted-foreground">Este texto é complementar e não pode remover regras protegidas, formato JSON, validações ou critérios mínimos de qualidade.</p>
        <Button type="button" onClick={saveEditorialPrompt} disabled={loading || savingEditorial || !editorialPrompt.trim()}>
          {savingEditorial ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}Salvar diretrizes editoriais
        </Button>
      </div>
    </Card>
  </div>;
}

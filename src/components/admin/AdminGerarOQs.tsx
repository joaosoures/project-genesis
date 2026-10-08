import { useEffect, useState } from "react";
import { Check, Cpu, FileText, Loader2, Pencil, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const specialties = [
  ["clinica_medica", "Clínica Médica"],
  ["cirurgia_geral", "Cirurgia Geral"],
  ["pediatria", "Pediatria"],
  ["ginecologia_obstetricia", "Ginecologia e Obstetrícia"],
  ["medicina_preventiva", "Medicina Preventiva e Social"],
] as const;

export default function AdminGerarOQs() {
  const { user } = useAuth();
  const [model, setModel] = useState("");
  const [prompt, setPrompt] = useState("");
  const [text, setText] = useState("");
  const [baralho, setBaralho] = useState("");
  const [specialty, setSpecialty] = useState("clinica_medica");
  const [promptOpen, setPromptOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    supabase.functions.invoke("admin-oq-model", { body: { action: "get" } }).then(({ data, error }) => {
      if (error) toast.error("Não foi possível carregar as configurações de OQs.");
      else { setModel(data?.model ?? ""); setPrompt(data?.prompt ?? ""); }
      setLoading(false);
    });
  }, []);

  const saveSettings = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-oq-model", { body: { model: model.trim(), prompt } });
    setSaving(false);
    if (error || !data?.valid) { toast.error(data?.error ?? "Não foi possível salvar as configurações."); return; }
    setModel(data.model);
    setPrompt(data.prompt);
    setPromptOpen(false);
    toast.success("Modelo e prompt salvos com segurança.");
  };

  const generate = async () => {
    if (!user || !baralho.trim() || text.trim().length < 200) {
      toast.error("Informe o nome do baralho e cole pelo menos 200 caracteres.");
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("gerar-oqs-ia", { body: { text: text.trim(), fileName: baralho.trim(), specialty } });
    if (error || data?.error) {
      toast.error(data?.error ?? "Não foi possível gerar os OQs.");
      setGenerating(false);
      return;
    }
    const rows = (data?.questions ?? []).map((q: any) => ({ user_id: user.id, pergunta: q.pergunta, resposta: q.resposta, variacoes: q.variacoes || "", modo: q.modo, opcoes: q.opcoes ?? null, especialidade: specialty, explicacao: q.explicacao || "", contexto_origem: baralho.trim() }));
    const { error: insertError } = await supabase.from("temp_oqs").insert(rows as any[]);
    setGenerating(false);
    if (insertError) toast.error("A IA gerou os OQs, mas não foi possível salvá-los.");
    else { toast.success(`${rows.length} OQs gerados e salvos para revisão.`); setText(""); }
  };

  return <div className="space-y-4">
    <div><h2 className="text-xl font-bold">Geração de OQs</h2><p className="text-sm text-muted-foreground">Gere questões administrativas com o modelo e as regras de formato configuradas abaixo.</p></div>
    <Card className="border-primary/20 bg-card/50 p-4">
      <div className="flex flex-wrap items-center gap-3"><Cpu className="h-4 w-4 text-primary" /><div className="mr-auto"><p className="text-sm font-semibold">Modelo da IA para OQs</p><p className="text-xs text-muted-foreground">Use o mesmo formato provider/model do Castigo do Simulado.</p></div><Input value={model} onChange={e => setModel(e.target.value)} disabled={loading || saving} placeholder="provider/model" className="h-9 w-full sm:w-72" /><Button size="sm" onClick={saveSettings} disabled={loading || saving || !model.trim()}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}<span className="ml-2">Salvar</span></Button><Button size="sm" variant="outline" onClick={() => setPromptOpen(true)} disabled={loading}><Pencil className="mr-2 h-4 w-4" />Editar prompt de formato</Button></div>
    </Card>
    <Card className="space-y-4 border-primary/20 bg-card/50 p-4">
      <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /><p className="font-semibold">Novo lote</p></div>
      <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><Label htmlFor="oq-baralho">Baralho</Label><Input id="oq-baralho" value={baralho} onChange={e => setBaralho(e.target.value)} placeholder="Nome do baralho/material" /></div><div className="space-y-2"><Label>Especialidade</Label><Select value={specialty} onValueChange={setSpecialty}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{specialties.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select></div></div>
      <div className="space-y-2"><Label htmlFor="oq-resumo">Resumo para geração</Label><Textarea id="oq-resumo" value={text} onChange={e => setText(e.target.value)} rows={10} maxLength={20000} placeholder="Cole o conteúdo base dos OQs..." /></div>
      <Button onClick={generate} disabled={generating || loading || !model}>{generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}{generating ? "Gerando..." : "Gerar OQs"}</Button>
    </Card>
    <Dialog open={promptOpen} onOpenChange={setPromptOpen}><DialogContent className="max-w-4xl"><DialogHeader><DialogTitle>Prompt de sistema · formato dos OQs</DialogTitle></DialogHeader><p className="text-xs text-muted-foreground">Este texto é enviado ao modelo para definir a estrutura dos OQs. A chave de API é mantida exclusivamente no servidor e nunca aparece aqui.</p><Textarea value={prompt} onChange={e => setPrompt(e.target.value)} rows={22} className="font-mono text-xs" /><DialogFooter><Button variant="outline" onClick={() => setPromptOpen(false)}>Cancelar</Button><Button onClick={saveSettings} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}Salvar prompt</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}

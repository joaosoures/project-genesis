import { useEffect, useState, useRef } from "react";
import { TEMPLATE_HEADERS, TEMPLATE_ROWS, TEMPLATE_COLUMNS, addGuideSheet, PROMPT_MESTRE } from "@/lib/oq-template-guide";
import { Card } from "@/components/ui/card";
import { 
  Sparkles, Upload, FileText, CheckCircle2, Loader2, 
  AlertCircle, Trash2, AlertTriangle, FileSpreadsheet, 
  Download, HelpCircle, Copy, Pencil, Save, X, Activity, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TactileButton from "@/components/console/TactileButton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ESPECIALIDADE_LABEL, Especialidade, Modo, MODO_LABEL } from "@/lib/oq";
import { cn } from "@/lib/utils";
import ExcelJS from 'exceljs';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserPlan } from "@/hooks/useUserPlan";
import { Link } from "react-router-dom";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import AdminGerarSimulado from "@/components/simulados/AdminGerarSimulado";


interface TempOQ {
  id: string;
  pergunta: string;
  resposta: string;
  variacoes?: string;
  modo: string;
  especialidade: string;
  opcoes?: any;
  explicacao?: string;
  contexto_origem?: string | null;
}

export default function GerarOQs() {
  const { user, isAdmin } = useAuth();
  const { canUse, loading: planLoading } = useUserPlan();
  const canIA = canUse("gerar_oq_ia");
  const canPlanilha = canUse("gerar_oq_planilha");
  const blocked = !planLoading && !isAdmin && !canIA && !canPlanilha;
  const [loading, setLoading] = useState(false);
  const [credits, setCredits] = useState<{ remaining: string | number; limit?: string | null } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [pastedText, setPastedText] = useState<string>("");
  const [baralho, setBaralho] = useState<string>("");
  const [baralhoExcel, setBaralhoExcel] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [specialty, setSpecialty] = useState<Especialidade>("clinica_medica");
  const [tempOQs, setTempOQs] = useState<TempOQ[]>([]);
  const [editingOQ, setEditingOQ] = useState<TempOQ | null>(null);
  const [showSimuladoCreator, setShowSimuladoCreator] = useState(false);
  const MAX_CHARS = 20000;


  useEffect(() => {
    document.title = "Gerar OQs — OQ MED";
    loadTempOQs();
    fetchCredits();
  }, [user]);

  async function fetchCredits() {
    try {
      const { data, error } = await supabase.functions.invoke("ai-status");
      if (error) throw error;
      if (data?.credits) {
        setCredits(data.credits);
      } else {
        setCredits({ remaining: 0 });
      }
    } catch (err) {
      console.error("Erro ao buscar créditos:", err);
      setCredits({ remaining: 0 });
    }
  }

  async function loadTempOQs() {
    if (!user) return;
    const { data, error } = await supabase
      .from("temp_oqs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    
    if (error) console.error("Erro ao carregar OQs temporários:", error);
    else setTempOQs(data || []);
  }

  async function handleSaveEdit() {
    if (!editingOQ) return;
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from("temp_oqs")
        .update({
          pergunta: editingOQ.pergunta,
          resposta: editingOQ.resposta,
          variacoes: editingOQ.variacoes,
          modo: editingOQ.modo,
          especialidade: editingOQ.especialidade,
          opcoes: editingOQ.opcoes,
          explicacao: editingOQ.explicacao
        })
        .eq("id", editingOQ.id);

      if (error) throw error;

      toast.success("OQ atualizado com sucesso!");
      setTempOQs(prev => prev.map(q => q.id === editingOQ.id ? editingOQ : q));
      setEditingOQ(null);
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar alterações: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadTemplate() {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Template OQs");
    ws.addRow(TEMPLATE_HEADERS);
    TEMPLATE_ROWS.forEach(r => ws.addRow(r));
    ws.columns = TEMPLATE_COLUMNS;
    ws.getRow(1).font = { bold: true };
    addGuideSheet(wb);

    const buf = await wb.xlsx.writeBuffer();
    const blob = new Blob([buf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "template_oq_med_v5.xlsx";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Template baixado! 15 colunas + aba Guia de Preenchimento.");
  }

  async function handleExcelUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    const nomeBaralho = baralhoExcel.trim();
    if (!nomeBaralho) {
      toast.error("Informe o nome do baralho (matéria) antes de importar a planilha.");
      event.target.value = '';
      return;
    }

    setLoading(true);
    setStatus("Lendo planilha...");

    try {
      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const worksheet = wb.worksheets[0];
      if (!worksheet) throw new Error("Planilha vazia");

      const headerRow = worksheet.getRow(1);
      const headers: string[] = [];
      headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
        headers[col - 1] = String(cell.value ?? "").trim();
      });

      const json: Record<string, any>[] = [];
      worksheet.eachRow({ includeEmpty: false }, (row, rowNum) => {
        if (rowNum === 1) return;
        const obj: Record<string, any> = {};
        row.eachCell({ includeEmpty: true }, (cell, col) => {
          const key = headers[col - 1];
          if (!key) return;
          const v: any = cell.value;
          obj[key] = v && typeof v === "object" && "text" in v ? (v as any).text : v;
        });
        json.push(obj);
      });

      // Limite de 20 OQs para não-admins
      const EXCEL_LIMIT = 20;
      let finalJson = json;
      if (!isAdmin && json.length > EXCEL_LIMIT) {
        toast.warning(`Limite de ${EXCEL_LIMIT} OQs por importação atingido. Apenas as primeiras ${EXCEL_LIMIT} linhas serão processadas.`, {
          description: "Admins não possuem restrição de limite."
        });
        finalJson = json.slice(0, EXCEL_LIMIT);
      }

      const norm = (v: any) => (v == null ? "" : String(typeof v === "object" && "text" in v ? (v as any).text : v).trim());

      const toInsert = finalJson.map((row: any) => {
        // Aceita tanto cabeçalhos novos quanto os legados, para retro-compatibilidade
        const get = (...keys: string[]) => {
          for (const k of keys) {
            if (row[k] != null && String(row[k]).trim() !== "") return norm(row[k]);
          }
          return "";
        };

        const espLabel = get("Especialidade").toLowerCase();
        const esp = Object.entries(ESPECIALIDADE_LABEL).find(([_, label]) =>
          label.toLowerCase() === espLabel
        )?.[0] || "clinica_medica";

        const modoLabel = get("Modo").toLowerCase();
        const modo = Object.entries(MODO_LABEL).find(([_, label]) =>
          label.toLowerCase() === modoLabel
        )?.[0] || "abcde";

        const comando = get("comando", "Pergunta");
        const respostas = [1, 2, 3, 4, 5].map(i =>
          get(`resposta ${i}`, i === 1 ? "Gabarito (Resposta Correta)" : `Opção ${["A","B","C","D","E"][i-1]}`)
        );
        const variacoes = [1, 2, 3, 4, 5].map(i =>
          get(`variações ${i}`, `variacoes ${i}`, i === 1 ? "Variações do Gabarito (opcional)" : "")
        );
        const gabarito = get("gabarito");
        const explicacao = get("explicação", "explicacao", "Explicação");

        let pergunta = comando;
        let resposta = "";
        let variacoesField = "";
        let opcoes: (string | null)[] | null = null;

        if (modo === "abcde") {
          // Gabarito: letra (A-E) ou texto idêntico a uma das respostas
          opcoes = respostas.map(r => r || null);
          resposta = gabarito || respostas[0] || "";
        } else if (modo === "lacuna") {
          resposta = respostas[0] || "";
          variacoesField = variacoes[0] || "";
          opcoes = null;
        } else if (modo === "oq_falta") {
          // App escolhe o item omitido; armazenamos todas as 5 respostas e variações
          opcoes = respostas.map(r => r || null);
          // resposta serve apenas como rótulo de exibição na tela de revisão
          resposta = respostas.filter(Boolean)[0] || "";
          variacoesField = variacoes.join("||");
        }

        return {
          user_id: user.id,
          pergunta,
          resposta,
          variacoes: variacoesField,
          modo,
          especialidade: esp,
          explicacao,
          contexto_origem: nomeBaralho,
          opcoes: opcoes && opcoes.some(Boolean) ? opcoes : null,
        };
      }).filter(q => q.pergunta && (q.modo === "oq_falta" ? (q.opcoes && (q.opcoes as any[]).filter(Boolean).length >= 2) : q.resposta));

      if (toInsert.length === 0) {
        toast.error("Nenhuma questão válida encontrada. Verifique se preencheu 'Pergunta' e 'Gabarito'.");
        setLoading(false);
        setStatus("");
        return;
      }

      const { error: insError } = await supabase.from("temp_oqs").insert(toInsert as any[]);
      if (insError) throw insError;

      toast.success(`${toInsert.length} questões carregadas! Revise e aprove abaixo.`);
      loadTempOQs();
      setLoading(false);
      setStatus("");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar planilha: " + err.message);
      setLoading(false);
      setStatus("");
    }
    event.target.value = '';
  }

  function requireIA(): boolean {
    if (!canIA) {
      toast.error("Geração por IA é exclusiva do plano Aluno de Ouro", {
        description: "Faça upgrade para liberar o upload de arquivos e a geração automática por IA.",
        action: { label: "Ver planos", onClick: () => (window.location.href = "/meu-plano") },
      });
      return false;
    }
    return true;
  }

  async function handleGenerate() {
    if (!requireIA()) return;

    if (credits !== null && Number(credits.remaining) <= 0) {
      toast.error("Créditos de IA esgotados", {
        description: "Você atingiu seu limite mensal. Verifique a aba de Status para mais informações.",
        action: { label: "Ver Status", onClick: () => (window.location.href = "/status") }
      });
      return;
    }

    if (!user) return;

    const text = pastedText.trim();
    const nomeBaralho = baralho.trim();

    if (!nomeBaralho) {
      toast.error("Informe o nome do baralho (matéria) antes de gerar.");
      return;
    }
    if (text.length < 200) {
      toast.error("Cole pelo menos 200 caracteres do resumo para gerar boas questões.");
      return;
    }
    if (text.length > MAX_CHARS) {
      toast.error(`Texto excede o limite de ${MAX_CHARS.toLocaleString("pt-BR")} caracteres. Reduza para gerar.`);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setLoading(true);
    setStatus("Enviando para IA...");
    try {
      const { data, error } = await supabase.functions.invoke("gerar-oqs-ia", {
        body: {
          text,
          fileName: nomeBaralho,
          specialty,
        },
        signal: controller.signal
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (!data?.questions) throw new Error("IA não retornou questões");

      setStatus(`Salvando ${data.questions.length} questões...`);

      const toInsert = data.questions.map((q: any) => ({
        user_id: user.id,
        pergunta: q.pergunta,
        resposta: q.resposta,
        variacoes: q.variacoes || "",
        modo: q.modo,
        opcoes: q.opcoes,
        especialidade: specialty,
        explicacao: q.explicacao || q.explanation || "Explicação não gerada pela IA.",
        contexto_origem: nomeBaralho,
      }));

      const { error: insError } = await supabase.from("temp_oqs").insert(toInsert as any[]);
      if (insError) throw insError;

      toast.success(`${data.questions.length} questões geradas com sucesso!`, {
        description: `Baralho: ${nomeBaralho}`
      });
      setPastedText("");
      loadTempOQs();
      fetchCredits();
    } catch (err: any) {
      if (err.name === 'AbortError') {
        toast.info("Geração cancelada pelo usuário");
      } else {
        console.error(err);
        const msg = err?.message || "Não conseguimos gerar suas questões agora.";
        toast.error(msg, {
          action: { label: "Ver status", onClick: () => (window.location.href = "/status") },
        });
        import("@/lib/aiErrorLog").then(m => m.logAiError(msg, "Gerar OQs por IA"));
      }
    } finally {
      setLoading(false);
      setStatus("");
      abortControllerRef.current = null;
    }
  }

  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }

  function buildCardPayload(q: TempOQ) {
    const isOQFalta = q.modo === "oq_falta";
    const isABCDE = q.modo === "abcde";
    const opcoes = Array.isArray(q.opcoes) ? q.opcoes : [];

    let gabaritoFinal = q.resposta;
    if (isABCDE && q.resposta && q.resposta.length > 1) {
      const idx = opcoes.findIndex(opt => opt && String(opt).trim().toLowerCase() === String(q.resposta).trim().toLowerCase());
      if (idx !== -1) gabaritoFinal = ["A", "B", "C", "D", "E"][idx];
      else {
        const firstChar = String(q.resposta).trim().toUpperCase();
        gabaritoFinal = ["A", "B", "C", "D", "E"].includes(firstChar) && q.resposta.length < 3 ? firstChar : "A";
      }
    } else if (isABCDE) {
      gabaritoFinal = String(q.resposta || "A").trim().toUpperCase();
    }

    // OQ Falta: opcoes[0..4] = info_1..5; variacoes "v1||v2||v3||v4||v5" = var_1..5
    const oqFaltaInfos = isOQFalta ? [0, 1, 2, 3, 4].map(i => opcoes[i] || null) : [];
    const varsSplit = (q.variacoes || "").split("||");
    const oqFaltaVars = isOQFalta ? [0, 1, 2, 3, 4].map(i => (varsSplit[i] || "").trim() || null) : [];

    return {
      modo: q.modo as Modo,
      especialidade: q.especialidade as Especialidade,
      comando: q.pergunta,
      alternativa_correta: isABCDE ? gabaritoFinal : null,
      alternativa_a: isABCDE ? (opcoes[0] || null) : null,
      alternativa_b: isABCDE ? (opcoes[1] || null) : null,
      alternativa_c: isABCDE ? (opcoes[2] || null) : null,
      alternativa_d: isABCDE ? (opcoes[3] || null) : null,
      alternativa_e: isABCDE ? (opcoes[4] || null) : null,
      info_1: isOQFalta ? oqFaltaInfos[0] : (!isABCDE ? q.resposta : null),
      var_1: isOQFalta ? oqFaltaVars[0] : (!isABCDE ? (q.variacoes || null) : null),
      info_2: isOQFalta ? oqFaltaInfos[1] : null,
      var_2: isOQFalta ? oqFaltaVars[1] : null,
      info_3: isOQFalta ? oqFaltaInfos[2] : null,
      var_3: isOQFalta ? oqFaltaVars[2] : null,
      info_4: isOQFalta ? oqFaltaInfos[3] : null,
      var_4: isOQFalta ? oqFaltaVars[3] : null,
      info_5: isOQFalta ? oqFaltaInfos[4] : null,
      var_5: isOQFalta ? oqFaltaVars[4] : null,
      explicacao: q.explicacao || "Explicação não disponível.",
      verificado: isAdmin ? true : false,
      criado_por_usuario_id: isAdmin ? null : user?.id,
      origem: (isAdmin ? "admin" : "usuario") as any,
      baralho: (q.contexto_origem || "").trim() || null,
    } as any;
  }

  async function approveOQ(q: TempOQ) {
    try {
      const { error } = await supabase.from("cards").insert([buildCardPayload(q)]);
      if (error) throw error;
      await supabase.from("temp_oqs").delete().eq("id", q.id);
      setTempOQs(prev => prev.filter(item => item.id !== q.id));
      toast.success("OQ aprovado e adicionado ao seu banco!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao aprovar OQ: " + err.message);
    }
  }

  async function deleteTemp(id: string) {
    await supabase.from("temp_oqs").delete().eq("id", id);
    setTempOQs(prev => prev.filter(item => item.id !== id));
  }

  async function approveAll() {
    if (tempOQs.length === 0) return;
    
    if (!confirm(`Tem certeza que deseja aprovar e adicionar ao banco todos os ${tempOQs.length} OQs pendentes?`)) {
      return;
    }
    
    toast.loading("Aprovando todos os OQs...", { id: "approve-all" });
    
    try {
      for (const q of tempOQs) {
        const { error } = await supabase.from("cards").insert([buildCardPayload(q)]);
        if (error) throw error;
      }
      
      // Deletar todos do temp após sucesso
      const ids = tempOQs.map(q => q.id);
      await supabase.from("temp_oqs").delete().in("id", ids);
      setTempOQs([]);
      toast.success("Todos os OQs foram aprovados!", { id: "approve-all" });
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao aprovar todos: " + err.message, { id: "approve-all" });
    }
  }

  async function discardAll() {
    if (tempOQs.length === 0) return;
    if (!confirm(`Tem certeza que deseja descartar todos os ${tempOQs.length} OQs pendentes? Esta ação não pode ser desfeita.`)) return;

    try {
      const ids = tempOQs.map(q => q.id);
      await supabase.from("temp_oqs").delete().in("id", ids);
      setTempOQs([]);
      toast.success("Todos os OQs pendentes foram descartados.");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao descartar todos.");
    }
  }

  if (blocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16">
        <div className="border border-[hsl(var(--border))] rounded-2xl p-8 text-center space-y-5 bg-[hsl(var(--card))]">
          <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 grid place-items-center">
            <Lock className="h-7 w-7 text-black" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold">Recurso bloqueado</h1>
            <p className="text-muted-foreground">
              A geração de OQs por IA e por planilha está disponível nos planos Aluno de Prata e Aluno de Ouro.
            </p>
          </div>
          <Button asChild size="lg">
            <Link to="/meu-plano">
              <Crown className="h-4 w-4 mr-2" /> Ver planos e fazer upgrade
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 pb-32">
      <header className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-[hsl(var(--accent))]" />
            Gerar OQs
          </h1>
          <p className="text-muted-foreground mt-2">
            Crie suas próprias questões através de IA ou importe dados via planilha.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 self-start md:self-center">
          <Link to="/status">
            <Button variant="outline" size="sm" className="rounded-xl border-white/10 bg-white/5 hover:bg-white/10 gap-2 h-10 px-4">
              <Activity className="w-3.5 h-3.5 text-accent" />
              <span className="text-[10px] font-black uppercase tracking-widest">Ver Status</span>
            </Button>
          </Link>

          <div className="flex items-center gap-3 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/10 h-10">
            <div className="grid place-items-center w-6 h-6 rounded-full bg-primary/10 text-primary">
              <Sparkles className="w-3 h-3" />
            </div>
            <div>
              <p className="text-[10px] uppercase font-black text-muted-foreground tracking-widest leading-none">Créditos de IA</p>
              <p className="text-xs font-bold text-primary mt-0.5 leading-none">
                {credits === null ? "..." : `${credits.remaining} gerações`}
                {credits?.remaining === 0 && <span className="text-[9px] ml-1 text-muted-foreground font-medium">(Esgotados)</span>}
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
        <div className="space-y-6">
          {tempOQs.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-1 mb-2">
                <div>
                  <h2 className="text-[11px] uppercase tracking-[0.2em] font-black text-muted-foreground">
                    Aguardando Aprovação ({tempOQs.length})
                  </h2>
                  <p className="text-[10px] text-muted-foreground/60 font-bold uppercase mt-0.5">Revise as questões antes de enviar ao banco</p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={approveAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Aprovar Todos
                  </button>
                  <button 
                    onClick={discardAll}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-background text-destructive text-[10px] font-black uppercase tracking-wider hover:bg-destructive/10 transition-all border border-destructive/20 active:scale-95"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Limpar Fila
                  </button>
                </div>
              </div>
              {tempOQs.map((q) => (
                <div key={q.id} className="paper-card p-4 md:p-5 flex items-center gap-4 animate-fade-up">
                  <div 
                    className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-background grid place-items-center"
                    style={{ boxShadow: "var(--shadow-neu-out-sm)" }}
                  >
                    <FileText className="h-5 w-5 md:h-6 md:w-6 text-accent" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-black uppercase tracking-[0.15em] text-accent/80">
                        {q.modo} • {ESPECIALIDADE_LABEL[q.especialidade as Especialidade]}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-foreground truncate max-w-full">
                      {q.pergunta}
                    </h3>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[11px] text-muted-foreground line-clamp-1">
                        Gabarito: <span className="text-emerald-500 font-bold">{q.resposta}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
                    <button 
                      onClick={() => setEditingOQ(q)}
                      className="p-2 md:p-2.5 rounded-xl bg-background text-muted-foreground hover:text-accent transition-all"
                      style={{ boxShadow: "var(--shadow-neu-out-sm)" }}
                      title="Editar"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => deleteTemp(q.id)}
                      className="p-2 md:p-2.5 rounded-xl bg-background text-muted-foreground hover:text-destructive transition-all"
                      style={{ boxShadow: "var(--shadow-neu-out-sm)" }}
                      title="Descartar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => approveOQ(q)}
                      className="p-2 md:p-2.5 rounded-xl bg-accent text-accent-foreground shadow-lg hover:brightness-110 transition-all ml-1"
                      title="Aprovar"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card className="p-12 border-dashed border-2 flex flex-col items-center text-center space-y-4 bg-muted/5">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                <FileText className="h-8 w-8 text-muted-foreground opacity-50" />
              </div>
              <div>
                <h3 className="font-bold">Nenhum OQ pendente</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Use a IA ou importe um arquivo para começar a gerar questões personalizadas.
                </p>
              </div>
            </Card>
          )}
        </div>

        <aside className="space-y-6 sticky top-24">
          <Tabs defaultValue="ia" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl mb-4">
              <TabsTrigger value="ia" className="rounded-lg text-xs font-bold">Gerar por IA</TabsTrigger>
              <TabsTrigger value="excel" className="rounded-lg text-xs font-bold">Importar Excel</TabsTrigger>
            </TabsList>

            <TabsContent value="ia" className="space-y-6 focus-visible:outline-none">
              <Card className="paper-card p-6 space-y-6">
                <h3 className="font-bold flex items-center gap-2">
                  <Sparkles className="h-4 w-4" /> Inteligência Artificial
                </h3>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especialidade</label>
                    <Select value={specialty} onValueChange={(v) => setSpecialty(v as Especialidade)}>
                      <SelectTrigger className="rounded-xl border-border/60">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {Object.entries(ESPECIALIDADE_LABEL).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                      Nome do baralho (matéria) <span className="text-destructive">*</span>
                    </label>
                    <Input
                      value={baralho}
                      onChange={(e) => setBaralho(e.target.value.slice(0, 80))}
                      placeholder="Ex.: Insuficiência Cardíaca — Aula 12"
                      className="rounded-xl border-border/60"
                      disabled={!canIA}
                    />
                    <p className="text-[10px] text-muted-foreground/70">
                      Organiza as questões em um baralho próprio para estudo.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Cole o texto do resumo <span className="text-destructive">*</span>
                      </label>
                      <span className={cn(
                        "text-[10px] font-bold tabular-nums",
                        pastedText.length > MAX_CHARS ? "text-destructive" : "text-muted-foreground"
                      )}>
                        {pastedText.length.toLocaleString("pt-BR")} / {MAX_CHARS.toLocaleString("pt-BR")}
                      </span>
                    </div>
                    <Textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="Cole aqui o texto do seu resumo, transcrição de aula ou material de estudo. Quanto melhor o conteúdo, melhores as questões."
                      className={cn(
                        "rounded-xl border-border/60 min-h-[220px] font-mono text-xs leading-relaxed",
                        pastedText.length > MAX_CHARS && "border-destructive focus-visible:ring-destructive"
                      )}
                      disabled={!canIA}
                      spellCheck={false}
                    />
                    {pastedText.length > MAX_CHARS && (
                      <p className="text-[11px] text-destructive font-bold flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Texto excedeu {MAX_CHARS.toLocaleString("pt-BR")} caracteres. Reduza para gerar.
                      </p>
                    )}
                  </div>

                  <TactileButton
                    variant="primary"
                    className="w-full"
                    disabled={
                      !canIA ||
                      loading ||
                      !baralho.trim() ||
                      pastedText.trim().length < 200 ||
                      pastedText.length > MAX_CHARS
                    }
                    onClick={handleGenerate}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    {loading ? (status || "Gerando...") : !canIA ? "Disponível no plano Ouro" : "Gerar OQs"}
                  </TactileButton>

                  {loading && (
                    <button 
                      onClick={handleCancel}
                      className="w-full text-xs font-bold text-destructive hover:underline py-1 transition-all"
                    >
                      Cancelar processo
                    </button>
                  )}
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="excel" className="space-y-6 focus-visible:outline-none">
              <Card className="paper-card p-6 space-y-6">
                <div className="space-y-2">
                  <h3 className="font-bold flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Importar Planilha
                  </h3>
                  <p className="text-[10px] text-muted-foreground leading-tight">
                    Importe suas próprias questões diretamente via Excel. Sem IA, total controle.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-4 rounded-2xl bg-accent/5 border border-accent/20 space-y-3">
                      <div className="flex items-center gap-2 text-accent">
                        <Download className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Passo 1: Template Especial</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-relaxed">
                        Baixe nosso template oficial. Ele já vem com <strong>3 exemplos reais</strong> (um para cada modo) para você entender exatamente como preencher.
                      </p>
                      <TactileButton 
                        variant="neutral" 
                        className="w-full h-9 text-xs font-bold"
                        onClick={downloadTemplate}
                      >
                        Baixar Template com Exemplos
                      </TactileButton>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-foreground">
                        <Upload className="h-4 w-4" />
                        <span className="text-xs font-black uppercase tracking-wider">Passo 2: Upload dos Dados</span>
                        {!isAdmin && (
                          <span className="text-[9px] bg-amber-500/10 text-amber-600 px-1.5 py-0.5 rounded-full font-bold ml-auto">
                            Limite: 20 OQs/vez
                          </span>
                        )}
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Especialidade <span className="text-destructive">*</span>
                        </label>
                        <Select value={specialty} onValueChange={(v) => setSpecialty(v as Especialidade)}>
                          <SelectTrigger className="rounded-xl border-border/60 h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {Object.entries(ESPECIALIDADE_LABEL).map(([val, label]) => (
                              <SelectItem key={val} value={val}>{label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">
                          Nome do baralho (matéria) <span className="text-destructive">*</span>
                        </label>
                        <Input
                          value={baralhoExcel}
                          onChange={(e) => setBaralhoExcel(e.target.value.slice(0, 80))}
                          placeholder="Ex.: Cardiologia — Semana 3"
                          className="rounded-xl border-border/60 h-9"
                        />
                      </div>

                      <div 
                        onClick={() => {
                          if (!baralhoExcel.trim()) {
                            toast.error("Informe o nome do baralho antes de subir a planilha.");
                            return;
                          }
                          document.getElementById('excel-upload')?.click();
                        }}
                        className={cn(
                          "h-28 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer transition-all group",
                          !baralhoExcel.trim()
                            ? "border-border/40 opacity-60"
                            : "border-border/60 hover:border-accent/40 hover:bg-accent/5"
                        )}
                      >
                        <input 
                          id="excel-upload"
                          type="file" 
                          className="hidden" 
                          accept=".xlsx,.xls"
                          onChange={handleExcelUpload}
                          disabled={loading}
                        />
                        {loading && status.includes("planilha") ? (
                          <div className="text-center">
                            <Loader2 className="h-8 w-8 text-accent animate-spin mx-auto mb-2" />
                            <p className="text-[10px] font-bold text-accent">Processando...</p>
                          </div>
                        ) : (
                          <>
                            <FileSpreadsheet className="h-8 w-8 text-muted-foreground mb-2 group-hover:text-accent transition-colors" />
                            <p className="text-xs font-bold text-muted-foreground group-hover:text-accent">Clique para subir sua planilha</p>
                            <p className="text-[10px] text-muted-foreground/60 mt-1">Apenas .xlsx ou .xls {!isAdmin && "• Máximo 20 OQs"}</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-muted/30 rounded-2xl border border-border/40 space-y-4">
                    <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-foreground">
                      <HelpCircle className="h-3.5 w-3.5 text-accent" /> Guia de Preenchimento Robusto
                    </h4>
                    
                    <div className="space-y-4 text-[11px] leading-relaxed">
                      <div className="space-y-1.5">
                        <p className="font-bold text-foreground">Colunas (15, nesta ordem)</p>
                        <p className="text-muted-foreground ml-1 text-[10px]">
                          <code>Especialidade | Modo | comando | resposta 1 | variações 1 | resposta 2 | variações 2 | resposta 3 | variações 3 | resposta 4 | variações 4 | resposta 5 | variações 5 | gabarito | explicação</code>
                        </p>
                      </div>

                      <div className="space-y-1.5 border-t border-border/40 pt-3">
                        <p className="font-bold flex items-center gap-1.5 text-foreground">
                          <span className="h-4 w-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px]">1</span>
                          Modo ABCDE
                        </p>
                        <p className="text-muted-foreground ml-5">
                          • <strong>resposta 1..5</strong>: alternativas A, B, C, D, E (todas preenchidas).<br/>
                          • <strong>variações 1..5</strong>: deixe <strong>em branco</strong>.<br/>
                          • <strong>gabarito</strong>: letra (A-E) <em>ou</em> o texto exato de uma das respostas.
                        </p>
                      </div>

                      <div className="space-y-1.5 border-t border-border/40 pt-3">
                        <p className="font-bold flex items-center gap-1.5 text-foreground">
                          <span className="h-4 w-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px]">2</span>
                          Modo Lacuna
                        </p>
                        <p className="text-muted-foreground ml-5">
                          • <strong>comando</strong>: use <code>____</code> (4 underscores) no local da lacuna.<br/>
                          • <strong>resposta 1</strong>: termo principal correto.<br/>
                          • <strong>variações 1</strong>: sinônimos/siglas separados por <code>;</code> (ex.: <code>VPP; ventilacao</code>). Opcional, mas recomendado.<br/>
                          • <strong>resposta 2..5 e variações 2..5</strong>: <strong>em branco</strong>.<br/>
                          • <strong>gabarito</strong>: <strong>em branco</strong>.
                        </p>
                      </div>

                      <div className="space-y-1.5 border-t border-border/40 pt-3">
                        <p className="font-bold flex items-center gap-1.5 text-foreground">
                          <span className="h-4 w-4 rounded-full bg-accent/10 text-accent flex items-center justify-center text-[9px]">3</span>
                          Modo OQ Falta
                        </p>
                        <p className="text-muted-foreground ml-5">
                          • <strong>resposta 1..5</strong>: os 5 itens do conjunto (tríade/critério/lista), <strong>todos preenchidos</strong>.<br/>
                          • <strong>variações 1..5</strong>: sinônimos/siglas de cada item, separados por <code>;</code>.<br/>
                          • <strong>gabarito</strong>: <strong>em branco</strong> — o app sorteia qual item omitir a cada estudo.
                        </p>
                      </div>

                      <div className="bg-emerald-500/5 p-3 rounded-xl border border-emerald-500/10 mt-4">
                        <p className="text-[10px] text-emerald-700 font-bold flex items-center gap-1.5">
                          <CheckCircle2 className="h-3 w-3" /> Inteligência na Aceitação
                        </p>
                        <p className="text-[10px] text-emerald-600/80 mt-1">
                          Nosso sistema usa <strong>Distância de Levenshtein</strong> e normalização (ignora acentos, caixa e espaços extras). Variações ampliam ainda mais a tolerância.
                        </p>
                      </div>

                      <div className="bg-amber-500/5 p-3 rounded-xl border border-amber-500/10">
                        <p className="text-[10px] text-amber-700 font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3" /> Especialidades e símbolos
                        </p>
                        <p className="text-[10px] text-amber-600/80 mt-1">
                          Escreva exatamente: Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia e Obstetrícia ou Medicina Preventiva. <strong>Nunca use</strong> <code>&lt;</code>, <code>&gt;</code>, <code>≥</code>, <code>≤</code> ou LaTeX — escreva por extenso.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 bg-accent/5 rounded-2xl border border-accent/20 space-y-4">
                    <div className="space-y-1">
                      <h4 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-accent">
                        <Sparkles className="h-3.5 w-3.5" /> Se quiser ajuda de outra IA
                      </h4>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        Copie o prompt mestre abaixo e cole no ChatGPT ou Claude junto com seu resumo para gerar a tabela perfeita.
                      </p>
                    </div>

                    <div className="relative group">
                      <pre className="text-[9px] bg-white border border-border/40 p-3 rounded-xl overflow-x-auto whitespace-pre-wrap leading-relaxed text-muted-foreground max-h-40 overflow-y-auto">
{PROMPT_MESTRE}
                      </pre>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(PROMPT_MESTRE);
                          toast.success("Prompt mestre copiado!");
                        }}
                        className="absolute top-2 right-2 p-2 bg-accent text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                        title="Copiar Prompt"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="space-y-3">
            <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                <strong>Atenção:</strong> Em caso de congelamento da conta, as questões geradas e materiais salvos serão excluídos definitivamente após 30 dias.
              </p>
            </div>
          </div>
        </aside>
      </div>
      {/* Modal de Edição */}
      <Dialog open={!!editingOQ} onOpenChange={(open) => !open && setEditingOQ(null)}>
        <DialogContent className="sm:max-w-[600px] rounded-3xl paper-card border-none max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
              <Pencil className="h-5 w-5 text-accent" />
              Editar Questão
            </DialogTitle>
          </DialogHeader>
          
          {editingOQ && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Especialidade</Label>
                  <Select 
                    value={editingOQ.especialidade} 
                    onValueChange={(v) => setEditingOQ({...editingOQ, especialidade: v})}
                  >
                    <SelectTrigger className="rounded-xl bg-background border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.entries(ESPECIALIDADE_LABEL).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Modo</Label>
                  <Select 
                    value={editingOQ.modo} 
                    onValueChange={(v) => setEditingOQ({...editingOQ, modo: v})}
                  >
                    <SelectTrigger className="rounded-xl bg-background border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {Object.entries(MODO_LABEL).map(([val, label]) => (
                        <SelectItem key={val} value={val}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Comando da Questão</Label>
                <Textarea 
                  value={editingOQ.pergunta}
                  onChange={(e) => setEditingOQ({...editingOQ, pergunta: e.target.value})}
                  className="rounded-2xl bg-background border-border/40 min-h-[100px]"
                  placeholder="Para o modo lacuna, use [___]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Resposta Correta</Label>
                  <Input 
                    value={editingOQ.resposta}
                    onChange={(e) => setEditingOQ({...editingOQ, resposta: e.target.value})}
                    className="rounded-xl bg-background border-border/40"
                    placeholder="Seja direto (1-3 palavras)"
                  />
                </div>
                {(editingOQ.modo === 'lacuna' || editingOQ.modo === 'oq_falta') && (
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Variações (Abreviações/Sinônimos)</Label>
                    <Input 
                      value={editingOQ.variacoes || ""}
                      onChange={(e) => setEditingOQ({...editingOQ, variacoes: e.target.value})}
                      className="rounded-xl bg-background border-border/40"
                      placeholder="ex: ICC; insuficiência cardíaca"
                    />
                  </div>
                )}
              </div>

              {editingOQ.modo === 'abcde' && (
                <div className="space-y-3">
                  <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Alternativas (A-E)</Label>
                  <div className="grid grid-cols-1 gap-2">
                    {["A", "B", "C", "D", "E"].map((letter, idx) => (
                      <div key={letter} className="flex gap-2 items-center">
                        <span className="w-6 text-center font-bold text-accent">{letter}</span>
                        <Input
                          value={Array.isArray(editingOQ.opcoes) ? editingOQ.opcoes[idx] || "" : ""}
                          onChange={(e) => {
                            const newOpcoes = Array.isArray(editingOQ.opcoes) ? [...editingOQ.opcoes] : ["", "", "", "", ""];
                            newOpcoes[idx] = e.target.value;
                            setEditingOQ({...editingOQ, opcoes: newOpcoes});
                          }}
                          className="rounded-xl bg-background border-border/40"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Explicação Completa</Label>
                <Textarea 
                  value={editingOQ.explicacao || ""}
                  onChange={(e) => setEditingOQ({...editingOQ, explicacao: e.target.value})}
                  className="rounded-2xl bg-background border-border/40 min-h-[120px]"
                  placeholder="Explique o gabarito e os distratores..."
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0 mt-2">
            <Button 
              variant="ghost" 
              onClick={() => setEditingOQ(null)}
              className="rounded-xl font-bold"
            >
              Cancelar
            </Button>
            <TactileButton 
              variant="primary" 
              onClick={handleSaveEdit}
              disabled={loading}
              className="px-8"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Salvar Alterações
            </TactileButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {isAdmin && (
        <div className="mt-12 pt-8 border-t border-border/40 space-y-4">
          <Link to="/gerar-oqs/aulas" className="block">
            <button className="w-full py-6 px-8 rounded-3xl bg-gradient-to-br from-accent to-primary text-white font-black text-lg uppercase tracking-widest shadow-2xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-3">
              <Sparkles className="h-6 w-6" />
              Gerar OQs a partir de Aulas
              <span className="text-[10px] font-bold opacity-70 ml-2 normal-case tracking-normal">(admin)</span>
            </button>
          </Link>

          <button 
            onClick={() => setShowSimuladoCreator(true)}
            className="w-full py-6 px-8 rounded-3xl bg-gradient-to-br from-slate-800 to-slate-900 text-white font-black text-lg uppercase tracking-widest shadow-2xl hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-3 border border-white/10"
          >
            <FileText className="h-6 w-6 text-accent" />
            Gerar Simulados
            <span className="text-[10px] font-bold opacity-70 ml-2 normal-case tracking-normal">(admin)</span>
          </button>
        </div>
      )}

      {showSimuladoCreator && (
        <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm p-4 md:p-8 flex items-center justify-center overflow-y-auto">
          <div className="w-full max-w-2xl my-auto">
            <AdminGerarSimulado onFinished={() => setShowSimuladoCreator(false)} />
          </div>
        </div>
      )}

      
      {/* Aviso de Retenção */}
      <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3 max-w-4xl mx-auto mt-12">
        <Info className="h-5 w-5 text-blue-600 shrink-0" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Políticas de Retenção de Dados e Materiais</p>
          <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
            Os materiais e OQs gerados por IA ou importados dependem da manutenção da sua conta ativa. A inadimplência por mais de 60 dias acarreta a exclusão definitiva de todo o conteúdo personalizado e estatísticas de desempenho para otimização de custos. Avisos de pré-exclusão são enviados aos 45 dias.
          </p>
        </div>
      </div>
    </div>
  );
}

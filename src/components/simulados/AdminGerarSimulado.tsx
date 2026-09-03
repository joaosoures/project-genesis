import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExcelJS from "exceljs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, FileSpreadsheet, X, Download } from "lucide-react";

export default function AdminGerarSimulado({ onFinished }: { onFinished: () => void }) {
  const { user } = useAuth();
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const downloadModelo = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Modelo de Simulado");

    worksheet.columns = [
      { header: "Especialidade", key: "esp", width: 20 },
      { header: "Comando", key: "comando", width: 50 },
      { header: "Opção A", key: "opA", width: 30 },
      { header: "Opção B", key: "opB", width: 30 },
      { header: "Opção C", key: "opC", width: 30 },
      { header: "Opção D", key: "opD", width: 30 },
      { header: "Opção E", key: "opE", width: 30 },
      { header: "Gabarito (A-E)", key: "gab", width: 15 },
      { header: "Explicação Parte 1", key: "exp1", width: 40 },
      { header: "Explicação Parte 2", key: "exp2", width: 40 },
      { header: "Explicação Parte 3", key: "exp3", width: 40 },
    ];

    // Add 3 example rows
    worksheet.addRow(["Cardiologia", "Qual a principal causa de insuficiência cardíaca?", "Hipertensão", "Tabagismo", "Sedentarismo", "Má alimentação", "Estresse", "A", "A hipertensão é a principal causa...", "Fatores de risco incluem...", "Tratamento precoce é fundamental."]);
    worksheet.addRow(["Pediatria", "Qual a idade recomendada para início da alimentação complementar?", "4 meses", "5 meses", "6 meses", "7 meses", "8 meses", "C", "A OMS recomenda aleitamento exclusivo até os 6 meses.", "A introdução deve ser gradual.", "Consulte um pediatra."]);
    worksheet.addRow(["Ginecologia", "Qual o principal exame de rastreio para câncer de colo de útero?", "Ultrassom", "Papanicolau", "Mamografia", "Tomografia", "Ressonância", "B", "O Papanicolau deve ser realizado periodicamente.", "É um exame simples e eficaz.", "Detecta lesões precursoras."]);

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "modelo_simulado_oqfalta.xlsx";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!nome.trim()) {
      toast.error("Informe o nome do simulado.");
      return;
    }
    if (!file) {
      toast.error("Selecione um arquivo Excel/CSV.");
      return;
    }

    setLoading(true);
    try {
      const buf = await file.arrayBuffer();
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];

      const rows: any[] = [];
      ws.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // Skip header
        const values: any[] = [];
        row.eachCell({ includeEmpty: true }, (cell) => {
          const v = cell.value;
          values.push(v && typeof v === "object" && "text" in v ? (v as any).text : v);
        });
        rows.push(values);
      });

      // Create Simulado
      const { data: sim, error: simErr } = await supabase
        .from("simulados")
        .insert({ nome, criado_por: user?.id })
        .select()
        .single();

      if (simErr) throw simErr;

      // Process questions
      const questions = rows.map((r, idx) => {
        const esp = String(r[0] || "").trim();
        const comando = String(r[1] || "").trim();
        const opA = String(r[2] || "").trim();
        const opB = String(r[3] || "").trim();
        const opC = String(r[4] || "").trim();
        const opD = String(r[5] || "").trim();
        const opE = String(r[6] || "").trim();
        const gab = String(r[7] || "").trim().toUpperCase();
        const exp1 = String(r[8] || "").trim();
        const exp2 = String(r[9] || "").trim();
        const exp3 = String(r[10] || "").trim();

        return {
          simulado_id: sim.id,
          especialidade: esp,
          comando,
          opcao_a: opA || null,
          opcao_b: opB || null,
          opcao_c: opC || null,
          opcao_d: opD || null,
          opcao_e: opE || null,
          gabarito: gab,
          explicacao_1: exp1 || null,
          explicacao_2: exp2 || null,
          explicacao_3: exp3 || null,
          ordem: idx
        };
      }).filter(q => q.comando && q.gabarito);

      const { error: qErr } = await supabase.from("simulado_questoes").insert(questions);
      if (qErr) throw qErr;

      toast.success("Simulado criado com sucesso!");
      onFinished();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao processar simulado: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black tracking-tight">Novo Simulado</h2>
        <Button variant="ghost" size="icon" onClick={onFinished}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <Card className="p-6 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="nome">Nome do Simulado</Label>
          <Input 
            id="nome" 
            placeholder="Ex: Simulado Geral 2024" 
            value={nome}
            onChange={(e) => setNome(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Arquivo Excel/CSV</Label>
          <div 
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-muted hover:border-accent/50'}`}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files[0];
              if (f) setFile(f);
            }}
          >
            <input 
              type="file" 
              id="file-upload" 
              className="hidden" 
              accept=".xlsx,.xls,.csv"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setFile(f);
              }}
            />
            <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-2">
              {file ? (
                <>
                  <FileSpreadsheet className="h-10 w-10 text-emerald-500" />
                  <p className="font-bold text-emerald-700">{file.name}</p>
                  <p className="text-xs text-muted-foreground">Clique para trocar o arquivo</p>
                </>
              ) : (
                <>
                  <Upload className="h-10 w-10 text-muted-foreground" />
                  <p className="font-bold">Arraste ou clique para selecionar</p>
                  <p className="text-xs text-muted-foreground">Suporta .xlsx e .csv</p>
                </>
              )}
            </label>
          </div>
          <div className="flex items-center justify-between mt-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
              Colunas: Especialidade | comando | resposta 1..5 | gabarito | explicação 1..3
            </p>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-7 text-[10px] gap-1 px-2 rounded-lg"
              onClick={downloadModelo}
            >
              <Download className="h-3 w-3" />
              Baixar Modelo
            </Button>
          </div>
        </div>

        <Button 
          className="w-full h-12 rounded-xl font-bold bg-accent text-accent-foreground hover:opacity-90"
          onClick={handleUpload}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : "Criar Simulado"}
        </Button>
      </Card>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileSpreadsheet, Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ESPECIALIDADE_LABEL, type Especialidade } from "@/lib/oq";
import {
  buildPreAulaImportPayload,
  normalizePreAulaText,
  parsePreAulaFile,
  suggestMaterialMatches,
  type InvalidPreAulaRow,
  type MaterialMatchCandidate,
  type PreAulaSpreadsheetRow,
} from "@/lib/pre-aula";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type Step = "upload" | "matching" | "result";
type ImportResult = { inserted: number; duplicates: number; processed: number };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AdminPreAulaImportDialog({ open, onOpenChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>("upload");
  const [specialty, setSpecialty] = useState<Especialidade>("clinica_medica");
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<PreAulaSpreadsheetRow[]>([]);
  const [invalidRows, setInvalidRows] = useState<InvalidPreAulaRow[]>([]);
  const [materials, setMaterials] = useState<MaterialMatchCandidate[]>([]);
  const [matches, setMatches] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  const materiaNames = useMemo(() => [...new Set(rows.map((row) => row.materia))], [rows]);
  const groupedCounts = useMemo(() => rows.reduce<Record<string, number>>((acc, row) => {
    acc[row.materia] = (acc[row.materia] ?? 0) + 1;
    return acc;
  }, {}), [rows]);
  const allMatched = materiaNames.length > 0 && materiaNames.every((name) => matches[name]);

  useEffect(() => {
    if (!open) {
      setStep("upload");
      setFileName("");
      setRows([]);
      setInvalidRows([]);
      setMaterials([]);
      setMatches({});
      setResult(null);
      setLoading(false);
    }
  }, [open]);

  async function processFile(file: File) {
    setLoading(true);
    try {
      const parsed = await parsePreAulaFile(file);
      if (parsed.validRows.length === 0) {
        setInvalidRows(parsed.invalidRows);
        throw new Error("Nenhuma linha válida foi encontrada.");
      }

      const { data, error } = await supabase
        .from("materiais")
        .select("id,nome,especialidade")
        .eq("especialidade", specialty)
        .order("nome");
      if (error) throw error;
      if (!data?.length) throw new Error("Não há resumos cadastrados para esta especialidade.");

      const candidates = data as MaterialMatchCandidate[];
      const automaticMatches: Record<string, string> = {};
      [...new Set(parsed.validRows.map((row) => row.materia))].forEach((materia) => {
        const exact = candidates.find((candidate) => normalizePreAulaText(candidate.nome) === normalizePreAulaText(materia));
        if (exact) automaticMatches[materia] = exact.id;
      });

      setFileName(file.name);
      setRows(parsed.validRows);
      setInvalidRows(parsed.invalidRows);
      setMaterials(candidates);
      setMatches(automaticMatches);
      setStep("matching");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function importQuestions() {
    if (!allMatched) return;
    setLoading(true);
    try {
      const payload = buildPreAulaImportPayload(rows, matches, specialty);
      const { data, error } = await supabase.rpc("admin_import_pre_aula_questoes", { payload });
      if (error) throw error;
      setResult(data as unknown as ImportResult);
      setStep("result");
      toast.success("Importação de questões pré-aula concluída.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar as questões.");
    } finally {
      setLoading(false);
    }
  }

  const progress = step === "upload" ? 33 : step === "matching" ? 66 : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-hidden flex flex-col rounded-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileSpreadsheet className="h-5 w-5 text-accent" />
            Gerar Questões Pré-Aula
          </DialogTitle>
          <DialogDescription>
            Importe questões ABCDE e confirme o vínculo com os resumos antes de publicar.
          </DialogDescription>
          <Progress value={progress} className="h-1.5 mt-3" />
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4 -mr-4">
          {step === "upload" && (
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Especialidade</label>
                <Select value={specialty} onValueChange={(value) => setSpecialty(value as Especialidade)}>
                  <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ESPECIALIDADE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.csv"
                className="hidden"
                onChange={(event) => event.target.files?.[0] && processFile(event.target.files[0])}
              />
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  const file = event.dataTransfer.files[0];
                  if (file) processFile(file);
                }}
                className={`w-full min-h-64 rounded-3xl border-2 border-dashed grid place-items-center p-8 transition ${dragging ? "border-accent bg-accent/10" : "border-border bg-muted/10 hover:bg-muted/20"}`}
              >
                <div className="text-center space-y-3">
                  {loading ? <Loader2 className="h-10 w-10 animate-spin text-accent mx-auto" /> : <Upload className="h-10 w-10 text-accent mx-auto" />}
                  <div>
                    <p className="font-bold">Arraste a planilha ou clique para selecionar</p>
                    <p className="text-sm text-muted-foreground mt-1">Arquivos .xlsx ou .csv</p>
                  </div>
                  <Badge variant="secondary">Materia · Questao · Alt_A–E · Gabarito · Justificativa</Badge>
                </div>
              </button>
            </div>
          )}

          {step === "matching" && (
            <div className="space-y-5 py-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Stat label="Arquivo" value={fileName} />
                <Stat label="Válidas" value={rows.length} />
                <Stat label="Inválidas" value={invalidRows.length} warning={invalidRows.length > 0} />
                <Stat label="Matérias" value={materiaNames.length} />
              </div>

              {invalidRows.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>{invalidRows.length} linha(s) não serão importadas</AlertTitle>
                  <AlertDescription className="mt-2 max-h-24 overflow-y-auto space-y-1">
                    {invalidRows.map((row) => <p key={row.rowNumber}>Linha {row.rowNumber}: {row.errors.join("; ")}</p>)}
                  </AlertDescription>
                </Alert>
              )}

              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Confirme todos os vínculos</AlertTitle>
                <AlertDescription>Correspondências exatas foram selecionadas automaticamente. Nomes divergentes exigem escolha manual.</AlertDescription>
              </Alert>

              <div className="rounded-2xl border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Materia da planilha</TableHead>
                      <TableHead className="w-24">Questões</TableHead>
                      <TableHead>Resumo no app</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {materiaNames.map((materia) => {
                      const suggestions = suggestMaterialMatches(materia, materials).slice(0, 3);
                      const exact = suggestions[0]?.score === 1;
                      return (
                        <TableRow key={materia}>
                          <TableCell className="font-semibold">
                            {materia}
                            <div className="flex flex-wrap gap-1 mt-1">
                              {exact && matches[materia] && <Badge className="bg-emerald-500">Correspondência exata</Badge>}
                              {!exact && suggestions.map((suggestion) => (
                                <Badge key={suggestion.id} variant="outline" className="text-[9px]">
                                  Sugestão: {suggestion.nome} ({Math.round(suggestion.score * 100)}%)
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>{groupedCounts[materia]}</TableCell>
                          <TableCell>
                            <Select value={matches[materia] ?? ""} onValueChange={(value) => setMatches((current) => ({ ...current, [materia]: value }))}>
                              <SelectTrigger className="rounded-xl"><SelectValue placeholder="Selecionar resumo…" /></SelectTrigger>
                              <SelectContent className="max-h-72">
                                {materials.map((material) => <SelectItem key={material.id} value={material.id}>{material.nome}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {step === "result" && result && (
            <div className="py-10 text-center space-y-6">
              <div className="h-20 w-20 rounded-full bg-emerald-500/10 text-emerald-600 grid place-items-center mx-auto">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-2xl font-black">Importação concluída</h3>
                <p className="text-muted-foreground mt-2">As questões já estão disponíveis nos resumos vinculados.</p>
              </div>
              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto">
                <Stat label="Processadas" value={result.processed} />
                <Stat label="Inseridas" value={result.inserted} />
                <Stat label="Duplicadas" value={result.duplicates} warning={result.duplicates > 0} />
              </div>
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="gap-2 pt-4 border-t">
          {step === "upload" && <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>}
          {step === "matching" && (
            <>
              <Button variant="outline" onClick={() => setStep("upload")} disabled={loading}>Voltar</Button>
              <Button onClick={importQuestions} disabled={!allMatched || loading} className="gap-2">
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Importar {rows.length} questões
              </Button>
            </>
          )}
          {step === "result" && <Button onClick={() => onOpenChange(false)}>Concluir</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, warning = false }: { label: string; value: string | number; warning?: boolean }) {
  return (
    <div className={`rounded-2xl border p-3 min-w-0 ${warning ? "border-amber-400/50 bg-amber-500/5" : "bg-muted/10"}`}>
      <p className="text-[9px] uppercase tracking-widest font-black text-muted-foreground">{label}</p>
      <p className="font-black truncate mt-1" title={String(value)}>{value}</p>
    </div>
  );
}

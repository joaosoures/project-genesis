import { useState } from "react";
import { Modo, Especialidade, MODO_LABEL, ESPECIALIDADE_LABEL } from "@/lib/oq";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, X } from "lucide-react";
import TactileButton from "@/components/console/TactileButton";
import { cn } from "@/lib/utils";

interface CreateManuallyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

export default function CreateManuallyDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateManuallyDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [modo, setModo] = useState<Modo>("abcde");
  const [especialidade, setEspecialidade] = useState<Especialidade>(
    "clinica_medica"
  );
  const [comando, setComando] = useState("");
  const [explicacao, setExplicacao] = useState("");

  // ABCDE specific
  const [alternativas, setAlternativas] = useState({
    A: "",
    B: "",
    C: "",
    D: "",
    E: "",
  });
  const [gabaritoLetra, setGabaritoLetra] = useState<"A" | "B" | "C" | "D" | "E" | "">(
    ""
  );

  // Lacuna specific
  const [respostaLacuna, setRespostaLacuna] = useState("");
  const [variacoesLacuna, setVariacoesLacuna] = useState("");

  // OQ Falta specific
  const [itensOQFalta, setItensOQFalta] = useState([
    { info: "", vars: "" },
    { info: "", vars: "" },
    { info: "", vars: "" },
    { info: "", vars: "" },
    { info: "", vars: "" },
  ]);

  function resetForm() {
    setComando("");
    setExplicacao("");
    setAlternativas({ A: "", B: "", C: "", D: "", E: "" });
    setGabaritoLetra("");
    setRespostaLacuna("");
    setVariacoesLacuna("");
    setItensOQFalta([
      { info: "", vars: "" },
      { info: "", vars: "" },
      { info: "", vars: "" },
      { info: "", vars: "" },
      { info: "", vars: "" },
    ]);
  }

  function isFormValid(): boolean {
    if (!comando.trim()) return false;
    if (!explicacao.trim()) return false;

    if (modo === "abcde") {
      const preenchidas = Object.values(alternativas).filter((v) => v.trim());
      if (preenchidas.length < 2) return false;
      if (!gabaritoLetra) return false;
      return true;
    }

    if (modo === "lacuna") {
      if (!respostaLacuna.trim()) return false;
      return true;
    }

    if (modo === "oq_falta") {
      const preenchidos = itensOQFalta.filter((item) => item.info.trim());
      if (preenchidos.length < 2) return false;
      return true;
    }

    return false;
  }

  async function handleCreate() {
    if (!user || !isFormValid()) return;

    setLoading(true);
    try {
      let opcoes = null;
      let resposta = "";
      let variacoes = "";

      if (modo === "abcde") {
        // Validar gabarito
        if (!gabaritoLetra || !alternativas[gabaritoLetra].trim()) {
          toast.error("Gabarito deve corresponder a uma alternativa preenchida");
          setLoading(false);
          return;
        }
        opcoes = [
          alternativas.A || null,
          alternativas.B || null,
          alternativas.C || null,
          alternativas.D || null,
          alternativas.E || null,
        ];
        resposta = gabaritoLetra;
      } else if (modo === "lacuna") {
        resposta = respostaLacuna.trim();
        variacoes = variacoesLacuna.trim();
      } else if (modo === "oq_falta") {
        // Construir opcoes e variacoes para OQ Falta
        const itensPreenchidos = itensOQFalta.map((item, idx) => ({
          idx: idx + 1,
          info: item.info.trim(),
          vars: item.vars.trim(),
        }));

        // Validar que temos pelo menos 2 itens preenchidos
        const itensValidos = itensPreenchidos.filter((i) => i.info);
        if (itensValidos.length < 2) {
          toast.error("OQ Falta precisa de pelo menos 2 itens preenchidos");
          setLoading(false);
          return;
        }

        // Montar opcoes com preenchimento até 5 itens
        opcoes = [];
        for (let i = 0; i < 5; i++) {
          opcoes[i] =
            itensPreenchidos[i]?.info || null;
        }

        // Montar variacoes separadas por ||
        variacoes = itensPreenchidos
          .map((i) => i.vars || "")
          .join("||");

        // Para OQ Falta, resposta é apenas o primeiro item (usado na exibição da fila)
        resposta = itensPreenchidos[0]?.info || "";
      }

      const { error } = await supabase.from("temp_oqs").insert([
        {
          user_id: user.id,
          pergunta: comando.trim(),
          resposta,
          variacoes,
          modo,
          especialidade,
          explicacao: explicacao.trim(),
          opcoes,
          contexto_origem: "Manual",
        },
      ]);

      if (error) throw error;

      toast.success("OQ criado manualmente com sucesso! Revise-o antes de aprovar.");
      resetForm();
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao criar OQ: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleUpdateAlternativa(letra: "A" | "B" | "C" | "D" | "E", valor: string) {
    setAlternativas((prev) => ({ ...prev, [letra]: valor }));
    // Se mudar alternativa selecionada como gabarito, resetar
    if (gabaritoLetra === letra && !valor.trim()) {
      setGabaritoLetra("");
    }
  }

  function handleUpdateOQFaltaItem(idx: number, campo: "info" | "vars", valor: string) {
    setItensOQFalta((prev) => {
      const novo = [...prev];
      novo[idx] = { ...novo[idx], [campo]: valor };
      return novo;
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl rounded-3xl paper-card border-none max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
            <Plus className="h-5 w-5 text-accent" />
            Criar OQ Manualmente
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Especialidade e Modo */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                Especialidade <span className="text-destructive">*</span>
              </Label>
              <Select value={especialidade} onValueChange={(v) => setEspecialidade(v as Especialidade)}>
                <SelectTrigger className="rounded-xl bg-background border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(ESPECIALIDADE_LABEL).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                Modo <span className="text-destructive">*</span>
              </Label>
              <Select value={modo} onValueChange={(v) => setModo(v as Modo)}>
                <SelectTrigger className="rounded-xl bg-background border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {Object.entries(MODO_LABEL).map(([val, label]) => (
                    <SelectItem key={val} value={val}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Comando */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
              Comando da Questão <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={comando}
              onChange={(e) => setComando(e.target.value)}
              className="rounded-2xl bg-background border-border/40 min-h-[120px]"
              placeholder={
                modo === "lacuna"
                  ? "Use ____ (4 underscores) para marcar a lacuna"
                  : "Digite o enunciado da questão..."
              }
            />
          </div>

          {/* ABCDE: Alternativas */}
          {modo === "abcde" && (
            <>
              <div className="space-y-3">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  Alternativas (A-E) <span className="text-destructive">*</span>
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {(["A", "B", "C", "D", "E"] as const).map((letra) => (
                    <div key={letra} className="flex gap-2 items-start">
                      <button
                        type="button"
                        onClick={() =>
                          setGabaritoLetra(gabaritoLetra === letra ? "" : letra)
                        }
                        className={cn(
                          "w-10 h-10 rounded-xl font-bold text-xs shrink-0 transition-all",
                          gabaritoLetra === letra
                            ? "bg-emerald-500 text-white"
                            : "bg-background border border-border/40 text-muted-foreground hover:border-accent/40"
                        )}
                        title="Clique para marcar como gabarito"
                      >
                        {letra}
                      </button>
                      <Input
                        value={alternativas[letra]}
                        onChange={(e) => handleUpdateAlternativa(letra, e.target.value)}
                        className="flex-1 rounded-xl bg-background border-border/40"
                        placeholder={`Alternativa ${letra}`}
                      />
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-muted-foreground/60 italic">
                  Clique na letra para marcar o gabarito correto
                </p>
              </div>
            </>
          )}

          {/* Lacuna: Resposta e Variações */}
          {modo === "lacuna" && (
            <>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  Resposta Correta <span className="text-destructive">*</span>
                </Label>
                <Input
                  value={respostaLacuna}
                  onChange={(e) => setRespostaLacuna(e.target.value)}
                  className="rounded-xl bg-background border-border/40"
                  placeholder="ex: Ventilação mecânica"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  Variações / Sinônimos (Opcional)
                </Label>
                <Input
                  value={variacoesLacuna}
                  onChange={(e) => setVariacoesLacuna(e.target.value)}
                  className="rounded-xl bg-background border-border/40"
                  placeholder="ex: VM; ventilacao mecanica; ventilacao artificial"
                />
                <p className="text-[9px] text-muted-foreground/60 italic">
                  Separe com <code className="bg-muted px-1 rounded">;</code> (ponto-e-vírgula)
                </p>
              </div>
            </>
          )}

          {/* OQ Falta: Itens */}
          {modo === "oq_falta" && (
            <div className="space-y-3">
              <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                Itens do Conjunto (Mín. 2) <span className="text-destructive">*</span>
              </Label>
              <p className="text-[9px] text-muted-foreground/60 italic mb-3">
                Preencha pelo menos 2 itens. O app sorteará qual omitir a cada estudo.
              </p>
              <div className="space-y-3">
                {itensOQFalta.map((item, idx) => (
                  <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-muted/30 border border-border/40">
                    <div className="text-[9px] font-bold text-muted-foreground uppercase">
                      Item {idx + 1}
                    </div>
                    <Input
                      value={item.info}
                      onChange={(e) => handleUpdateOQFaltaItem(idx, "info", e.target.value)}
                      className="rounded-lg bg-background border-border/40 h-9"
                      placeholder="Informação principal"
                    />
                    <Input
                      value={item.vars}
                      onChange={(e) => handleUpdateOQFaltaItem(idx, "vars", e.target.value)}
                      className="rounded-lg bg-background border-border/40 h-9"
                      placeholder="Variações (ex: abrev; sinônimo)"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Explicação */}
          <div className="space-y-2">
            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
              Explicação Completa <span className="text-destructive">*</span>
            </Label>
            <Textarea
              value={explicacao}
              onChange={(e) => setExplicacao(e.target.value)}
              className="rounded-2xl bg-background border-border/40 min-h-[120px]"
              placeholder="Explique o gabarito, discuta os distratores e justifique por que a resposta está correta..."
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="ghost"
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="rounded-xl font-bold"
          >
            Cancelar
          </Button>
          <TactileButton
            variant="primary"
            onClick={handleCreate}
            disabled={loading || !isFormValid()}
            className="px-8"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            Criar OQ
          </TactileButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

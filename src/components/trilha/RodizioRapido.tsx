import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Stethoscope, Shuffle, Check, X, Trash2, Sparkles, Search } from "lucide-react";
import { ESPECIALIDADE_LABEL, normalize } from "@/lib/oq";
import type { TrilhaSettings, RodizioItem, AulaPlano } from "@/hooks/useTrilhaPlano";
import { cn } from "@/lib/utils";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";

interface Props {
  settings: TrilhaSettings;
  onSave: (s: TrilhaSettings) => void;
  aulas?: AulaPlano[];
}

const DURACOES = [
  { v: 1, l: "Só essa semana" },
  { v: 2, l: "2 semanas" },
  { v: 3, l: "3 semanas" },
  { v: 4, l: "1 mês (4 sem)" },
  { v: 6, l: "~1,5 mês (6 sem)" },
  { v: 8, l: "2 meses (8 sem)" },
  { v: 12, l: "3 meses (12 sem)" },
];

const CUSTOM_VALUE = "__custom__";

export default function RodizioRapido({ settings, onSave, aulas = [] }: Props) {
  const atual = settings.rodizio_atual;
  const isCustomAtual = !!(atual?.aulas_ids && atual.aulas_ids.length);
  const [editing, setEditing] = useState(false);
  const [draftPerfil, setDraftPerfil] = useState(settings.perfil);
  const [draftRodizio, setDraftRodizio] = useState<RodizioItem>(
    atual ?? { especialidade: "clinica_medica", semanas: 2 },
  );
  // Para rodízio personalizado
  const [draftCustomNome, setDraftCustomNome] = useState(isCustomAtual ? (atual!.nome ?? "") : "");
  const [draftCustomIds, setDraftCustomIds] = useState<string[]>(isCustomAtual ? (atual!.aulas_ids ?? []) : []);
  const [isCustomDraft, setIsCustomDraft] = useState(isCustomAtual);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const espLabel = atual
    ? (isCustomAtual
        ? (atual.nome ?? "Personalizado")
        : ESPECIALIDADE_LABEL[atual.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? atual.especialidade)
    : null;

  const perfilLabel = {
    medico: "Médico",
    interno_4: "Interno do 4º ano",
    interno_geral: "Interno geral",
  }[settings.perfil];

  const openEditor = () => {
    setDraftPerfil(settings.perfil);
    setDraftRodizio(atual ?? { especialidade: "clinica_medica", semanas: 2 });
    setIsCustomDraft(isCustomAtual);
    setDraftCustomNome(isCustomAtual ? (atual!.nome ?? "") : "");
    setDraftCustomIds(isCustomAtual ? (atual!.aulas_ids ?? []) : []);
    setEditing(true);
  };

  // Aulas que casam com o nome digitado (busca em nome + key_words + especialidade)
  const matchedAulas = useMemo(() => {
    const q = normalize(draftCustomNome);
    if (!q || q.length < 2) return [] as AulaPlano[];
    const tokens = q.split(" ").filter((t) => t.length >= 2);
    return aulas
      .filter((a) => a.total_oqs > 0)
      .filter((a) => {
        const hay = normalize(`${a.nome} ${a.key_words ?? ""} ${a.especialidade}`);
        return tokens.some((t) => hay.includes(t));
      })
      .sort((a, b) => a.tier - b.tier || a.nome.localeCompare(b.nome));
  }, [draftCustomNome, aulas]);

  const toggleCustomId = (id: string) => {
    setDraftCustomIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleSaveClick = () => {
    const mudouPerfil = settings.perfil !== draftPerfil;
    if (mudouPerfil || draftPerfil === "interno_geral") {
      setConfirmOpen(true);
    } else {
      confirmSave();
    }
  };

  const confirmSave = () => {
    const patch: Partial<TrilhaSettings> = { perfil: draftPerfil };
    if (draftPerfil === "interno_geral") {
      if (isCustomDraft) {
        patch.rodizio_atual = {
          especialidade: "custom",
          nome: draftCustomNome.trim() || "Rodízio personalizado",
          aulas_ids: draftCustomIds,
          semanas: draftRodizio.semanas,
        };
      } else {
        patch.rodizio_atual = {
          especialidade: draftRodizio.especialidade,
          semanas: draftRodizio.semanas,
        };
      }
    } else {
      patch.rodizio_atual = null;
      patch.proximos_rodizios = [];
    }
    onSave({ ...settings, ...patch });
    setEditing(false);
    setConfirmOpen(false);
  };

  const removerRodizio = () => {
    onSave({ ...settings, rodizio_atual: null, proximos_rodizios: [] });
    setConfirmRemoveOpen(false);
  };

  const podeSalvar =
    draftPerfil !== "interno_geral" ||
    (!isCustomDraft) ||
    (isCustomDraft && draftCustomNome.trim().length >= 2 && draftCustomIds.length > 0);

  return (
    <div className="paper-card p-4 md:p-5 backdrop-blur-sm border border-border/40">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={cn(
              "h-10 w-10 rounded-2xl grid place-items-center shrink-0",
              settings.perfil === "medico" ? "bg-muted/30 text-muted-foreground" : "bg-[hsl(var(--accent))]/15 text-[hsl(var(--accent))]",
            )}
          >
            <Stethoscope className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
              Perfil e Rotina
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-base md:text-lg font-black tracking-tight truncate">
                {perfilLabel} {settings.perfil === "interno_geral" && atual && `— ${espLabel}`}
              </p>
              {settings.perfil === "interno_geral" && atual && (
                <button
                  type="button"
                  onClick={() => setConfirmRemoveOpen(true)}
                  aria-label="Remover rodízio"
                  className="h-7 w-7 rounded-full grid place-items-center bg-destructive/10 hover:bg-destructive/20 text-destructive transition"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            {settings.perfil === "interno_geral" && atual && (
              <p className="text-[11px] text-muted-foreground">
                Duração: <strong>{atual.semanas}</strong> semana{atual.semanas > 1 ? "s" : ""}
                {isCustomAtual && ` — ${atual.aulas_ids?.length ?? 0} matérias selecionadas`}
              </p>
            )}
            {settings.perfil !== "interno_geral" && (
              <p className="text-[11px] text-muted-foreground">
                Rotina padrão sem direcionamento de rodízios.
              </p>
            )}
          </div>
        </div>

        <LayoutGroup id="rotina-morph-group">
          <AnimatePresence>
            {!editing && (
              <motion.button
                key="rotina-trigger"
                layoutId="rotina-morph"
                onClick={openEditor}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 320, damping: 26 }}
                className="inline-flex items-center gap-1.5 rounded-xl h-9 px-3 text-[10px] font-black uppercase tracking-wider bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white shadow"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Alterar rotina
              </motion.button>
            )}
          </AnimatePresence>

          {createPortal(
            <AnimatePresence>
              {editing && (
                <motion.div
                  key="rotina-overlay"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setEditing(false)}
                  className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-start sm:items-center justify-center p-4 pt-[8vh] sm:pt-4"
                >
                  <motion.div
                    layoutId="rotina-morph"
                    onClick={(e) => e.stopPropagation()}
                    className="bg-white rounded-3xl shadow-2xl ring-1 ring-border/60 w-full max-w-md overflow-hidden"
                  >
                    <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/40">
                      <div className="flex items-center gap-2 min-w-0">
                        <Shuffle className="h-4 w-4 text-[hsl(var(--primary))]" />
                        <p className="text-sm font-black uppercase tracking-wider truncate">
                          Alterar rotina
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="h-8 w-8 rounded-full grid place-items-center hover:bg-muted/60 text-muted-foreground"
                        aria-label="Fechar"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
                      <div>
                        <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                          Seu Perfil Atual
                        </Label>
                        <Select
                          value={draftPerfil}
                          onValueChange={(v: any) => setDraftPerfil(v)}
                        >
                          <SelectTrigger className="mt-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="medico">Médico</SelectItem>
                            <SelectItem value="interno_4">Interno do 4º ano</SelectItem>
                            <SelectItem value="interno_geral">Interno geral</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {draftPerfil === "interno_geral" && (
                        <>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                Especialidade do Rodízio
                              </Label>
                              <Select
                                value={isCustomDraft ? CUSTOM_VALUE : draftRodizio.especialidade}
                                onValueChange={(v) => {
                                  if (v === CUSTOM_VALUE) {
                                    setIsCustomDraft(true);
                                  } else {
                                    setIsCustomDraft(false);
                                    setDraftRodizio({ ...draftRodizio, especialidade: v });
                                  }
                                }}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.entries(ESPECIALIDADE_LABEL).map(([k, v]) => (
                                    <SelectItem key={k} value={k}>
                                      {v}
                                    </SelectItem>
                                  ))}
                                  <SelectItem value={CUSTOM_VALUE}>
                                    ✨ Novo rodízio (personalizado)
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                Duração Restante
                              </Label>
                              <Select
                                value={String(draftRodizio.semanas)}
                                onValueChange={(v) => setDraftRodizio({ ...draftRodizio, semanas: Number(v) })}
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {DURACOES.map((d) => (
                                    <SelectItem key={d.v} value={String(d.v)}>
                                      {d.l}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {isCustomDraft && (
                            <div className="space-y-3 rounded-2xl border border-[hsl(var(--primary))]/20 bg-[hsl(var(--primary))]/5 p-3">
                              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-black text-[hsl(var(--primary))]">
                                <Sparkles className="h-3 w-3" />
                                Rodízio Personalizado
                              </div>
                              <div>
                                <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                                  Nome do Rodízio
                                </Label>
                                <Input
                                  value={draftCustomNome}
                                  onChange={(e) => setDraftCustomNome(e.target.value)}
                                  placeholder="Ex: Urgência, UTI, Cardiologia…"
                                  className="mt-1 h-9 text-sm"
                                />
                                <p className="text-[10px] text-muted-foreground mt-1">
                                  O nome também é a <strong>palavra-chave</strong> para encontrar matérias relacionadas.
                                </p>
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-1.5">
                                  <Label className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground flex items-center gap-1">
                                    <Search className="h-3 w-3" />
                                    Matérias encontradas
                                  </Label>
                                  <span className="text-[10px] font-black text-[hsl(var(--primary))]">
                                    {draftCustomIds.length} selecionadas
                                  </span>
                                </div>
                                <div className="max-h-56 overflow-y-auto rounded-xl bg-white border border-border/40 divide-y divide-border/30">
                                  {matchedAulas.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground px-3 py-4 text-center">
                                      {draftCustomNome.trim().length < 2
                                        ? "Digite o nome do rodízio para buscar matérias."
                                        : "Nenhuma matéria encontrada com essa palavra-chave."}
                                    </p>
                                  )}
                                  {matchedAulas.map((a) => {
                                    const checked = draftCustomIds.includes(a.id);
                                    return (
                                      <label
                                        key={a.id}
                                        className={cn(
                                          "flex items-start gap-2 px-3 py-2 cursor-pointer hover:bg-muted/40 transition",
                                          checked && "bg-[hsl(var(--primary))]/5",
                                        )}
                                      >
                                        <Checkbox
                                          checked={checked}
                                          onCheckedChange={() => toggleCustomId(a.id)}
                                          className="mt-0.5"
                                        />
                                        <div className="min-w-0 flex-1">
                                          <p className="text-[12px] font-bold leading-tight truncate">{a.nome}</p>
                                          <p className="text-[10px] text-muted-foreground truncate">
                                            {ESPECIALIDADE_LABEL[a.especialidade as keyof typeof ESPECIALIDADE_LABEL] ?? a.especialidade}
                                            {" · "}T{a.tier} · {a.total_oqs} OQs
                                          </p>
                                        </div>
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      <div className="flex gap-2 justify-end pt-2 border-t border-border/40">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(false)}
                          className="rounded-xl h-9 text-[10px] font-black uppercase tracking-wider gap-1"
                        >
                          <X className="h-3.5 w-3.5" /> Cancelar
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleSaveClick}
                          disabled={!podeSalvar}
                          className="rounded-xl h-9 text-[10px] font-black uppercase tracking-wider gap-1 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary))]/90 text-white"
                        >
                          <Check className="h-3.5 w-3.5" /> Salvar
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>,
            document.body,
          )}

        </LayoutGroup>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar troca de rodízio?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  Trocar o rodízio <strong>recalcula a distribuição</strong> das matérias nas próximas semanas para priorizar a nova seleção.
                </p>
                <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                  ✓ Seu <strong>histórico de estudos</strong>, matérias já concluídas e pendências <strong>são preservados</strong>. Apenas a ordem das próximas semanas é reorganizada.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSave}>Sim, aplicar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover rodízio atual?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm">
                <p>
                  O foco sincronizado em <strong>{espLabel}</strong> será desativado e as próximas semanas voltarão à distribuição padrão.
                </p>
                <p className="text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                  ✓ Seu histórico e matérias já feitas são <strong>preservados</strong>.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={removerRodizio}>Sim, remover</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

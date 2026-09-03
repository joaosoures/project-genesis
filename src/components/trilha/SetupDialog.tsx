import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Plus, Trash2, ShieldCheck, CalendarClock, Target, AlertTriangle, Sparkles, Check, Timer, Clock } from "lucide-react";
import type { TrilhaSettings, RodizioItem, AulaPlano, FocoIncidencia } from "@/hooks/useTrilhaPlano";
import { maxTierFor } from "@/hooks/useTrilhaPlano";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import { cn } from "@/lib/utils";

const DIAS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];
const MAX_MAT_SEMANA = 6;

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: TrilhaSettings;
  onSave: (s: TrilhaSettings) => void;
  aulas?: AulaPlano[];
}

const FOCO_OPCOES: { value: FocoIncidencia; label: string; desc: string; tone: string }[] = [
  { value: "todas", label: "Cobertura total", desc: "Todas as 182 matérias (Alta + Média + Baixa)", tone: "from-primary/15 to-primary/5 border-primary/40" },
  { value: "alta_media", label: "Estratégico", desc: "Foco em Alta + Média incidência", tone: "from-amber-500/15 to-amber-500/5 border-amber-500/40" },
  { value: "alta", label: "Essencial", desc: "Apenas Alta incidência", tone: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/40" },
];

function todayIsoStr() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function detectarMudancasDestrutivas(antes: TrilhaSettings, depois: TrilhaSettings): string[] {
  const mudancas: string[] = [];
  if (!antes.setup_done) return mudancas; // primeira configuração — sem alertas
  if (antes.prova_data !== depois.prova_data) mudancas.push("Data da prova");
  if ((antes.data_inicio_plano ?? null) !== (depois.data_inicio_plano ?? null)) mudancas.push("Data de início dos estudos");
  if (antes.perfil !== depois.perfil) mudancas.push("Perfil de rotina");
  if ((antes.foco_incidencia ?? "todas") !== (depois.foco_incidencia ?? "todas")) mudancas.push("Estratégia de preparação");
  const r1 = antes.rodizio_atual, r2 = depois.rodizio_atual;
  if ((r1?.especialidade ?? null) !== (r2?.especialidade ?? null)) mudancas.push("Rodízio atual");
  if ((r1?.semanas ?? null) !== (r2?.semanas ?? null)) mudancas.push("Duração do rodízio");
  if (JSON.stringify(antes.disponibilidade) !== JSON.stringify(depois.disponibilidade)) {
    mudancas.push("Disponibilidade semanal");
  }
  return mudancas;
}

export default function SetupDialog({ open, onOpenChange, initial, onSave, aulas = [] }: Props) {
  const [s, setS] = useState<TrilhaSettings>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mudancas, setMudancas] = useState<string[]>([]);
  useEffect(() => {
    // Na primeira configuração, pré-preenche data de início com hoje (editável)
    if (!initial.setup_done && !initial.data_inicio_plano) {
      setS({ ...initial, data_inicio_plano: todayIsoStr() });
    } else {
      setS(initial);
    }
  }, [initial, open]);



  // ===== Cálculos de cronograma e recomendações =====
  const aulasValidas = useMemo(() => aulas.filter((a) => a.total_oqs > 0), [aulas]);
  const countByTier = useMemo(() => {
    const c = { 1: 0, 2: 0, 3: 0 };
    for (const a of aulasValidas) {
      if (a.tier === 1) c[1]++;
      else if (a.tier === 2) c[2]++;
      else if (a.tier === 3) c[3]++;
    }
    return c;
  }, [aulasValidas]);
  const totalPorFoco = (f: FocoIncidencia) => {
    if (f === "alta") return countByTier[1];
    if (f === "alta_media") return countByTier[1] + countByTier[2];
    return countByTier[1] + countByTier[2] + countByTier[3];
  };

  const semanasAteProva = useMemo(() => {
    if (!s.prova_data) return null;
    const inicio = s.data_inicio_plano ? new Date(s.data_inicio_plano + "T00:00:00") : new Date();
    inicio.setHours(0, 0, 0, 0);
    const prova = new Date(s.prova_data + "T00:00:00");
    const diff = prova.getTime() - inicio.getTime();
    return Math.max(1, Math.round(diff / (7 * 86400000)));
  }, [s.prova_data, s.data_inicio_plano]);

  const focoAtual: FocoIncidencia = s.foco_incidencia ?? "todas";
  const totalAtual = totalPorFoco(focoAtual);
  
  // CORREÇÃO: Usar semanas restantes reais a partir de hoje para a configuração
  const semanasRestantesConfig = useMemo(() => {
    if (!s.prova_data) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const prova = new Date(s.prova_data + "T00:00:00");
    const diff = prova.getTime() - hoje.getTime();
    return Math.max(1, Math.round(diff / (7 * 86400000)));
  }, [s.prova_data]);

  const matsPorSemana = semanasRestantesConfig ? Math.ceil(totalAtual / semanasRestantesConfig) : null;
  const excede = matsPorSemana !== null && matsPorSemana > MAX_MAT_SEMANA;

  const diasSelecionados = s.disponibilidade.dias.filter(Boolean).length;
  const horasSemanais = s.disponibilidade.dias.reduce((acc, active, i) => 
    acc + (active ? (s.disponibilidade.horas_por_dia?.[i] ?? s.disponibilidade.horas) : 0), 0
  );

  // Média de tempo por matéria: 1.8h a 2h
  const HORAS_POR_MATERIA = 1.8;
  const capacidadeAtual = Math.floor(horasSemanais / HORAS_POR_MATERIA);
  const deficitMaterias = matsPorSemana !== null ? Math.max(0, matsPorSemana - capacidadeAtual) : 0;

  const diasRecomendados = matsPorSemana ? Math.min(7, Math.max(3, Math.ceil(matsPorSemana * 1.3))) : null;

  // Sugestão automática de foco menos intenso que caiba
  const focoSugerido: FocoIncidencia | null = useMemo(() => {
    if (!semanasAteProva || !excede) return null;
    const candidatos: FocoIncidencia[] = ["alta_media", "alta"];
    for (const c of candidatos) {
      if (Math.ceil(totalPorFoco(c) / semanasAteProva) <= MAX_MAT_SEMANA) return c;
    }
    return "alta";
  }, [semanasAteProva, excede, countByTier]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto minimal-scroll rounded-l-3xl [data-reduce-motion='1']_&:backdrop-filter-none [data-reduce-motion='1']_&:bg-white">
        <SheetHeader>
          <SheetTitle>Configuração do plano</SheetTitle>
          <SheetDescription>Ajuste sua trilha de estudos para a prova.</SheetDescription>
        </SheetHeader>


        <div className="space-y-5 py-2">
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="min-w-0">
                <Label>Data de início dos estudos</Label>
                <Input
                  type="date"
                  className="w-full"
                  value={s.data_inicio_plano ?? ""}
                  max={s.prova_data ?? undefined}
                  onChange={(e) => setS({ ...s, data_inicio_plano: e.target.value || null })}
                />
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug">
                  Define o marco zero da sua trilha. Alterá-la depois redistribui as matérias futuras.
                </p>
              </div>
              <div className="min-w-0">
                <Label>Data da prova</Label>
                <Input
                  type="date"
                  className="w-full"
                  value={s.prova_data ?? ""}
                  onChange={(e) => setS({ ...s, prova_data: e.target.value || null })}
                />
              </div>
            </div>

            <div>
              <Label>Prova alvo</Label>
              <Input
                placeholder="Ex: ENARE, PSU-MG"
                value={s.prova_nome}
                onChange={(e) => setS({ ...s, prova_nome: e.target.value })}
              />
            </div>
          </div>


          {/* ===== Semanas até a prova ===== */}
          {semanasAteProva !== null && (
            <div className="flex items-center gap-3 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-primary/0 px-4 py-3">
              <CalendarClock className="h-5 w-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] font-bold text-muted-foreground">
                  Tempo até a prova
                </div>
                <div className="text-lg font-black tabular-nums leading-tight">
                  {semanasAteProva} {semanasAteProva === 1 ? "semana" : "semanas"}
                  <span className="text-xs font-medium text-muted-foreground ml-2">para se preparar</span>
                </div>
              </div>
            </div>
          )}

          {/* ===== Estratégia de preparação ===== */}
          {aulasValidas.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <Label className="text-sm font-bold">Estratégia de preparação</Label>
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                Escolha a profundidade da sua cobertura. Quanto menos tempo, mais focado deve ser.
              </p>
              <div className="grid gap-2">
                {FOCO_OPCOES.map((op) => {
                  const total = totalPorFoco(op.value);
                  const matsWk = semanasRestantesConfig ? Math.ceil(total / semanasRestantesConfig) : null;
                  const active = focoAtual === op.value;
                  const sugerido = focoSugerido === op.value;
                  return (
                    <button
                      key={op.value}
                      type="button"
                      onClick={() => setS({ ...s, foco_incidencia: op.value })}
                      className={cn(
                        "relative text-left rounded-2xl border bg-gradient-to-br p-3 transition-all",
                        active ? op.tone + " ring-2 ring-primary/40 shadow-sm" : "border-border/60 from-card to-card hover:border-primary/30",
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "h-5 w-5 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center",
                          active ? "border-primary bg-primary" : "border-muted-foreground/40"
                        )}>
                          {active && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm">{op.label}</span>
                            {sugerido && !active && (
                              <span className="text-[9px] font-bold uppercase tracking-wider bg-emerald-500/15 text-emerald-700 px-1.5 py-0.5 rounded">
                                <Sparkles className="h-2.5 w-2.5 inline mr-0.5" />Sugerido
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{op.desc}</div>
                          <div className="flex items-center gap-3 mt-1.5 text-[11px] font-semibold">
                            <span className="tabular-nums">{total} matérias</span>
                            {matsWk !== null && (
                              <span className={cn(
                                "tabular-nums px-1.5 py-0.5 rounded",
                                matsWk > MAX_MAT_SEMANA ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"
                              )}>
                                ~{matsWk}/semana
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {semanasAteProva !== null && matsPorSemana !== null && (
                excede ? (
                  <div className="rounded-2xl border border-destructive/40 bg-destructive/5 p-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-destructive">Tempo curto para essa estratégia</p>
                        <p className="text-foreground/80">
                          Seriam <strong>{matsPorSemana} matérias por semana</strong> — acima do recomendado ({MAX_MAT_SEMANA}/semana).
                          {focoSugerido && (
                            <> Considere mudar para <strong>{FOCO_OPCOES.find(f => f.value === focoSugerido)?.label}</strong> para um ritmo sustentável.</>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <div className="flex items-start gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div className="text-xs space-y-0.5">
                        <p className="font-bold text-emerald-700">Ritmo recomendado</p>
                        <p className="text-foreground/80">
                          <strong>{matsPorSemana} {matsPorSemana === 1 ? "matéria" : "matérias"} por semana</strong>
                          {diasRecomendados && <> em <strong>{diasRecomendados} {diasRecomendados === 1 ? "dia" : "dias"}</strong> de estudo</>}
                          {" "}para cobrir tudo até a prova.
                        </p>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
          )}





          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-bold">Disponibilidade e Horas por dia</Label>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                Total: {horasSemanais}h/semana
              </span>
            </div>

            {/* Recomendações do Especialista */}
            {matsPorSemana !== null && (
              <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
                <div className="flex items-center gap-2 text-primary">
                  <Timer className="h-4 w-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Gestor de Estudos</span>
                </div>
                
                <div className="text-xs space-y-2 text-foreground/80 leading-relaxed">
                  {/* Alerta de Capacidade vs Necessidade */}
                  {deficitMaterias > 0 && (
                    <p className="flex items-start gap-2 text-amber-600 font-medium">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        Sua carga de <strong>{horasSemanais}h/semana</strong> comporta apenas <strong>{capacidadeAtual} matérias</strong>. 
                        Para cobrir tudo, você precisa estudar <strong>{matsPorSemana} matérias/semana</strong>. 
                        Aumente a carga horária em <strong>{(deficitMaterias * HORAS_POR_MATERIA).toFixed(1)}h</strong>
                        {diasSelecionados < 7 ? " ou selecione mais dias de estudo." : " (distribuindo mais horas nos seus dias atuais)."}
                      </span>
                    </p>
                  )}

                  {/* Alerta de Dias de Estudo */}
                  {matsPorSemana !== null && matsPorSemana > diasSelecionados && deficitMaterias === 0 ? (
                    <p className="flex items-start gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <span>
                        Você tem <strong>{matsPorSemana} matérias/semana</strong> para <strong>{diasSelecionados} dias</strong>. 
                        {diasSelecionados < 7 
                          ? "Recomendo aumentar os dias ou as horas para diluir a carga e evitar sobrecarga diária."
                          : "Como você já estuda todos os dias, certifique-se de que a carga horária diária é suficiente para múltiplas matérias."
                        }
                      </span>
                    </p>
                  ) : diasSelecionados === 7 ? (
                    <p className="flex items-start gap-2">
                      <CalendarClock className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span>
                        Estudar 7 dias por semana é exaustivo. Recomendo deixar <strong>1 dia OFF</strong> para descanso e recuperação mental, concentrando as horas nos outros 6 dias.
                      </span>
                    </p>
                  ) : deficitMaterias === 0 && (
                    <p className="flex items-start gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                      <span>
                        Sua disponibilidade de <strong>{diasSelecionados} dias</strong> e <strong>{horasSemanais}h</strong> está excelente para o ritmo de <strong>{matsPorSemana} matérias/semana</strong>.
                      </span>
                    </p>
                  )}

                  {/* Alerta de Saúde/Retenção */}
                  {horasSemanais / Math.max(1, diasSelecionados) > 8 && (
                    <p className="flex items-start gap-2 text-destructive/90 italic">
                      <Clock className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>
                        Atenção: Média de { (horasSemanais / diasSelecionados).toFixed(1) }h/dia. Estudar mais de 8h pode ser contraproducente para a memória de longo prazo e saúde mental.
                      </span>
                    </p>
                  )}
                </div>
              </div>
            )}

            <div className="grid gap-3">
              {DIAS.map((d, i) => {
                const isActive = s.disponibilidade.dias[i];
                const horas = s.disponibilidade.horas_por_dia?.[i] ?? s.disponibilidade.horas;
                
                return (
                  <div key={d} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${
                    isActive ? "bg-primary/5 border-primary/20" : "bg-muted/30 border-transparent opacity-60"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            const novoDias = [...s.disponibilidade.dias];
                            novoDias[i] = !novoDias[i];
                            setS({ ...s, disponibilidade: { ...s.disponibilidade, dias: novoDias } });
                          }}
                          className={`w-10 h-6 rounded-full transition-colors relative ${
                            isActive ? "bg-primary" : "bg-muted-foreground/30"
                          }`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
                            isActive ? "left-5" : "left-1"
                          }`} />
                        </button>
                        <span className={`font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                          {d}
                        </span>
                      </div>
                      {isActive && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                          {horas}h
                        </span>
                      )}
                    </div>
                    
                    {isActive && (
                      <Slider
                        value={[horas]} min={0.5} max={12} step={0.5}
                        onValueChange={([v]) => {
                          const novasHoras = [...(s.disponibilidade.horas_por_dia ?? [2,2,2,2,2,2,2])];
                          novasHoras[i] = v;
                          setS({ ...s, disponibilidade: { ...s.disponibilidade, horas_por_dia: novasHoras, horas: v } });
                        }}
                        className="py-2"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            onClick={() => {
              const m = detectarMudancasDestrutivas(initial, s);
              if (m.length > 0) {
                setMudancas(m);
                setConfirmOpen(true);
              } else {
                onSave({ ...s, setup_done: true });
                onOpenChange(false);
              }
            }}
          >Salvar plano</Button>
        </SheetFooter>

        <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar alterações no plano?</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm">
                  <p>Você alterou itens que <strong>recalculam a distribuição</strong> das matérias nas próximas semanas:</p>
                  <ul className="list-disc pl-5 space-y-0.5 text-foreground">
                    {mudancas.map((m) => <li key={m}><strong>{m}</strong></li>)}
                  </ul>
                  {mudancas.includes("Data de início dos estudos") ? (
                    <div className="flex gap-2 items-start text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Ao mudar a <strong>data de início</strong>, as matérias marcadas como concluídas <strong>antes da nova data serão perdidas</strong> e haverá uma <strong>nova redistribuição</strong> dos temas a partir dessa data. Seu histórico de OQs respondidos é mantido.
                      </span>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-start text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs">
                      <ShieldCheck className="h-4 w-4 shrink-0 mt-0.5" />
                      <span>
                        Seu <strong>histórico de estudos</strong>, matérias <strong>concluídas</strong>, pendências e ajustes manuais <strong>continuam preservados</strong>. Apenas a ordem futura das matérias será reorganizada.
                      </span>
                    </div>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Revisar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  onSave({ ...s, setup_done: true });
                  setConfirmOpen(false);
                  onOpenChange(false);
                }}
              >Sim, aplicar mudanças</AlertDialogAction>
            </AlertDialogFooter>

          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

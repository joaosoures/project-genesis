import { useEffect, useMemo, useState, memo } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, User, Search, Filter, Layers, EyeOff, Trash2, Pencil, X, ChevronDown, ChevronRight, Play, FolderOpen } from "lucide-react";
import { toast } from "sonner";
import { ESPECIALIDADE_LABEL, MODO_LABEL, type Especialidade, type Modo } from "@/lib/oq";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type FilterType = "todos" | "verificados" | "aluno";

const OQCardItem = memo(({ 
  c, 
  user, 
  isAdmin, 
  exculoes, 
  toggleExclusion, 
  deleteCard, 
  setEditingCard, 
  setIsEditDialogOpen 
}: { 
  c: any; 
  user: any; 
  isAdmin: boolean; 
  exculoes: Set<string>; 
  toggleExclusion: (id: string) => void; 
  deleteCard: (id: string) => void; 
  setEditingCard: (c: any) => void; 
  setIsEditDialogOpen: (v: boolean) => void; 
}) => {
  const isExcluded = exculoes.has(c.id);
  const isOwner = c.criado_por_usuario_id === user?.id;
  
  return (
    <Card className={cn(
      "paper-card p-5 group hover:border-accent/30 transition-all mb-3",
      isExcluded && "opacity-60 grayscale-[0.5]"
    )}>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {MODO_LABEL[c.modo as keyof typeof MODO_LABEL]}
          </span>
          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
            {ESPECIALIDADE_LABEL[c.especialidade as keyof typeof ESPECIALIDADE_LABEL]}
          </span>
          {isExcluded && (
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              Oculto da Revisão
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {c.verificado ? (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 shadow-sm">
              <CheckCircle2 className="h-3 w-3" />
              BEEmed Education
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200 shadow-sm">
              <User className="h-3 w-3" />
              Feito por mim
            </div>
          )}
          <div className={cn(
            "flex items-center gap-1 transition-opacity",
            isAdmin ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}>
            {(isAdmin || (!c.verificado && isOwner)) && (
              <button
                onClick={() => { setEditingCard({ ...c }); setIsEditDialogOpen(true); }}
                className="p-1.5 rounded-lg bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                title="Editar OQ"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={() => toggleExclusion(c.id)}
              className={cn(
                "p-1.5 rounded-lg transition-colors",
                isExcluded ? "bg-success/10 text-success hover:bg-success/20" : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
              title={isExcluded ? "Reativar card" : "Não quero estudar esse card"}
            >
              <EyeOff className="h-3.5 w-3.5" />
            </button>
            {(isAdmin || (!c.verificado && isOwner)) && (
              <button
                onClick={() => deleteCard(c.id)}
                className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                title="Excluir permanentemente"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
      <p className="font-medium text-[hsl(var(--foreground))] leading-relaxed">{c.comando}</p>
      {isExcluded && (
        <p className="text-[10px] text-muted-foreground mt-2 italic">Este card não aparecerá nas suas sessões de estudo.</p>
      )}
    </Card>
  );
});

export default function BancoCards() {
  const [cards, setCards] = useState<any[]>([]);
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<FilterType>("todos");
  const [especialidadeFiltro, setEspecialidadeFiltro] = useState<Especialidade | "todas">("todas");
  const [exclusoes, setExclusoes] = useState<Set<string>>(new Set());
  const [editingCard, setEditingCard] = useState<any | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [studiedIds, setStudiedIds] = useState<Set<string>>(new Set());
  const [expandedBaralhos, setExpandedBaralhos] = useState<Set<string>>(new Set());
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    document.title = "Banco de OQs — OQ Falta?";
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;
    
    // Carregar cards
    const { data: cardsData } = await supabase.from("cards").select("*").order("criado_em", { ascending: false }).limit(500);
    setCards(cardsData || []);

    // Carregar exclusões do usuário
    const { data: exclData } = await supabase.from("user_excluded_cards").select("card_id").eq("user_id", user.id);
    setExclusoes(new Set(exclData?.map(e => e.card_id) || []));

    // Carregar cards já estudados (para contagem "feitos x/y")
    const { data: desemp } = await supabase.from("desempenho_cards").select("card_id").eq("usuario_id", user.id);
    setStudiedIds(new Set((desemp || []).map((d: any) => d.card_id)));
  }

  function toggleBaralho(name: string) {
    setExpandedBaralhos(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }


  async function toggleExclusion(cardId: string) {
    if (!user) return;
    const isExcluded = exclusoes.has(cardId);
    
    if (isExcluded) {
      const { error } = await supabase.from("user_excluded_cards").delete().eq("user_id", user.id).eq("card_id", cardId);
      if (!error) {
        setExclusoes(prev => {
          const next = new Set(prev);
          next.delete(cardId);
          return next;
        });
        toast.success("Card reativado para revisão");
      }
    } else {
      const { error } = await supabase.from("user_excluded_cards").insert({ user_id: user.id, card_id: cardId });
      if (!error) {
        setExclusoes(prev => new Set(prev).add(cardId));
        toast.success("Card ocultado da sua revisão");
      }
    }
  }

  async function deleteCard(cardId: string) {
    if (!window.confirm("Tem certeza que deseja excluir permanentemente este card?")) return;
    
    const { error } = await supabase.from("cards").delete().eq("id", cardId);
    if (!error) {
      setCards(prev => prev.filter(c => c.id !== cardId));
      toast.success("Card excluído com sucesso");
    } else {
      toast.error("Erro ao excluir card");
    }
  }

  async function handleUpdateCard(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCard) return;

    try {
      const { error } = await supabase
        .from("cards")
        .update({
          comando: editingCard.comando,
          info_1: editingCard.info_1,
          var_1: editingCard.var_1,
          info_2: editingCard.info_2,
          var_2: editingCard.var_2,
          info_3: editingCard.info_3,
          var_3: editingCard.var_3,
          info_4: editingCard.info_4,
          var_4: editingCard.var_4,
          info_5: editingCard.info_5,
          var_5: editingCard.var_5,
          alternativa_correta: editingCard.alternativa_correta,
          alternativa_a: editingCard.alternativa_a,
          alternativa_b: editingCard.alternativa_b,
          alternativa_c: editingCard.alternativa_c,
          alternativa_d: editingCard.alternativa_d,
          alternativa_e: editingCard.alternativa_e,
          explicacao: editingCard.explicacao,
          especialidade: editingCard.especialidade,
          verificado: editingCard.verificado
        })
        .eq("id", editingCard.id);

      if (error) throw error;

      setCards(prev => prev.map(c => c.id === editingCard.id ? { ...c, ...editingCard } : c));
      setIsEditDialogOpen(false);
      setEditingCard(null);
      toast.success("OQ atualizado com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao atualizar OQ: " + err.message);
    }
  }

  const filtrados = cards.filter((c) => {
    const matchesBusca = busca.trim() === "" || c.comando.toLowerCase().includes(busca.toLowerCase());
    const matchesFiltro = 
      filtro === "todos" || 
      (filtro === "verificados" && c.verificado) || 
      (filtro === "aluno" && !c.verificado);
    
    const matchesEspecialidade = 
      especialidadeFiltro === "todas" || 
      c.especialidade === especialidadeFiltro;
    
    return matchesBusca && matchesFiltro && matchesEspecialidade;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tighter">Banco de OQs</h1>
          <p className="text-muted-foreground text-sm">Explore e gerencie seu acervo de questões.</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-accent transition-colors" />
            <Input 
              value={busca} 
              onChange={(e) => setBusca(e.target.value)} 
              placeholder="Buscar por termo..." 
              maxLength={200} 
              className="pl-9 w-full sm:w-[300px] rounded-xl border-border/60 focus:border-accent/50 transition-all" 
            />
          </div>
        </div>
      </header>

      <div className="flex flex-col gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 ml-1">Especialidade</p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setEspecialidadeFiltro("todas")}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
              especialidadeFiltro === "todas"
                ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                : "bg-card/40 border-border/40 text-muted-foreground hover:border-border/80"
            )}
          >
            Todas as Especialidades
          </button>
          {(Object.keys(ESPECIALIDADE_LABEL) as Especialidade[]).map((esp) => (
            <button
              key={esp}
              onClick={() => setEspecialidadeFiltro(esp)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all border-2",
                especialidadeFiltro === esp
                  ? "bg-accent text-white border-accent shadow-lg shadow-accent/20"
                  : "bg-card/40 border-border/40 text-muted-foreground hover:border-border/80"
              )}
            >
              {ESPECIALIDADE_LABEL[esp]}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros Estruturados */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { id: "todos", label: "Todos os OQs", desc: "Acervo completo", icon: Layers, color: "accent" },
          { id: "verificados", label: "BEEmed Education", desc: "Conteúdo oficial", icon: CheckCircle2, color: "success" },
          { id: "aluno", label: "Feito por mim", desc: "Gerações do aluno", icon: User, color: "primary" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setFiltro(item.id as FilterType)}
            className={`
              relative flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left group
              ${filtro === item.id 
                ? `border-${item.color} bg-${item.color}/5 shadow-[0_0_20px_rgba(var(--${item.color}-rgb),0.1)]` 
                : "border-border/40 bg-card/40 hover:border-border/80"}
            `}
          >
            <div className={`
              shrink-0 w-12 h-12 rounded-xl grid place-items-center transition-colors
              ${filtro === item.id 
                ? (item.id === "verificados" ? "bg-emerald-500 text-white" : `bg-${item.color} text-white`) 
                : "bg-muted text-muted-foreground group-hover:bg-muted/80"}
            `}>
              <item.icon className={cn("h-6 w-6", item.id === "verificados" && filtro !== "verificados" && "text-emerald-500")} />
            </div>
            <div>
              <p className={`text-sm font-black uppercase tracking-wider ${filtro === item.id ? `text-${item.color}` : "text-foreground"}`}>
                {item.label}
              </p>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-tight opacity-70">
                {item.desc}
              </p>
            </div>
            {filtro === item.id && (
              <div className={`absolute top-3 right-3 w-2 h-2 rounded-full bg-${item.color} animate-pulse`} />
            )}
          </button>
        ))}
      </div>

      {(() => {
        const rowHeightValue = 160;
        
        const VirtList = ({ items }: { items: any[] }) => (
          <div className="flex flex-col gap-3">
            {items.map((c) => (
              <OQCardItem 
                key={c.id}
                c={c} 
                user={user} 
                isAdmin={isAdmin} 
                exculoes={exclusoes} 
                toggleExclusion={toggleExclusion} 
                deleteCard={deleteCard} 
                setEditingCard={setEditingCard} 
                setIsEditDialogOpen={setIsEditDialogOpen} 
              />
            ))}
          </div>
        );

        // Vista agrupada por baralho na aba "Feito por mim"
        if (filtro === "aluno") {
          const groups = new Map<string, any[]>();
          for (const c of filtrados) {
            const name = (c.baralho && String(c.baralho).trim()) || "Sem baralho";
            if (!groups.has(name)) groups.set(name, []);
            groups.get(name)!.push(c);
          }
          const orderedGroups = Array.from(groups.entries()).sort((a, b) => {
            if (a[0] === "Sem baralho") return 1;
            if (b[0] === "Sem baralho") return -1;
            return a[0].localeCompare(b[0]);
          });

          if (orderedGroups.length === 0) {
            return (
              <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
                <p className="font-bold text-muted-foreground">Nenhum OQ encontrado.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Gere OQs em "Gerar OQs" para começar.</p>
              </div>
            );
          }

          return (
            <div className="grid gap-3">
              {orderedGroups.map(([name, items]) => {
                const total = items.length;
                const feitos = items.filter((c) => studiedIds.has(c.id)).length;
                const isOpen = expandedBaralhos.has(name);
                const pct = total > 0 ? Math.round((feitos / total) * 100) : 0;
                const hasBaralho = name !== "Sem baralho";

                return (
                  <div key={name} className="rounded-2xl border-2 border-border/40 bg-card/40 overflow-hidden">
                    <div className="flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors">
                      <button
                        onClick={() => toggleBaralho(name)}
                        className="flex items-center gap-3 flex-1 min-w-0 text-left"
                      >
                        <div className="shrink-0 w-10 h-10 rounded-xl bg-amber-100 text-amber-700 grid place-items-center">
                          <FolderOpen className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {isOpen ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                            <p className="font-black text-base tracking-tight truncate">{name}</p>
                          </div>
                          <div className="flex items-center gap-3 mt-1 ml-6">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              Feitos: {feitos}/{total}
                            </span>
                            <div className="h-1.5 w-24 rounded-full bg-muted overflow-hidden">
                              <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </div>
                      </button>
                      {hasBaralho ? (
                        <Link to={`/estudo?baralho=${encodeURIComponent(name)}`}>
                          <Button size="sm" className="bg-accent hover:bg-accent/90 rounded-xl font-bold gap-1.5 shrink-0">
                            <Play className="h-3.5 w-3.5" />
                            Estudar baralho
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                    {isOpen && (
                      <div className="p-3 pt-0 bg-muted/10">
                        <VirtList items={items} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        }

        // Vista padrão (lista plana) para "Todos" e "BEEmed Education"
        return (
          <div className="grid gap-3">
            {filtrados.length > 0 ? (
              <VirtList items={filtrados} />
            ) : (
              <div className="text-center py-20 border-2 border-dashed border-border/40 rounded-3xl bg-muted/5">
                <Search className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
                <p className="font-bold text-muted-foreground">Nenhum OQ encontrado.</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Tente ajustar seus filtros ou busca.</p>
              </div>
            )}
          </div>
        );
      })()}


      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tighter flex items-center gap-2">
              <Pencil className="h-5 w-5 text-accent" />
              Editar OQ
            </DialogTitle>
          </DialogHeader>

          {editingCard && (
            <form onSubmit={handleUpdateCard} className="space-y-6 py-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Pergunta / Comando</Label>
                  <Textarea 
                    value={editingCard.comando} 
                    onChange={e => setEditingCard({ ...editingCard, comando: e.target.value })}
                    className="rounded-xl min-h-[100px]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Especialidade</Label>
                    <Select 
                      value={editingCard.especialidade} 
                      onValueChange={v => setEditingCard({ ...editingCard, especialidade: v })}
                    >
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ESPECIALIDADE_LABEL).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Modo</Label>
                    <div className="px-3 py-2 bg-muted rounded-xl text-sm font-medium border border-border/40">
                      {MODO_LABEL[editingCard.modo as keyof typeof MODO_LABEL]}
                    </div>
                  </div>
                </div>

                {editingCard.modo === "abcde" ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
                      <Label className="text-xs font-bold uppercase text-emerald-600">Gabarito</Label>
                      <Select 
                        value={editingCard.alternativa_correta} 
                        onValueChange={v => setEditingCard({ ...editingCard, alternativa_correta: v })}
                      >
                        <SelectTrigger className="rounded-xl border-emerald-200 bg-emerald-50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {["A", "B", "C", "D", "E"].map(letter => (
                            <SelectItem key={letter} value={letter}>Alternativa {letter}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-3">
                      {["a", "b", "c", "d", "e"].map(letter => (
                        <div key={letter} className="flex gap-3 items-center">
                          <span className="font-bold text-accent">{letter.toUpperCase()}:</span>
                          <Input 
                            value={editingCard[`alternativa_${letter}`] || ""} 
                            onChange={e => setEditingCard({ ...editingCard, [`alternativa_${letter}`]: e.target.value })}
                            className="rounded-xl"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {editingCard.modo === "lacuna" && (
                  <div className="space-y-4 pt-2 border-t border-border/40">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Resposta da Lacuna
                      </Label>
                      <Input 
                        value={editingCard.info_1 || ""} 
                        onChange={e => setEditingCard({ ...editingCard, info_1: e.target.value })}
                        className="rounded-xl border-emerald-200 bg-emerald-50"
                        placeholder="Resposta correta"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Sinônimos e Variações (separados por ;)
                      </Label>
                      <Input 
                        value={editingCard.var_1 || ""} 
                        onChange={e => setEditingCard({ ...editingCard, var_1: e.target.value })}
                        placeholder="Ex: sigla; termo; sinonimo"
                        className="rounded-xl"
                      />
                    </div>
                  </div>
                )}

                {editingCard.modo === "oq_falta" && (
                  <div className="space-y-4 pt-2 border-t border-border/40">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Itens da Lista (Mínimo 3)</p>
                    {[1, 2, 3, 4, 5].map(i => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl bg-muted/30 border border-border/40">
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Item {i}</Label>
                          <Input 
                            value={editingCard[`info_${i}`] || ""} 
                            onChange={e => setEditingCard({ ...editingCard, [`info_${i}`]: e.target.value })}
                            className="h-8 text-xs rounded-lg"
                            placeholder={`Conteúdo do item ${i}`}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Variações {i}</Label>
                          <Input 
                            value={editingCard[`var_${i}`] || ""} 
                            onChange={e => setEditingCard({ ...editingCard, [`var_${i}`]: e.target.value })}
                            className="h-8 text-xs rounded-lg"
                            placeholder="var1; var2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {isAdmin && (
                  <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 mt-2">
                    <input 
                      type="checkbox" 
                      id="verificado" 
                      checked={editingCard.verificado || false}
                      onChange={e => setEditingCard({ ...editingCard, verificado: e.target.checked })}
                      className="h-4 w-4 text-emerald-600 rounded border-emerald-300 focus:ring-emerald-500"
                    />
                    <Label htmlFor="verificado" className="text-sm font-bold text-emerald-800 cursor-pointer">
                      Verificado (BEEmed Education)
                    </Label>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Explicação</Label>
                  <Textarea 
                    value={editingCard.explicacao || ""} 
                    onChange={e => setEditingCard({ ...editingCard, explicacao: e.target.value })}
                    className="rounded-xl min-h-[80px]"
                  />
                </div>
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="rounded-xl font-bold">
                  Cancelar
                </Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 rounded-xl font-bold px-8">
                  Salvar Alterações
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

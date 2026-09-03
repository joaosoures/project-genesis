import { useState, useRef, useEffect } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ScrollWheel from "./ScrollWheel";
import NeonHintLamp from "./NeonHintLamp";
import TactileButton from "./TactileButton";
import { MoveHorizontal, RotateCcw, X, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";

type ComponentType = "scroll" | "hint" | "confirm";

const COMPONENT_VARIANTS = {
  scroll: ["default", "minimal", "industrial", "classic", "thumbwheel"],
  hint: ["default", "led", "holo", "minimal"],
  confirm: ["default", "flat", "glass", "retro"],
};

export default function ConsoleCustomizer({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const s = useSettings();
  const [layout, setLayout] = useState<(ComponentType | null)[]>(
    s.consoleLayout.length === 3 ? s.consoleLayout : [...s.consoleLayout, ...Array(3 - s.consoleLayout.length).fill(null)]
  );
  
  // Custom styles for each position/type
  const [styles, setStyles] = useState({
    scroll: s.scrollStyle,
    hint: s.hintStyle,
    confirm: s.confirmStyle,
  });

  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const selectStyle = (type: ComponentType, variant: string) => {
    const newLayout = [...layout];
    
    if (activeSlot !== null) {
      const currentComponentInSlot = newLayout[activeSlot];
      
      // Regra fundamental: Dicas e Confirmar NUNCA podem ser substituídos por outro tipo
      // Eles só podem ser movidos ou ter seu estilo alterado
      if (currentComponentInSlot === "hint" || currentComponentInSlot === "confirm") {
        if (type !== currentComponentInSlot) {
          // Se tentar colocar algo diferente em um slot que tem hint/confirm, não permite
          feedback("error");
          return;
        }
      }

      // Se estamos tentando colocar um componente que já existe em outro slot
      const existingIndex = newLayout.indexOf(type);
      if (existingIndex !== -1 && existingIndex !== activeSlot) {
        // Se o slot de destino está vazio ou tem um scroll, podemos mover
        if (newLayout[activeSlot] === null || newLayout[activeSlot] === "scroll") {
          newLayout[existingIndex] = null;
          newLayout[activeSlot] = type;
        } else {
          // Se o destino tem algo que não pode sair (hint/confirm), trocamos as posições
          [newLayout[activeSlot], newLayout[existingIndex]] = [newLayout[existingIndex], newLayout[activeSlot]];
        }
      } else {
        // Se o componente não existe no layout ou é o mesmo slot, apenas define
        newLayout[activeSlot] = type;
      }

      setLayout(newLayout);
      setActiveSlot(null);
    }
    
    // Atualiza o estilo global para esse tipo de componente
    setStyles(prev => ({ ...prev, [type]: variant }));
    feedback("tick");
  };

  const removeComponent = (index: number) => {
    const componentToRemove = layout[index];
    
    // Dicas e Confirmar nunca podem ser removidos
    if (componentToRemove === "hint" || componentToRemove === "confirm") {
      feedback("error");
      return;
    }

    const newLayout = [...layout];
    newLayout[index] = null;
    setLayout(newLayout);
    feedback("error");
  };

  const save = () => {
    // Validar se Dicas e Confirmar estão presentes no layout
    if (!layout.includes("hint") || !layout.includes("confirm")) {
      feedback("error");
      // Forçar a presença deles se estiverem faltando (medida de segurança)
      const newLayout = [...layout];
      if (!newLayout.includes("hint")) {
        const emptyIdx = newLayout.indexOf(null);
        if (emptyIdx !== -1) newLayout[emptyIdx] = "hint";
      }
      if (!newLayout.includes("confirm")) {
        const emptyIdx = newLayout.indexOf(null);
        if (emptyIdx !== -1) newLayout[emptyIdx] = "confirm";
      }
      setLayout(newLayout);
      return;
    }

    const filteredLayout = layout.filter((item): item is ComponentType => item !== null);
    s.set("consoleLayout", filteredLayout);
    s.set("scrollStyle", styles.scroll);
    s.set("hintStyle", styles.hint);
    s.set("confirmStyle", styles.confirm);
    
    // Auto-enable native scroll if no scroll wheel is present
    const hasScroll = filteredLayout.includes("scroll");
    s.set("useNativeScroll", !hasScroll);
    
    onOpenChange(false);
    feedback("success");
  };

  const renderComponent = (type: ComponentType, variant: string, isPreview = false) => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const size = isPreview ? (isMobile ? 40 : 60) : (isMobile ? 45 : 65);
    switch (type) {
      case "scroll":
        return <ScrollWheel size={size} label="" variant={variant} className="pointer-events-none" />;
      case "hint":
        return <NeonHintLamp used={1} onClick={() => {}} variant={variant} disabled className={cn("pointer-events-none origin-center", isPreview ? (isMobile ? "scale-[0.6]" : "scale-75") : (isMobile ? "scale-[0.7]" : "scale-90"))} />;
      case "confirm":
        return <TactileButton variant="primary" styleVariant={variant} size="sm" className={cn("pointer-events-none font-bold", isMobile ? "text-[7px] h-7 px-2" : "text-[9px] h-9 px-3")}>Confirmar</TactileButton>;
    }
  };

  const labels = {
    scroll: "Scroll",
    hint: "Dicas",
    confirm: "Confirmar"
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-[95vw] bg-[hsl(var(--background))] border-none shadow-2xl p-0 overflow-y-auto max-h-[90vh] sm:max-h-none rounded-[2rem] sm:rounded-3xl">
        <div className="p-4 md:p-8 space-y-4 md:space-y-8">
          <DialogHeader className="space-y-1">
            <DialogTitle className="font-display text-xl md:text-3xl font-black tracking-tight">Personalizar Painel</DialogTitle>
            <p className="text-muted-foreground text-[10px] md:text-sm">Selecione um slot e escolha o estilo abaixo para configurar seu painel.</p>
          </DialogHeader>

          {/* Preview Area */}
          <div className="space-y-3">
            <h3 className="text-[10px] uppercase tracking-widest font-black text-muted-foreground px-1">Layout do Console</h3>
            <div className="console-surface p-2 md:p-6 rounded-3xl md:rounded-[2rem] flex items-center justify-between gap-2 md:gap-4 bg-[hsl(var(--background))] border border-white/10 shadow-inner min-h-[100px] md:min-h-[160px]">
              {layout.map((type, i) => (
                <div
                  key={i}
                  onClick={() => { setActiveSlot(activeSlot === i ? null : i); feedback("tap"); }}
                  className={cn(
                    "flex-1 flex flex-col items-center justify-center gap-1 md:gap-2 p-1 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 border-2 relative group min-h-[70px] md:min-h-[80px] cursor-pointer touch-manipulation",
                    type 
                      ? "border-transparent bg-white/5" 
                      : "border-white/10 hover:border-[hsl(var(--accent)/0.3)] hover:bg-white/5",
                    activeSlot === i ? "ring-2 ring-[hsl(var(--accent))] border-transparent bg-[hsl(var(--accent)/0.1)]" : "border-dashed"
                  )}
                >
                  {type ? (
                    <>
                      <div className="absolute -top-4 -left-2 -right-2 flex justify-between items-center z-20 px-0.5">
                        {/* Botão para mover para a esquerda (apenas se não estiver no centro) */}
                        {i !== 1 && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const newLayout = [...layout];
                              const targetIdx = i > 0 ? i - 1 : 2;
                              [newLayout[i], newLayout[targetIdx]] = [newLayout[targetIdx], newLayout[i]];
                              setLayout(newLayout);
                              feedback("tick");
                            }}
                            className={cn(
                              "w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-background/80 backdrop-blur-md border border-white/20 text-[hsl(var(--accent))] rounded-full shadow-xl active:scale-90 transition-all hover:bg-[hsl(var(--accent))] hover:text-white",
                              i === 0 && "opacity-0 pointer-events-none" // Esconde o botão da esquerda se já estiver na ponta esquerda
                            )}
                          >
                            <MoveHorizontal className="h-4 w-4 md:h-5 md:w-5 rotate-180" />
                          </button>
                        )}

                        {/* Botão de remover (apenas para o scroll) */}
                        {type === "scroll" && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); removeComponent(i); }}
                            className="w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-destructive/10 backdrop-blur-md border border-destructive/20 text-destructive rounded-full shadow-xl active:scale-90 transition-all hover:bg-destructive hover:text-white mx-auto"
                          >
                            <X className="h-4 w-4 md:h-5 md:w-5" />
                          </button>
                        )}

                        {/* Botão para mover para a direita (apenas se não estiver no centro) */}
                        {i !== 1 && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const newLayout = [...layout];
                              const targetIdx = i < 2 ? i + 1 : 0;
                              [newLayout[i], newLayout[targetIdx]] = [newLayout[targetIdx], newLayout[i]];
                              setLayout(newLayout);
                              feedback("tick");
                            }}
                            className={cn(
                              "w-8 h-8 md:w-9 md:h-9 flex items-center justify-center bg-background/80 backdrop-blur-md border border-white/20 text-[hsl(var(--accent))] rounded-full shadow-xl active:scale-90 transition-all hover:bg-[hsl(var(--accent))] hover:text-white",
                              i === 2 && "opacity-0 pointer-events-none" // Esconde o botão da direita se já estiver na ponta direita
                            )}
                          >
                            <MoveHorizontal className="h-4 w-4 md:h-5 md:w-5" />
                          </button>
                        )}
                      </div>
                      <div className="relative pointer-events-none">
                        {renderComponent(type, styles[type], true)}
                      </div>
                      <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-tighter opacity-50">{labels[type]}</span>
                    </>
                  ) : (
                    <span className="text-[8px] md:text-[10px] font-bold uppercase tracking-tighter opacity-20">
                      {activeSlot === i ? "Selecionado" : "Vazio"}
                    </span>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between px-4 md:px-8 text-[8px] md:text-[9px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              <span>Esq</span>
              <span>Centro</span>
              <span>Dir</span>
            </div>
          </div>

          {/* Style Selector Grid */}
          <div className="space-y-6 overflow-x-hidden">
            {(Object.keys(COMPONENT_VARIANTS) as ComponentType[]).map((type) => (
              <div key={type} className="space-y-2">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{labels[type]}</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
                  {COMPONENT_VARIANTS[type].map((variant) => (
                    <div
                      key={variant}
                      onClick={() => selectStyle(type, variant)}
                      className={cn(
                        "flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl border border-white/5 bg-white/5 cursor-pointer transition-all hover:bg-white/10 active:scale-95 touch-manipulation snap-center",
                        styles[type] === variant && layout.includes(type) ? "ring-2 ring-[hsl(var(--accent))]" : "",
                        // Visual feedback: se o slot selecionado tiver Dicas/Confirmar, 
                        // desabilita visualmente outros tipos de componentes na lista
                        activeSlot !== null && 
                        layout[activeSlot] !== null && 
                        layout[activeSlot] !== "scroll" && 
                        layout[activeSlot] !== type && 
                        "opacity-30 grayscale cursor-not-allowed"
                      )}
                    >
                      {renderComponent(type, variant)}
                      <span className="text-[8px] font-medium opacity-50 capitalize">{variant}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
            <button
              onClick={() => { setLayout(["hint", "confirm", "scroll"]); setStyles({ scroll: "default", hint: "default", confirm: "default" }); feedback("tap"); }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-bold text-sm bg-white/5 hover:bg-white/10 transition-colors"
            >
              <RotateCcw className="h-4 w-4" /> Restaurar
            </button>
            <button
              onClick={save}
              className="flex-1 bg-[hsl(var(--accent))] text-white px-6 py-4 rounded-2xl font-black text-sm shadow-[0_8px_24px_hsl(var(--accent)/0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Salvar
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

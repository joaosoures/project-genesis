import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Lock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Props {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  /** Se true, renderiza apenas um overlay sobre o conteúdo (mantém visível atrás). */
  overlay?: boolean;
}

export function UpgradeOuroGate({
  children,
  title = "Recurso exclusivo do Plano Ouro",
  description = "Desbloqueie a biblioteca completa e o direcionamento automático baseado em desempenho.",
  className,
  overlay = false,
}: Props) {
  const { canUse } = useUserPlan();
  const { isAdmin } = useAuth();
  const liberado = canUse("materiais") || isAdmin;

  if (liberado) return <>{children}</>;

  if (overlay) {
    return (
      <div className={cn("relative", className)}>
        <div aria-hidden className="pointer-events-none select-none blur-sm opacity-40">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4">
          <div className="paper-card p-5 max-w-sm w-full text-center border-amber-500/40 bg-background/95 backdrop-blur shadow-xl">
            <div className="mx-auto w-12 h-12 grid place-items-center rounded-2xl bg-amber-500/15 mb-3">
              <Lock className="h-5 w-5 text-amber-500" />
            </div>
            <p className="text-xs uppercase tracking-widest font-black text-amber-500 mb-1">Bloqueado</p>
            <h3 className="font-display font-bold text-base mb-1">{title}</h3>
            <p className="text-xs text-muted-foreground mb-4">{description}</p>
            <Button asChild size="sm" className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:opacity-90 w-full">
              <Link to="/meu-plano?upgrade=ouro">
                <Crown className="h-4 w-4 mr-1" />
                Upgrade para Ouro
              </Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("paper-card p-6 flex flex-col sm:flex-row items-center gap-5 border-amber-500/30", className)}>
      <div className="shrink-0 grid place-items-center rounded-2xl w-[52px] h-[52px] bg-[hsl(var(--background))] shadow-neu-out-sm">
        <Lock className="h-6 w-6 text-amber-500" />
      </div>
      <div className="flex-1 text-center sm:text-left">
        <p className="text-xs uppercase tracking-widest font-black text-amber-500 mb-1">Recurso Ouro</p>
        <h3 className="font-display font-bold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:opacity-90 px-6 rounded-xl h-11 shadow-lg whitespace-nowrap">
        <Link to="/meu-plano?upgrade=ouro">
          <Crown className="h-4 w-4 mr-1.5" />
          Upgrade para Ouro
        </Link>
      </Button>
    </div>
  );
}

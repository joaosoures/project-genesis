import { useNavigate } from "react-router-dom";
import { Clock, Snowflake, Sparkles } from "lucide-react";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

/**
 * Banner persistente de urgência no topo do app.
 * - Trial: mostra dias restantes + custo diário (centavos por dia)
 * - Congelado: alerta vermelho com dias até exclusão dos dados
 */
export default function TrialUrgencyBanner() {
  const { plano, isTrial, isCongelado, diasTrialRestantes, diasAteExclusao, loading } = useUserPlan();
  const { isAdmin } = useAuth();
  const navigate = useNavigate();

  if (loading || isAdmin || plano === "ouro" || plano === "prata") return null;

  // CONGELADO
  if (isCongelado) {
    const dias = diasAteExclusao ?? 30;
    const critico = dias <= 7;
    return (
      <button
        onClick={() => navigate("/meu-plano")}
        className={cn(
          "w-full px-4 py-2.5 text-sm font-medium flex items-center justify-center gap-2 transition-colors z-[60] shadow-md text-white",
          critico ? "bg-red-700 hover:bg-red-800 animate-pulse" : "bg-red-600 hover:bg-red-700"
        )}
      >
        <Snowflake className="h-4 w-4 shrink-0" />
        <span className="text-center">
          Sua conta está <strong>congelada</strong>. Reative em até <strong>{dias} dia{dias === 1 ? "" : "s"}</strong> para
          não perder seu progresso.
        </span>
        <span className="hidden sm:inline-block bg-white text-red-700 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
          Reativar
        </span>
      </button>
    );
  }

  // TRIAL
  if (isTrial && diasTrialRestantes !== null) {
    const critico = diasTrialRestantes <= 3;
    // Plano Prata = R$ 21,50/mês ≈ R$ 0,72/dia
    return (
      <button
        onClick={() => navigate("/meu-plano")}
        className={cn(
          "w-full px-4 py-2 text-sm flex items-center justify-center gap-2 transition-colors z-[60]",
          critico
            ? "bg-amber-500 hover:bg-amber-600 text-black font-semibold animate-pulse"
            : "bg-primary/10 hover:bg-primary/15 text-primary border-b border-primary/20"
        )}
      >
        {critico ? <Sparkles className="h-4 w-4 shrink-0" /> : <Clock className="h-4 w-4 shrink-0" />}
        <span className="text-center">
          {critico ? "Seu teste grátis acaba em " : "Você tem "}
          <strong>{diasTrialRestantes} dia{diasTrialRestantes === 1 ? "" : "s"}</strong>
          {critico ? " — aproveite!" : " de teste grátis, aproveite!"}
        </span>
        <span className="hidden sm:inline-block bg-primary text-primary-foreground px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap">
          Garantir agora
        </span>
      </button>
    );
  }

  return null;
}

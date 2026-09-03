import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";

const SESSION_KEY = "oqmed.login_alert_shown";

export default function LoginAlerts() {
  const { loading, plano, assinatura } = useUserPlan();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !assinatura) return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    const goPlano = () => navigate("/meu-plano");
    let shown = false;

    // 1. Inadimplente: maior prioridade
    if (assinatura.status === "inadimplente" || plano === "congelado") {
      const dias = Math.max(0, Math.ceil(
        (new Date(assinatura.excluir_dados_em || "").getTime() - Date.now()) / 86400000
      ) || 60);
      
      toast.error(plano === "congelado" ? "Sua conta está congelada" : "Irregularidade do pagamento detectada", {
        description: `Reative sua assinatura em até ${dias} dia(s) para não perder os seus dados de progresso e materiais de estudo.`,
        duration: 12000,
        action: { label: "Resolver", onClick: goPlano },
      });
      shown = true;
    }
    // 2. Trial expirado dentro da janela de exclusão
    else if (plano === "gratis_expirado" && assinatura.excluir_dados_em) {
      const dias = Math.ceil(
        (new Date(assinatura.excluir_dados_em).getTime() - Date.now()) / 86400000
      );
      if (dias <= 15 && dias >= 0) {
        toast.warning("Seu trial expirou", {
          description: `Faltam ${dias} dia(s) para a exclusão das suas métricas e OQs. Escolha um plano para preservar tudo.`,
          duration: 12000,
          action: { label: "Ver planos", onClick: goPlano },
        });
        shown = true;
      }
    }
    // 3. Trial acabando em <=3 dias
    else if (plano === "trial" && assinatura.data_fim_trial) {
      const dias = Math.ceil(
        (new Date(assinatura.data_fim_trial).getTime() - Date.now()) / 86400000
      );
      if (dias <= 3 && dias >= 0) {
        toast.info("Seu período de teste está acabando", {
          description: `Restam ${dias} dia(s) de trial. Escolha um plano para não perder seu progresso.`,
          duration: 10000,
          action: { label: "Ver planos", onClick: goPlano },
        });
        shown = true;
      }
    }

    if (shown) sessionStorage.setItem(SESSION_KEY, "1");
  }, [loading, plano, assinatura, navigate]);

  return null;
}

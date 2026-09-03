import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type PlanoEfetivo = "trial" | "ouro" | "prata" | "gratis" | "gratis_expirado" | "congelado";
export type StatusAssinatura = "trial" | "ativo" | "inadimplente" | "cancelado" | "expirado";

export type Feature =
  | "estudo_geral"
  | "metricas_basicas"
  | "metricas_avancadas"
  | "estudo_focado"
  | "gerar_oq_planilha"
  | "gerar_oq_ia"
  | "materiais"
  | "trilha";

export interface AssinaturaInfo {
  plano: string;
  status: StatusAssinatura;
  valor_mensal: number;
  metodo_pagamento: string | null;
  proxima_renovacao: string | null;
  data_fim_trial: string | null;
  data_inicio_trial: string | null;
  data_inadimplencia: string | null;
  data_congelamento: string | null;
  excluir_dados_em: string | null;
  data_inicio_plano: string | null;
  dias_inadimplente: number;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  cancel_at_period_end: boolean;
}

export interface UserPlanState {
  loading: boolean;
  plano: PlanoEfetivo;
  assinatura: AssinaturaInfo | null;
  canUse: (f: Feature) => boolean;
  isOuro: boolean;
  isPrata: boolean;
  isTrial: boolean;
  isCongelado: boolean;
  isGratisExpirado: boolean;
  diasTrialRestantes: number | null;
  diasAteExclusao: number | null;
  refresh: () => Promise<void>;
}

const FEATURE_MAP: Record<Feature, PlanoEfetivo[]> = {
  estudo_geral: ["trial", "ouro", "prata"],
  metricas_basicas: ["trial", "ouro", "prata"],
  metricas_avancadas: ["trial", "ouro", "prata"],
  estudo_focado: ["trial", "ouro", "prata"],
  gerar_oq_planilha: ["trial", "ouro", "prata"],
  gerar_oq_ia: ["trial", "ouro"],
  materiais: ["trial", "ouro"],
  trilha: ["trial", "ouro"],
};

export function useUserPlan(): UserPlanState {
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plano, setPlano] = useState<PlanoEfetivo>("trial");
  const [assinatura, setAssinatura] = useState<AssinaturaInfo | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [{ data: planData }, { data: assData }] = await Promise.all([
      supabase.rpc("get_user_plan", { _user_id: user.id }),
      supabase.from("assinaturas").select("*").eq("usuario_id", user.id).maybeSingle(),
    ]);
    if (planData) setPlano(planData as PlanoEfetivo);
    if (assData) setAssinatura(assData as unknown as AssinaturaInfo);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`ass_${user.id}_${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "assinaturas", filter: `usuario_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user, load]);

  const canUse = useCallback(
    (f: Feature) => {
      if (isAdmin) return true;
      return FEATURE_MAP[f].includes(plano);
    },
    [plano, isAdmin]
  );

  const diasTrialRestantes =
    assinatura?.data_fim_trial && plano === "trial"
      ? Math.max(0, Math.ceil((new Date(assinatura.data_fim_trial).getTime() - Date.now()) / 86400000))
      : null;

  const diasAteExclusao =
    assinatura?.excluir_dados_em && plano === "congelado"
      ? Math.max(0, Math.ceil((new Date(assinatura.excluir_dados_em).getTime() - Date.now()) / 86400000))
      : null;

  return {
    loading,
    plano,
    assinatura,
    canUse,
    isOuro: plano === "ouro",
    isPrata: plano === "prata",
    isTrial: plano === "trial",
    isCongelado: plano === "congelado" || plano === "gratis_expirado",
    isGratisExpirado: plano === "gratis_expirado" || plano === "congelado",
    diasTrialRestantes,
    diasAteExclusao,
    refresh: load,
  };
}

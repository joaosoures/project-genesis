import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, number> = {
  ouro: 30,
  trial: 10,
  prata: 0,
  gratis: 0,
  congelado: 0,
  gratis_expirado: 0,
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  const supabase = createClient(SUPABASE_URL ?? "", SUPABASE_SERVICE_ROLE_KEY ?? "");

  let userPlan = "gratis";
  let userId: string | null = null;
  let limit = 0;
  let remaining = 0;
  let isAdmin = false;

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      if (userData?.user) {
        userId = userData.user.id;
        const [{ data: planData }, { data: roleData }] = await Promise.all([
          supabase.rpc("get_user_plan", { _user_id: userId }),
          supabase.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle(),
        ]);
        userPlan = (planData as string) || "gratis";
        isAdmin = !!roleData;
        limit = isAdmin ? 9999 : (PLAN_LIMITS[userPlan] ?? 0);

        const { data: usage } = await supabase.from("user_ia_usage").select("count_today, last_reset").eq("usuario_id", userId).maybeSingle();
        let used = 0;
        if (usage) {
          const lastReset = usage.last_reset ? new Date(usage.last_reset) : null;
          const today = new Date();
          const sameDay = lastReset && lastReset.getUTCFullYear() === today.getUTCFullYear() && lastReset.getUTCMonth() === today.getUTCMonth() && lastReset.getUTCDate() === today.getUTCDate();
          used = sameDay ? (usage.count_today ?? 0) : 0;
        }
        remaining = Math.max(0, limit - used);
      }
    }
  } catch (e) {
    console.error("ai-status user lookup failed:", e);
  }

  // Verifica chaves reservas
  const { data: backupKeys } = await supabase.from("api_keys_pool").select("id").eq("is_active", true);
  const hasBackup = (backupKeys?.length ?? 0) > 0;

  if (!LOVABLE_API_KEY && !hasBackup) {
    return new Response(
      JSON.stringify({
        ok: false,
        status: "offline",
        message: "O serviço de IA não possui chaves ativas.",
        credits: { remaining, limit },
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // Tenta o ping com a chave principal
    const ping = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "google/gemini-2.0-flash-lite", messages: [{ role: "user", content: "ping" }], max_tokens: 1 }),
    });

    const latencyMs = Date.now() - startedAt;
    let status: "online" | "lento" | "limitado" | "sem_creditos" | "offline" = "online";
    let message = "Tudo funcionando normalmente.";

    if (ping.status === 402 || ping.status === 429 || !ping.ok) {
      if (hasBackup) {
        status = "online";
        message = "Chave principal instável, usando chaves de reserva.";
      } else {
        if (ping.status === 402) status = "sem_creditos";
        else if (ping.status === 429) status = "limitado";
        else status = "offline";
        message = `O serviço de IA está instável (HTTP ${ping.status}).`;
      }
    } else if (latencyMs > 4000) {
      status = "lento";
      message = "O serviço de IA está respondendo lentamente.";
    }

    if (limit > 0 && remaining <= 0) {
      status = "sem_creditos";
      message = "Você usou todos os créditos diários do seu plano.";
    }

    return new Response(
      JSON.stringify({
        ok: true,
        status,
        message,
        latencyMs,
        plano: userPlan,
        isAdmin,
        hasBackup,
        backupCount: backupKeys?.length ?? 0,
        credits: { remaining, limit },
        checkedAt: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("ai-status ping failed:", err);
    return new Response(
      JSON.stringify({
        ok: hasBackup,
        status: hasBackup ? "online" : "offline",
        message: hasBackup ? "Usando chaves de reserva." : "Não conseguimos contatar o serviço de IA.",
        credits: { remaining, limit },
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
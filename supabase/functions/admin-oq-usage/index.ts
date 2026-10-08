import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Autenticação obrigatória." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const service = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = authHeader.replace("Bearer ", "");
    const { data: authData, error: authError } = await service.auth.getUser(token);
    if (authError || !authData.user) return new Response(JSON.stringify({ error: "Sessão inválida." }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: role } = await service.from("user_roles").select("role").eq("user_id", authData.user.id).eq("role", "admin").maybeSingle();
    if (!role) return new Response(JSON.stringify({ error: "Acesso restrito a administradores." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: logs, error } = await service.from("oq_geracao_log").select("id, usuario_id, nome_arquivo, quantidade_gerada, creditos_gastos, status, erro, criado_em").gte("criado_em", startOfDay.toISOString()).order("criado_em", { ascending: false }).limit(200);
    if (error) throw error;

    const userIds = [...new Set((logs ?? []).map((item) => item.usuario_id))];
    const { data: profiles } = userIds.length ? await service.from("profiles").select("id, nome, email").in("id", userIds) : { data: [] };
    const profileMap = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    const requests = (logs ?? []).map((item) => ({ ...item, user: profileMap.get(item.usuario_id) ?? null }));

    return new Response(JSON.stringify({ requests, date: startOfDay.toISOString() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[admin-oq-usage] failed", error);
    return new Response(JSON.stringify({ error: "Não foi possível carregar o histórico de gerações." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});

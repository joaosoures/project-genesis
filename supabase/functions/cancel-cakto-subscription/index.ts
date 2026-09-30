import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authorization = req.headers.get("Authorization");
    if (!authorization) return json({ error: "Unauthorized" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authorization } } },
    );
    const token = authorization.replace(/^Bearer\s+/i, "");
    const { data: claims, error: claimsError } = await userClient.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (claimsError || typeof userId !== "string") return json({ error: "Unauthorized" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: subscription, error: subscriptionError } = await admin
      .from("assinaturas")
      .select("cakto_subscription_id, status, plano")
      .eq("usuario_id", userId)
      .maybeSingle();

    if (subscriptionError) throw subscriptionError;
    if (!subscription?.cakto_subscription_id) {
      return json({ error: "Nenhuma assinatura Cakto ativa foi encontrada." }, 400);
    }
    if (subscription.status !== "ativo" || !["ouro", "prata"].includes(subscription.plano)) {
      return json({ error: "A assinatura atual não pode ser cancelada." }, 400);
    }

    const apiKey = Deno.env.get("CAKTO_API_KEY");
    if (!apiKey) return json({ error: "Integração Cakto não configurada." }, 500);
    const response = await fetch(
      `https://api.cakto.com.br/public_api/subscriptions/${encodeURIComponent(subscription.cakto_subscription_id)}/cancel/`,
      { method: "POST", headers: { Authorization: `Bearer ${apiKey}` } },
    );
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({ error: result?.detail ?? result?.message ?? "A Cakto não permitiu o cancelamento." }, response.status);
    }

    const { error: updateError } = await admin
      .from("assinaturas")
      .update({ plano: "gratis", status: "cancelado", cancel_at_period_end: false })
      .eq("usuario_id", userId);
    if (updateError) throw updateError;

    return json({ ok: true, detail: result?.detail ?? "Assinatura cancelada com sucesso." });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível cancelar a assinatura." }, 400);
  }
});

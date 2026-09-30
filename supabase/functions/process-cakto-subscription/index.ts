import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const PRODUCT_ID = "106162cc-1620-402b-a9e6-8efa3cde5e58";
const OFFERS = { ouro: "37myfzv_1077920", prata: "s3zhhof" } as const;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const required = (value: unknown, name: string) => { if (typeof value !== "string" || !value.trim()) throw new Error(`${name} é obrigatório`); return value.trim(); };

async function createPayment(body: unknown, idempotencyKey: string) {
  const apiKey = required(Deno.env.get("CAKTO_API_KEY"), "CAKTO_API_KEY");
  const response = await fetch("https://api.cakto.com.br/public_api/payments/", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "X-Idempotency-Key": idempotencyKey }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.detail ?? data?.message ?? data?.error ?? `Cakto respondeu ${response.status}`);
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Unauthorized" }, 401);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const token = auth.replace(/^Bearer\s+/i, "");
    const { data: claims, error: claimError } = await supabase.auth.getClaims(token);
    if (claimError || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = String(claims.claims.sub);
    const body = await req.json();
    const productId = required(body.productId, "productId");
    const plan = productId === "ouro" ? "ouro" : productId === "prata" ? "prata" : null;
    if (!plan) return json({ error: "Plano inválido" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: adminRole } = await admin.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (adminRole) {
      await admin.from("assinaturas").upsert({ usuario_id: userId, plano: "ouro", status: "ativo", valor_mensal: 0, data_inicio_plano: new Date().toISOString(), data_congelamento: null, excluir_dados_em: null, data_inadimplencia: null, dias_inadimplente: 0, cancel_at_period_end: false }, { onConflict: "usuario_id" });
      return json({ ok: true, admin: true, plan: "ouro" });
    }
    const cardToken = required(body.cardToken, "cardToken");
    const antifraudReference = required(body.antifraudReference, "antifraudReference");
    const { data: current } = await admin.from("assinaturas").select("plano, cakto_subscription_id").eq("usuario_id", userId).maybeSingle();
    if (current?.plano === "ouro" && plan === "prata" && current.cakto_subscription_id) {
      const cancelResponse = await fetch(`https://api.cakto.com.br/public_api/subscriptions/${encodeURIComponent(current.cakto_subscription_id)}/cancel/`, { method: "POST", headers: { Authorization: `Bearer ${required(Deno.env.get("CAKTO_API_KEY"), "CAKTO_API_KEY")}` } });
      if (!cancelResponse.ok) throw new Error("Não foi possível cancelar a assinatura Ouro anterior");
    }
    const { data: profile } = await admin.from("profiles").select("email, nome, telefone").eq("id", userId).maybeSingle();
    const email = required(profile?.email ?? claims.claims.email, "email");
    const name = required(profile?.nome ?? claims.claims.user_metadata?.nome ?? "Cliente OQ MED", "nome");
    const phone = required(profile?.telefone ?? claims.claims.user_metadata?.telefone, "telefone").replace(/\D/g, "");
    const idempotencyKey = crypto.randomUUID();
    const payment = await createPayment({ paymentMethod: "credit_card", customer: { name, email, phone, fingerprint: antifraudReference }, items: [{ offerId: OFFERS[plan], quantity: 1, offerType: "main" }], card: { token: cardToken }, antifraud_profiling_attempt_reference: antifraudReference, metadata: { user_id: userId, product_id: PRODUCT_ID, plan } }, idempotencyKey);
    const paymentId = payment?.id ?? payment?.refId;
    if (!paymentId) throw new Error("A Cakto não retornou o ID do pagamento");
    await admin.from("assinaturas").upsert({ usuario_id: userId, plano: "trial", status: "trial", cakto_customer_id: null, cakto_subscription_id: null, metodo_pagamento: "credit_card", cancel_at_period_end: false }, { onConflict: "usuario_id" });
    return json({ ok: true, paymentId, status: payment.status });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível processar o pagamento" }, 400);
  }
});

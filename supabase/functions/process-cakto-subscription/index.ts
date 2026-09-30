import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const OURO = "106162cc-1620-402b-a9e6-8efa3cde5e58";
const PRATA = "3d7c3f69-120e-4f24-b191-54241cb0660f";

type Card = { holderName: string; number: string; expirationMonth: string; expirationYear: string; cvv: string };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const required = (value: unknown, name: string) => { if (typeof value !== "string" || !value.trim()) throw new Error(`${name} é obrigatório`); return value.trim(); };

async function cakto(path: string, body: unknown) {
  const response = await fetch(path, { method: "POST", headers: { Authorization: `Bearer ${required(Deno.env.get("CAKTO_API_KEY"), "CAKTO_API_KEY")}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.message ?? data?.error ?? `Cakto respondeu ${response.status}`);
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
    const email = String(claims.claims.email ?? "").toLowerCase();
    const body = await req.json();
    const productId = required(body.productId, "productId");
    if (![OURO, PRATA].includes(productId)) return json({ error: "Plano inválido" }, 400);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: adminRole } = await admin.from("user_roles").select("user_id").eq("user_id", userId).eq("role", "admin").maybeSingle();
    if (adminRole) {
      await admin.from("assinaturas").upsert({ usuario_id: userId, plano: "ouro", status: "ativo", valor_mensal: 0, data_inicio_plano: new Date().toISOString(), data_congelamento: null, excluir_dados_em: null, data_inadimplencia: null, dias_inadimplente: 0, cancel_at_period_end: false }, { onConflict: "usuario_id" });
      return json({ ok: true, admin: true, plan: "ouro" });
    }
    const card: Card = body.card;
    required(card?.holderName, "Nome do titular");
    const number = required(card?.number, "Número do cartão").replace(/\D/g, "");
    const cvv = required(card?.cvv, "CVV").replace(/\D/g, "");
    const month = required(card?.expirationMonth, "Mês de validade").replace(/\D/g, "");
    const year = required(card?.expirationYear, "Ano de validade").replace(/\D/g, "");
    if (number.length < 12 || cvv.length < 3) return json({ error: "Dados do cartão inválidos" }, 400);
    const { data: current } = await admin.from("assinaturas").select("plano, cakto_subscription_id").eq("usuario_id", userId).maybeSingle();
    if (current?.plano === "ouro" && productId === PRATA && current.cakto_subscription_id) {
      await cakto(required(Deno.env.get("CAKTO_CANCEL_SUBSCRIPTION_URL"), "CAKTO_CANCEL_SUBSCRIPTION_URL"), { subscriptionId: current.cakto_subscription_id });
    }
    const cardToken = await cakto(required(Deno.env.get("CAKTO_CARD_TOKEN_URL"), "CAKTO_CARD_TOKEN_URL"), { card: { holderName: card.holderName.trim(), number, expirationMonth: month, expirationYear: year, cvv } });
    const tokenId = cardToken?.cardToken ?? cardToken?.token ?? cardToken?.data?.cardToken ?? cardToken?.data?.token;
    if (!tokenId) throw new Error("A Cakto não retornou cardToken");
    const subscription = await cakto(required(Deno.env.get("CAKTO_SUBSCRIPTION_URL"), "CAKTO_SUBSCRIPTION_URL"), { productId, cardToken: tokenId, customer: { email, name: card.holderName.trim() }, metadata: { userId } });
    const subscriptionId = subscription?.subscription?.id ?? subscription?.data?.subscription?.id ?? subscription?.id;
    const customerId = subscription?.customer?.id ?? subscription?.data?.customer?.id ?? subscription?.customerId ?? null;
    if (!subscriptionId) throw new Error("A Cakto não retornou o ID da assinatura");
    await admin.from("assinaturas").upsert({ usuario_id: userId, plano: productId === OURO ? "ouro" : "prata", status: "ativo", cakto_subscription_id: subscriptionId, cakto_customer_id: customerId, metodo_pagamento: "credit_card", data_inicio_plano: new Date().toISOString(), valor_mensal: productId === OURO ? 28.5 : 21.5, cancel_at_period_end: false }, { onConflict: "usuario_id" });
    return json({ ok: true, subscriptionId });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível processar a assinatura" }, 400);
  }
});

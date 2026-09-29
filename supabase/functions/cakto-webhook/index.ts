import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-cakto-secret" };
const OURO = "106162cc-1620-402b-a9e6-8efa3cde5e58";
const PRATA = "3d7c3f69-120e-4f24-b191-54241cb0660f";
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);
  try {
    const payload = await req.json();
    const configuredSecret = Deno.env.get("CAKTO_WEBHOOK_SECRET");
    if (!configuredSecret || payload.secret !== configuredSecret) return response({ error: "Unauthorized" }, 401);
    const data = payload.data ?? {};
    const eventId = String(data.id ?? data.refId ?? `${payload.event}:${data.customer?.email ?? "unknown"}:${data.createdAt ?? ""}`);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { error: duplicateError } = await admin.from("cakto_webhook_events").insert({ event_id: eventId, event_name: String(payload.event ?? "unknown"), payload });
    if (duplicateError?.code === "23505") return response({ ok: true, duplicate: true });
    if (duplicateError) throw duplicateError;
    const email = String(data.customer?.email ?? "").trim().toLowerCase();
    if (!email) return response({ ok: true, ignored: "missing_customer_email" });
    const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
    if (!profile) return response({ ok: true, ignored: "user_not_found" });
    const productId = String(data.product?.id ?? "");
    const plan = productId === OURO ? "ouro" : productId === PRATA ? "prata" : null;
    const event = String(payload.event ?? "").toLowerCase();
    const isCanceled = ["subscription_canceled", "subscription_cancelled", "purchase_canceled", "purchase_cancelled", "subscription_expired", "refund", "chargeback"].some((name) => event.includes(name));
    if (isCanceled) {
      await admin.from("assinaturas").update({ status: "cancelado", plano: "gratis", cancel_at_period_end: false, data_congelamento: new Date().toISOString() }).eq("usuario_id", profile.id);
      return response({ ok: true });
    }
    if (["purchase_approved", "subscription_activated", "subscription_approved", "payment_approved"].includes(event) && plan) {
      const subscriptionId = data.subscription?.id ?? data.subscription_id ?? data.id;
      const customerId = data.customer?.id ?? data.customer_id ?? null;
      await admin.from("assinaturas").update({ plano: plan, status: "ativo", cakto_subscription_id: subscriptionId, cakto_customer_id: customerId, metodo_pagamento: data.paymentMethod ?? "credit_card", proxima_renovacao: data.due_date ?? null, cancel_at_period_end: false, data_inicio_plano: data.paidAt ?? new Date().toISOString(), valor_mensal: Number(data.amount ?? 0) }).eq("usuario_id", profile.id);
      await admin.from("pagamentos").insert({ usuario_id: profile.id, valor: Number(data.amount ?? 0), plano: plan, status: "pago", metodo: data.paymentMethod ?? "credit_card", data_pagamento: data.paidAt ?? new Date().toISOString() });
    }
    return response({ ok: true });
  } catch (error) {
    return response({ error: error instanceof Error ? error.message : "Webhook inválido" }, 400);
  }
});

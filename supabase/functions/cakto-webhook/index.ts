import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-cakto-timestamp, x-cakto-signature", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const PRODUCT_ID = "106162cc-1620-402b-a9e6-8efa3cde5e58";
const OFFERS = { ouro: "37myfzv_1077920", prata: "7o3anwr" } as const;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const timingSafeEqual = (left: string, right: string) => {
  const a = new TextEncoder().encode(left);
  const b = new TextEncoder().encode(right);
  if (a.length !== b.length) return false;
  let result = 0;
  for (let index = 0; index < a.length; index++) result |= a[index] ^ b[index];
  return result === 0;
};

async function isValidSignature(rawBody: string, timestamp: string, signature: string, secret: string) {
  if (!timestamp || !signature || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${timestamp}.${rawBody}`));
  const hex = Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
  return timingSafeEqual(signature, `v1=${hex}`);
}

const asArray = (value: unknown) => Array.isArray(value) ? value : [value];
const amount = (value: unknown) => typeof value === "number" ? value : Number(value ?? 0);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const rawBody = await req.text();
    const secret = Deno.env.get("CAKTO_WEBHOOK_SECRET");
    if (!secret) return json({ error: "Webhook não configurado" }, 500);
    const timestamp = req.headers.get("X-Cakto-Timestamp") ?? "";
    const signature = req.headers.get("X-Cakto-Signature") ?? "";
    if (!(await isValidSignature(rawBody, timestamp, signature, secret))) return json({ error: "Assinatura inválida" }, 401);
    const payload = JSON.parse(rawBody);
    if (!timingSafeEqual(String(payload.secret ?? ""), secret)) return json({ error: "Webhook não autorizado" }, 401);
    const event = String(payload.event ?? "").toLowerCase();
    if (event === "checkout_abandonment") return json({ ok: true, ignored: event });
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const records = asArray(payload.data);
    for (const data of records) {
      if (!data || typeof data !== "object") continue;
      const record = data as Record<string, any>;
      const eventId = `${String(record.id ?? record.refId ?? "unknown")}:${event}`;
      const { error: duplicateError } = await admin.from("cakto_webhook_events").insert({ event_id: eventId, event_name: event, payload });
      if (duplicateError?.code === "23505") continue;
      if (duplicateError) throw duplicateError;
      const email = String(record.customer?.email ?? "").trim().toLowerCase();
      if (!email) continue;
      const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
      if (!profile) continue;
      const { data: adminRole } = await admin.from("user_roles").select("user_id").eq("user_id", profile.id).eq("role", "admin").maybeSingle();
      if (adminRole) {
        await admin.from("assinaturas").upsert({ usuario_id: profile.id, plano: "ouro", status: "ativo", valor_mensal: 0, data_congelamento: null, excluir_dados_em: null, data_inadimplencia: null, dias_inadimplente: 0, cancel_at_period_end: false }, { onConflict: "usuario_id" });
        continue;
      }
      const offerId = String(record.offer?.id ?? "");
      const plan = offerId === OFFERS.ouro ? "ouro" : offerId === OFFERS.prata ? "prata" : record.product?.id === PRODUCT_ID ? null : null;
      const subscriptionId = record.subscription?.id ?? record.subscription_id ?? null;
      const customerId = record.customer?.id ?? record.customer_id ?? null;
      const paidEvents = ["purchase_approved", "subscription_created", "subscription_renewed", "subscription_late_recovered", "subscription_resumed"];
      const lateEvents = ["subscription_late", "subscription_renewal_refused", "subscription_paused"];
      const canceledEvents = ["subscription_canceled", "refund", "chargeback"];
      if (canceledEvents.includes(event)) {
        await admin.from("assinaturas").update({ plano: "gratis", status: "cancelado", cancel_at_period_end: false, data_congelamento: new Date().toISOString(), data_inadimplencia: event === "subscription_canceled" ? null : new Date().toISOString() }).eq("usuario_id", profile.id);
      } else if (lateEvents.includes(event)) {
        await admin.from("assinaturas").update({ status: "inadimplente", data_inadimplencia: record.createdAt ?? new Date().toISOString(), cakto_subscription_id: subscriptionId, cakto_customer_id: customerId }).eq("usuario_id", profile.id);
      } else if (paidEvents.includes(event) && plan) {
        await admin.from("assinaturas").update({ plano: plan, status: "ativo", cakto_subscription_id: subscriptionId, cakto_customer_id: customerId, metodo_pagamento: record.paymentMethod ?? "credit_card", proxima_renovacao: record.due_date ?? null, data_ultima_cobranca: record.paidAt ?? new Date().toISOString(), data_inicio_plano: record.paidAt ?? new Date().toISOString(), valor_mensal: amount(record.amount), cancel_at_period_end: false, data_congelamento: null, excluir_dados_em: null, data_inadimplencia: null, dias_inadimplente: 0 }).eq("usuario_id", profile.id);
        await admin.from("pagamentos").insert({ usuario_id: profile.id, valor: amount(record.amount), plano: plan, status: "pago", metodo: record.paymentMethod ?? "credit_card", data_pagamento: record.paidAt ?? new Date().toISOString() });
      }
    }
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Webhook inválido" }, 400);
  }
});

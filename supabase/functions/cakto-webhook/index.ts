import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "content-type, x-cakto-timestamp, x-cakto-signature", "Access-Control-Allow-Methods": "POST, OPTIONS" };
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
const identifier = (value: unknown) => typeof value === "string" || typeof value === "number" ? String(value) : "";

async function cancelCaktoSubscription(subscriptionId: string) {
  const apiKey = Deno.env.get("CAKTO_API_KEY");
  if (!apiKey) throw new Error("Integração Cakto não configurada para cancelar a assinatura anterior.");
  const response = await fetch(`https://api.cakto.com.br/public_api/subscriptions/${encodeURIComponent(subscriptionId)}/cancel/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const result = await response.json().catch(() => ({}));
  const detail = String(result?.detail ?? result?.message ?? "");
  if (!response.ok && !(response.status === 400 && /já cancelad|already cancel/i.test(detail))) {
    throw new Error(detail || "A Cakto não permitiu cancelar a assinatura anterior.");
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const rawBody = await req.text();
    const secret = Deno.env.get("CAKTO_WEBHOOK_SECRET");
    const ouroId = Deno.env.get("CAKTO_PLAN_OURO_ID");
    const prataId = Deno.env.get("CAKTO_PLAN_PRATA_ID");
    if (!secret || !ouroId || !prataId) return json({ error: "Webhook não configurado" }, 500);
    const timestamp = req.headers.get("X-Cakto-Timestamp") ?? "";
    const signature = req.headers.get("X-Cakto-Signature") ?? "";
    if (!(await isValidSignature(rawBody, timestamp, signature, secret))) return json({ error: "Assinatura inválida" }, 401);
    const payload = JSON.parse(rawBody);
    if (!(payload.secret === undefined || timingSafeEqual(String(payload.secret), secret))) return json({ error: "Webhook não autorizado" }, 401);
    const event = String(payload.event ?? "").toLowerCase();
    if (event === "checkout_abandonment") return json({ ok: true, ignored: event });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const records = asArray(payload.data);
    for (const data of records) {
      if (!data || typeof data !== "object") continue;
      const record = data as Record<string, any>;
      const eventId = `${String(record.id ?? record.refId ?? "unknown")}:${event}`;
      const email = String(record.customer?.email ?? record.customer_email ?? "").trim().toLowerCase();
      if (!email) continue;
      const { data: profile } = await admin.from("profiles").select("id").ilike("email", email).maybeSingle();
      if (!profile) continue;
      const { data: adminRole } = await admin.from("user_roles").select("user_id").eq("user_id", profile.id).eq("role", "admin").maybeSingle();
      if (adminRole) {
        await admin.from("assinaturas").upsert({ usuario_id: profile.id, plano: "ouro", status: "ativo", valor_mensal: 0, data_congelamento: null, excluir_dados_em: null, data_inadimplencia: null, dias_inadimplente: 0, cancel_at_period_end: false }, { onConflict: "usuario_id" });
        continue;
      }

      const { data: existingEvent } = await admin.from("cakto_webhook_events").select("event_id").eq("event_id", eventId).maybeSingle();
      if (existingEvent) continue;

      const planIdentifiers = [
        identifier(record.offer?.id), identifier(record.offer?.short_id), identifier(record.product?.id),
        identifier(record.product?.short_id), identifier(record.product_id), identifier(record.offer_id),
      ].filter(Boolean);
      const plan = planIdentifiers.includes(ouroId) ? "ouro" : planIdentifiers.includes(prataId) ? "prata" : null;
      const subscriptionId = identifier(record.subscription?.id ?? record.subscription_id);
      const customerId = identifier(record.customer?.id ?? record.customer_id);
      const paidEvents = ["purchase_approved", "subscription_renewed", "subscription_late_recovered", "subscription_resumed"];
      const lateEvents = ["subscription_late", "subscription_renewal_refused", "subscription_paused"];
      const canceledEvents = ["subscription_canceled", "refund", "chargeback"];

      if (canceledEvents.includes(event)) {
        await admin.from("assinaturas").update({ plano: "gratis", status: "cancelado", cancel_at_period_end: false, data_congelamento: new Date().toISOString(), data_inadimplencia: event === "subscription_canceled" ? null : new Date().toISOString() }).eq("usuario_id", profile.id);
      } else if (lateEvents.includes(event)) {
        await admin.from("assinaturas").update({ status: "inadimplente", data_inadimplencia: record.createdAt ?? new Date().toISOString(), cakto_subscription_id: subscriptionId || null, cakto_customer_id: customerId || null }).eq("usuario_id", profile.id);
      } else if (paidEvents.includes(event) && plan) {
        const { data: currentSubscription } = await admin.from("assinaturas").select("cakto_subscription_id, plano, status").eq("usuario_id", profile.id).maybeSingle();
        const previousSubscriptionId = identifier(currentSubscription?.cakto_subscription_id);
        const isPlanChange = Boolean(previousSubscriptionId && subscriptionId && previousSubscriptionId !== subscriptionId && currentSubscription?.plano !== plan);

        if (isPlanChange) await cancelCaktoSubscription(previousSubscriptionId);

        const { error: subscriptionError } = await admin.from("assinaturas").update({ plano: plan, status: "ativo", cakto_subscription_id: subscriptionId || null, cakto_customer_id: customerId || null, metodo_pagamento: record.paymentMethod ?? "hosted_checkout", proxima_renovacao: record.due_date ?? null, data_ultima_cobranca: record.paidAt ?? new Date().toISOString(), data_inicio_plano: record.paidAt ?? new Date().toISOString(), valor_mensal: amount(record.amount), cancel_at_period_end: false, data_congelamento: null, excluir_dados_em: null, data_inadimplencia: null, dias_inadimplente: 0 }).eq("usuario_id", profile.id);
        if (subscriptionError) throw subscriptionError;
        await admin.from("profiles").update({ plan_type: plan }).eq("id", profile.id);
        await admin.from("pagamentos").insert({ usuario_id: profile.id, valor: amount(record.amount), plano: plan, status: "pago", metodo: record.paymentMethod ?? "hosted_checkout", data_pagamento: record.paidAt ?? new Date().toISOString() });
      }

      const { error: eventError } = await admin.from("cakto_webhook_events").insert({ event_id: eventId, event_name: event, payload });
      if (eventError && eventError.code !== "23505") throw eventError;
    }
    return json({ ok: true });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Webhook inválido" }, 400);
  }
});

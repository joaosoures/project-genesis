import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, verifyWebhook, createStripeClient } from "../_shared/stripe.ts";

const VALOR_OURO_CENTS = 2850;

async function rewardReferrer(invoice: any, env: StripeEnv) {
  try {
    const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
    if (!subscriptionId) return;

    const { data: sub } = await getSupabase()
      .from('assinaturas')
      .select('usuario_id')
      .eq('stripe_subscription_id', subscriptionId)
      .maybeSingle();
    if (!sub) return;
    const convidadoId = (sub as any).usuario_id;

    const { data: ind } = await getSupabase()
      .from('indicacoes')
      .select('id, indicador_id, status, stripe_credit_note_id')
      .eq('convidado_id', convidadoId)
      .maybeSingle();
    if (!ind) return;
    if ((ind as any).status === 'recompensado' || (ind as any).stripe_credit_note_id) {
      console.log('Indicação já recompensada, ignorando');
      return;
    }

    // Antifraude básica: valor mínimo da fatura
    if (!invoice.amount_paid || invoice.amount_paid < 1000) {
      console.warn('Fatura abaixo do mínimo para recompensar indicação');
      return;
    }

    // Buscar customer do indicador
    const { data: indAss } = await getSupabase()
      .from('assinaturas')
      .select('stripe_customer_id, status')
      .eq('usuario_id', (ind as any).indicador_id)
      .maybeSingle();

    const stripe = createStripeClient(env);
    let customerId = (indAss as any)?.stripe_customer_id as string | null;

    if (!customerId) {
      // Buscar email do indicador
      const admin = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      );
      const { data: { user } } = await admin.auth.admin.getUserById((ind as any).indicador_id);
      const created = await stripe.customers.create({
        email: user?.email ?? undefined,
        metadata: { userId: (ind as any).indicador_id },
      });
      customerId = created.id;
      await getSupabase().from('assinaturas').update({ stripe_customer_id: customerId })
        .eq('usuario_id', (ind as any).indicador_id);
    }

    // Crédito (amount negativo = a favor do cliente)
    const tx = await stripe.customers.createBalanceTransaction(customerId, {
      amount: -VALOR_OURO_CENTS,
      currency: 'brl',
      description: `Crédito por indicação (fatura ${invoice.id})`,
      metadata: { indicacao_id: (ind as any).id, convidado_id: convidadoId },
    });

    await getSupabase().from('indicacoes').update({
      status: 'recompensado',
      stripe_credit_note_id: tx.id,
      recompensado_em: new Date().toISOString(),
      convertido_em: new Date().toISOString(),
      valor_credito_brl: VALOR_OURO_CENTS / 100,
    }).eq('id', (ind as any).id);

    console.log('Indicação recompensada:', (ind as any).id);
  } catch (e) {
    console.error('rewardReferrer error:', e);
  }
}


// Mapeia price lookup_keys do Stripe para nossos planos internos
const PRICE_TO_PLANO: Record<string, { plano: 'ouro' | 'prata'; valor: number }> = {
  prata_mensal: { plano: 'prata', valor: 21.5 },
  ouro_mensal: { plano: 'ouro', valor: 28.5 },
};

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
  }
  return _supabase;
}

function mapStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'active':
    case 'trialing':
      return 'ativo';
    case 'past_due':
    case 'unpaid':
      return 'inadimplente';
    case 'canceled':
    case 'incomplete_expired':
      return 'cancelado';
    case 'paused':
      return 'cancelado';
    default:
      return stripeStatus;
  }
}

function resolvePriceLookup(item: any): string | null {
  return item?.price?.lookup_key
    || item?.price?.metadata?.lovable_external_id
    || null;
}

async function findUserId(subscription: any): Promise<string | null> {
  if (subscription?.metadata?.userId) return subscription.metadata.userId;
  if (subscription?.id) {
    const { data } = await getSupabase()
      .from('assinaturas')
      .select('usuario_id')
      .eq('stripe_subscription_id', subscription.id)
      .maybeSingle();
    return (data as any)?.usuario_id ?? null;
  }
  return null;
}

async function handleSubscriptionUpsert(subscription: any) {
  const userId = await findUserId(subscription);
  if (!userId) {
    console.warn('Subscription event without resolvable userId', subscription.id);
    return;
  }

  const item = subscription.items?.data?.[0];
  const lookup = resolvePriceLookup(item);
  const mapped = lookup ? PRICE_TO_PLANO[lookup] : null;
  if (!mapped) {
    console.warn('Unknown price lookup_key in subscription webhook', lookup);
    return;
  }

  const status = mapStatus(subscription.status);
  const periodEndSec = item?.current_period_end ?? subscription.current_period_end;
  const periodStartSec = item?.current_period_start ?? subscription.current_period_start;
  const periodEnd = periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null;
  const periodStart = periodStartSec ? new Date(periodStartSec * 1000).toISOString() : null;

  const update: Record<string, any> = {
    plano: mapped.plano,
    status,
    valor_mensal: mapped.valor,
    metodo_pagamento: 'Cartão de Crédito',
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    data_inicio_plano: periodStart,
    proxima_renovacao: periodEnd,
    atualizado_em: new Date().toISOString(),
  };

  if (status === 'inadimplente') {
    update.data_inadimplencia = new Date().toISOString();
    update.excluir_dados_em = new Date(Date.now() + 60 * 86400_000).toISOString();
  } else if (status === 'ativo') {
    update.data_inadimplencia = null;
    update.dias_inadimplente = 0;
    update.excluir_dados_em = null;
  }

  await getSupabase().from('assinaturas').update(update).eq('usuario_id', userId);
}

async function handleSubscriptionDeleted(subscription: any) {
  const userId = await findUserId(subscription);
  if (!userId) return;
  const periodEndSec = subscription.items?.data?.[0]?.current_period_end ?? subscription.current_period_end;
  const periodEnd = periodEndSec ? new Date(periodEndSec * 1000).toISOString() : null;
  await getSupabase().from('assinaturas').update({
    status: 'cancelado',
    cancel_at_period_end: true,
    proxima_renovacao: periodEnd,
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', userId);
}

async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;

  const { data: sub } = await getSupabase()
    .from('assinaturas')
    .select('usuario_id, plano')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  if (!sub) return;

  const valor = invoice.amount_paid ? Number(invoice.amount_paid) / 100 : 0;

  await getSupabase().from('pagamentos').insert({
    usuario_id: (sub as any).usuario_id,
    plano: (sub as any).plano ?? 'desconhecido',
    valor,
    metodo: 'Cartão de Crédito',
    status: 'pago',
    data_pagamento: invoice.status_transitions?.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000).toISOString()
      : new Date().toISOString(),
  });

  await getSupabase().from('assinaturas').update({
    status: 'ativo',
    data_ultima_cobranca: new Date().toISOString(),
    data_inadimplencia: null,
    dias_inadimplente: 0,
    excluir_dados_em: null,
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', (sub as any).usuario_id);
}

async function handleInvoiceFailed(invoice: any) {
  const subscriptionId = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  if (!subscriptionId) return;
  const { data: sub } = await getSupabase()
    .from('assinaturas')
    .select('usuario_id, plano')
    .eq('stripe_subscription_id', subscriptionId)
    .maybeSingle();
  if (!sub) return;

  const valor = invoice.amount_due ? Number(invoice.amount_due) / 100 : 0;

  await getSupabase().from('pagamentos').insert({
    usuario_id: (sub as any).usuario_id,
    plano: (sub as any).plano ?? 'desconhecido',
    valor,
    metodo: 'Cartão de Crédito',
    status: 'falhou',
    data_pagamento: new Date().toISOString(),
  });

  await getSupabase().from('assinaturas').update({
    status: 'inadimplente',
    data_inadimplencia: new Date().toISOString(),
    excluir_dados_em: new Date(Date.now() + 60 * 86400_000).toISOString(),
    atualizado_em: new Date().toISOString(),
  }).eq('usuario_id', (sub as any).usuario_id);
}

async function handleWebhook(req: Request, env: StripeEnv) {
  const event = await verifyWebhook(req, env);
  console.log('Stripe webhook event:', event.type, env);

  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionUpsert(event.data.object);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object);
      break;
    case 'invoice.payment_succeeded':
    case 'invoice.paid':
      await handleInvoicePaid(event.data.object);
      await rewardReferrer(event.data.object, env);
      break;

    case 'invoice.payment_failed':
      await handleInvoiceFailed(event.data.object);
      break;
    default:
      console.log('Unhandled event:', event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook received with invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    await handleWebhook(req, rawEnv as StripeEnv);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("Webhook error:", e);
    return new Response(JSON.stringify({ received: false, error: String(e) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

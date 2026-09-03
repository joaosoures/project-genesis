import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const VALOR_OURO_BRL = 28.5;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: aErr } = await userClient.auth.getClaims(token);
    if (aErr || !claims?.claims) throw new Error('Unauthorized');
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const env: StripeEnv = body?.environment === 'live' ? 'live' : 'sandbox';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Stats
    const { data: indicacoes } = await admin
      .from('indicacoes')
      .select('id, status, convertido_em, recompensado_em, valor_credito_brl, convidado_id, criado_em')
      .eq('indicador_id', userId)
      .order('criado_em', { ascending: false });

    const lista = (indicacoes ?? []) as any[];
    const totalConvites = lista.length;
    const totalPagantes = lista.filter(i => i.status === 'recompensado').length;
    const totalCreditadoBrl = lista
      .filter(i => i.status === 'recompensado')
      .reduce((sum, i) => sum + Number(i.valor_credito_brl || 0), 0);

    // Saldo Stripe
    let saldoBrl = 0;
    const { data: ass } = await admin
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('usuario_id', userId)
      .maybeSingle();
    const customerId = (ass as any)?.stripe_customer_id;
    if (customerId) {
      try {
        const stripe = createStripeClient(env);
        const c: any = await stripe.customers.retrieve(customerId);
        if (c && !c.deleted && typeof c.balance === 'number') {
          // balance é negativo quando há crédito; convertemos para positivo em reais
          saldoBrl = c.balance < 0 ? Math.abs(c.balance) / 100 : 0;
        }
      } catch (e) {
        console.warn('Stripe retrieve failed', e);
      }
    }

    // Histórico mascarado
    const convidadoIds = lista.map(i => i.convidado_id);
    let emailsMap: Record<string, string> = {};
    if (convidadoIds.length) {
      const { data: profs } = await admin
        .from('profiles')
        .select('id, email')
        .in('id', convidadoIds);
      for (const p of (profs ?? []) as any[]) {
        const e = (p.email as string) || '';
        const [user, dom] = e.split('@');
        emailsMap[p.id] = user ? `${user.slice(0, 3)}***@${dom ?? '...'}` : '***';
      }
    }

    const historico = lista.slice(0, 10).map(i => ({
      id: i.id,
      status: i.status,
      email: emailsMap[i.convidado_id] || '***',
      criado_em: i.criado_em,
      recompensado_em: i.recompensado_em,
    }));

    return new Response(JSON.stringify({
      saldo_brl: saldoBrl,
      meses_gratis: Math.floor(saldoBrl / VALOR_OURO_BRL),
      saldo_proximo_mes_brl: saldoBrl % VALOR_OURO_BRL,
      valor_ouro_brl: VALOR_OURO_BRL,
      total_convites: totalConvites,
      total_pagantes: totalPagantes,
      total_creditado_brl: totalCreditadoBrl,
      historico,
    }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('get-referral-balance error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

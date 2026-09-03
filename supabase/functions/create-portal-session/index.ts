import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Unauthorized');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) throw new Error('Unauthorized');
    const userId = claims.claims.sub;

    const { returnUrl, environment } = await req.json();
    const env: StripeEnv = environment === 'live' ? 'live' : 'sandbox';

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: sub } = await admin
      .from('assinaturas')
      .select('stripe_customer_id')
      .eq('usuario_id', userId)
      .maybeSingle();
    let customerId = (sub as any)?.stripe_customer_id as string | null;

    const stripe = createStripeClient(env);

    // Validate stored customer exists in current Stripe environment
    if (customerId) {
      try {
        const c = await stripe.customers.retrieve(customerId);
        if ((c as any)?.deleted) customerId = null;
      } catch {
        customerId = null;
      }
    }

    // Fallback: search Stripe by userId metadata, then by email
    if (!customerId) {
      if (/^[a-zA-Z0-9_-]+$/.test(userId)) {
        const found = await stripe.customers.search({
          query: `metadata['userId']:'${userId}'`,
          limit: 1,
        });
        if (found.data.length) customerId = found.data[0].id;
      }
      if (!customerId) {
        const { data: { user } } = await admin.auth.admin.getUserById(userId);
        if (user?.email) {
          const list = await stripe.customers.list({ email: user.email, limit: 1 });
          if (list.data.length) customerId = list.data[0].id;
        }
      }
      if (customerId) {
        await admin.from('assinaturas').update({ stripe_customer_id: customerId }).eq('usuario_id', userId);
      }
    }

    // Last resort: create a new Stripe customer so the portal can open
    if (!customerId) {
      const { data: { user } } = await admin.auth.admin.getUserById(userId);
      const created = await stripe.customers.create({
        email: user?.email ?? undefined,
        metadata: { userId },
      });
      customerId = created.id;
      await admin.from('assinaturas').update({ stripe_customer_id: customerId }).eq('usuario_id', userId);
    }

    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      ...(returnUrl && { return_url: returnUrl }),
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('create-portal-session error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

import { createClient } from "npm:@supabase/supabase-js@2";

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

    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: aErr } = await userClient.auth.getClaims(token);
    if (aErr || !claims?.claims) throw new Error('Unauthorized');
    const userId = claims.claims.sub as string;
    const userEmail = (claims.claims.email as string | undefined)?.toLowerCase();

    const { referralCode } = await req.json();
    if (!referralCode || typeof referralCode !== 'string') {
      return new Response(JSON.stringify({ ok: false, reason: 'no_code' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const code = referralCode.trim().toUpperCase();
    if (!/^OQM-[A-Z0-9]{4,12}$/.test(code)) {
      return new Response(JSON.stringify({ ok: false, reason: 'invalid_code' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Buscar indicador pelo código
    const { data: indicador } = await admin
      .from('profiles')
      .select('id, email, referral_code')
      .eq('referral_code', code)
      .maybeSingle();

    if (!indicador) {
      return new Response(JSON.stringify({ ok: false, reason: 'code_not_found' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if ((indicador as any).id === userId) {
      return new Response(JSON.stringify({ ok: false, reason: 'self_referral' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (userEmail && (indicador as any).email?.toLowerCase() === userEmail) {
      return new Response(JSON.stringify({ ok: false, reason: 'same_email' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verifica se já existe indicação para esse convidado
    const { data: existing } = await admin
      .from('indicacoes')
      .select('id')
      .eq('convidado_id', userId)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ ok: false, reason: 'already_referred' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validação Anti-Fraude: Mesma rede (IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null;
    if (ip) {
      const { data: sameIp } = await admin
        .from('indicacoes')
        .select('id')
        .eq('ip_signup', ip)
        .neq('indicador_id', (indicador as any).id) // Permite IPs diferentes se for o mesmo indicador (ex: lan house), mas bloqueia se muitos convidados diferentes vierem do mesmo IP para o mesmo indicador em curto tempo
        .limit(1)
        .maybeSingle();
      
      // Nota: Seremos conservadores. Se houver mais de 3 convidados do mesmo IP para o mesmo indicador, bloqueamos.
      const { count: ipCount } = await admin
        .from('indicacoes')
        .select('id', { count: 'exact', head: true })
        .eq('indicador_id', (indicador as any).id)
        .eq('ip_signup', ip);

      if ((ipCount || 0) >= 3) {
        return new Response(JSON.stringify({ ok: false, reason: 'fraud_detected_ip_limit' }), {
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    await admin.from('indicacoes').insert({
      indicador_id: (indicador as any).id,
      convidado_id: userId,
      status: 'pendente',
      ip_signup: ip,
    });

    await admin.from('profiles').update({ referred_by: (indicador as any).id }).eq('id', userId);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    console.error('register-referral error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

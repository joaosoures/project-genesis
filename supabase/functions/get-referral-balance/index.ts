import { createClient } from "npm:@supabase/supabase-js@2";
const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const VALOR_OURO_BRL = 28.5;
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const auth = req.headers.get("Authorization"); if (!auth) return json({ error: "Unauthorized" }, 401);
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: claims, error } = await client.auth.getClaims(auth.replace(/^Bearer\s+/i, "")); if (error || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: indicacoes } = await admin.from("indicacoes").select("id,status,convertido_em,recompensado_em,valor_credito_brl,convidado_id,criado_em").eq("indicador_id", claims.claims.sub).order("criado_em", { ascending: false });
    const lista = (indicacoes ?? []) as any[]; const saldoBrl = lista.filter((i) => i.status === "recompensado").reduce((sum, i) => sum + Number(i.valor_credito_brl || 0), 0);
    const ids = lista.map((i) => i.convidado_id); const emails: Record<string, string> = {};
    if (ids.length) { const { data: profiles } = await admin.from("profiles").select("id,email").in("id", ids); for (const profile of profiles ?? []) { const [name, domain] = String(profile.email ?? "").split("@"); emails[profile.id] = name ? `${name.slice(0, 3)}***@${domain ?? "..."}` : "***"; } }
    return json({ saldo_brl: saldoBrl, meses_gratis: Math.floor(saldoBrl / VALOR_OURO_BRL), saldo_proximo_mes_brl: saldoBrl % VALOR_OURO_BRL, valor_ouro_brl: VALOR_OURO_BRL, total_convites: lista.length, total_pagantes: lista.filter((i) => i.status === "recompensado").length, total_creditado_brl: saldoBrl, historico: lista.slice(0, 10).map((i) => ({ id: i.id, status: i.status, email: emails[i.convidado_id] || "***", criado_em: i.criado_em, recompensado_em: i.recompensado_em })) });
  } catch (error) { return json({ error: error instanceof Error ? error.message : "Erro inesperado" }, 400); }
});

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._/-]{1,119}$/i;

async function getAdmin(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return { service, user: null, caller: null };
  const { data: { user } } = await service.auth.getUser(token);
  if (!user) return { service, user: null, caller: null };
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: isAdmin } = await caller.rpc("is_admin");
  return { service, user: isAdmin ? user : null, caller };
}

async function testModel(model: string, apiKey: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://oqmed.com.br", "X-Title": "OQMed" },
    body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply only with OK." }], max_tokens: 3 }),
  });
  if (!response.ok) return false;
  const data = await response.json();
  return Boolean(data?.choices?.[0]);
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (!["GET", "POST"].includes(req.method)) return json({ error: "Método inválido" }, 405);
  try {
    const { service, user } = await getAdmin(req);
    if (!user) return json({ error: "Acesso restrito a administradores." }, 403);
    const { data: setting } = await service.from("ai_model_settings").select("model").eq("setting_key", "castigo").maybeSingle();
    const current = setting?.model ?? "openai/gpt-6-luna";
    if (req.method === "GET") return json({ model: current });
    const body = await req.json();
    const model = typeof body?.model === "string" ? body.model.trim() : "";
    if (!model) return json({ model: current });
    if (!MODEL_PATTERN.test(model)) return json({ error: "Informe um identificador de modelo válido, como provider/model." }, 400);
    const apiKey = Deno.env.get("ADM_OQIA_KEY")?.trim();
    if (!apiKey) return json({ error: "Serviço de IA indisponível no momento." }, 503);
    const valid = await testModel(model, apiKey);
    if (!valid) return json({ error: "O modelo não respondeu pela API configurada." }, 422);
    const { error } = await service.from("ai_model_settings").upsert({ setting_key: "castigo", model, updated_at: new Date().toISOString(), updated_by: user.id });
    if (error) return json({ error: "Não foi possível salvar o modelo." }, 500);
    return json({ model, valid: true });
  } catch (error) {
    console.error("[admin-castigo-model] falha", error instanceof Error ? error.message : error);
    return json({ error: "Não foi possível validar o modelo agora." }, 500);
  }
});

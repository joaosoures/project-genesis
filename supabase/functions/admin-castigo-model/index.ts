import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._/-]{1,119}$/i;
const EDITORIAL_KEY = "geracao_castigo_filhas";
const MAX_EDITORIAL_LENGTH = 12000;

async function getAdmin(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return { service, user: null };
  const { data: { user } } = await service.auth.getUser(token);
  if (!user) return { service, user: null };
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: isAdmin } = await caller.rpc("is_admin");
  return { service, user: isAdmin ? user : null };
}

async function testModel(model: string, apiKey: string) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}`, "HTTP-Referer": "https://oqmed.com.br", "X-Title": "OQMed" }, body: JSON.stringify({ model, messages: [{ role: "user", content: "Reply only with OK." }], max_tokens: 3 }) });
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
    const [{ data: setting }, { data: editorial }] = await Promise.all([
      service.from("ai_model_settings").select("model").eq("setting_key", "castigo").maybeSingle(),
      service.from("ia_prompts").select("prompt").eq("chave", EDITORIAL_KEY).maybeSingle(),
    ]);
    const currentModel = setting?.model ?? "openai/gpt-6-luna";
    const currentEditorial = editorial?.prompt ?? "";
    if (req.method === "GET") return json({ model: currentModel, editorialPrompt: currentEditorial });
    const body = await req.json();
    if (body?.action === "get") return json({ model: currentModel, editorialPrompt: currentEditorial });
    const model = typeof body?.model === "string" ? body.model.trim() : "";
    const hasModel = Boolean(model);
    const hasEditorial = Object.prototype.hasOwnProperty.call(body ?? {}, "editorialPrompt");
    const editorialPrompt = hasEditorial && typeof body.editorialPrompt === "string" ? body.editorialPrompt.trim() : currentEditorial;
    if (hasEditorial && (typeof body.editorialPrompt !== "string" || !editorialPrompt || editorialPrompt.length > MAX_EDITORIAL_LENGTH)) return json({ error: "A diretriz editorial deve ser um texto não vazio de até 12.000 caracteres." }, 400);
    if (!hasModel && !hasEditorial) return json({ model: currentModel, editorialPrompt: currentEditorial });
    if (hasModel) {
      if (!MODEL_PATTERN.test(model)) return json({ error: "Informe um identificador de modelo válido, como provider/model." }, 400);
      const apiKey = Deno.env.get("ADM_OQIA_KEY")?.trim();
      if (!apiKey) return json({ error: "Serviço de IA indisponível no momento." }, 503);
      if (!await testModel(model, apiKey)) return json({ error: "O modelo não respondeu pela API configurada." }, 422);
      const { error } = await service.from("ai_model_settings").upsert({ setting_key: "castigo", model, updated_at: new Date().toISOString(), updated_by: user.id });
      if (error) return json({ error: "Não foi possível salvar o modelo." }, 500);
    }
    if (hasEditorial) {
      const { error } = await service.from("ia_prompts").upsert({ chave: EDITORIAL_KEY, prompt: editorialPrompt, atualizado_em: new Date().toISOString(), atualizado_por: user.id }, { onConflict: "chave" });
      if (error) return json({ error: "Não foi possível salvar as diretrizes editoriais." }, 500);
    }
    return json({ model: hasModel ? model : currentModel, editorialPrompt, valid: true });
  } catch (error) {
    console.error("[admin-castigo-model] falha", error instanceof Error ? error.message : error);
    return json({ error: "Não foi possível salvar a configuração agora." }, 500);
  }
});

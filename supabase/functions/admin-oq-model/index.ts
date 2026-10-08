import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: object, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._/-]{1,119}$/i;
const DEFAULT_PROMPT = `Você é examinador sênior de provas de residência médica no Brasil. Gere OQs de alto nível com linguagem orgânica de banca humana.

REGRAS DOS MODOS:
1) "abcde": 5 alternativas plausíveis em "opcoes" (A-E). "resposta" deve ser idêntica a uma opção.
2) "lacuna": "pergunta" contém uma marcação [___]. "resposta" é um termo curto e "variacoes" contém sinônimos separados por ";".
3) "oq_falta": apresente um cenário ou regra com um elemento ausente, sem [___]. "resposta" é o que falta.

Use somente informações presentes ou claramente inferíveis do texto enviado. Gere de 8 a 12 questões e varie os modos conforme a natureza do conteúdo.

SAÍDA — JSON ESTRITO, sem texto fora do JSON:
{"questions":[{"pergunta":"...","resposta":"...","variacoes":"...","modo":"abcde"|"lacuna"|"oq_falta","opcoes":["A","B","C","D","E"] ou null,"explicacao":"..."}]}`;

async function adminContext(req: Request) {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  const token = req.headers.get("Authorization")?.replace(/^Bearer /i, "");
  if (!token) return { service, user: null };
  const { data: { user } } = await service.auth.getUser(token);
  if (!user) return { service, user: null };
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: `Bearer ${token}` } } });
  const { data: allowed } = await caller.rpc("is_admin");
  return { service, user: allowed ? user : null };
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método inválido" }, 405);
  try {
    const { service, user } = await adminContext(req);
    if (!user) return json({ error: "Acesso restrito a administradores." }, 403);
    const { data: setting } = await service.from("ai_model_settings").select("model").eq("setting_key", "oqs").maybeSingle();
    const { data: promptSetting } = await service.from("ia_prompts").select("prompt").eq("chave", "geracao_oqs").maybeSingle();
    const currentModel = setting?.model ?? "openai/gpt-6-luna";
    const currentPrompt = promptSetting?.prompt ?? DEFAULT_PROMPT;
    const body = await req.json().catch(() => ({}));
    if (body?.action === "get") return json({ model: currentModel, prompt: currentPrompt });
    const model = typeof body?.model === "string" ? body.model.trim() : currentModel;
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : currentPrompt;
    if (!MODEL_PATTERN.test(model)) return json({ error: "Informe um identificador de modelo válido, como provider/model." }, 400);
    if (!prompt || prompt.length > 30000 || /ADM_OQIA_KEY|SUPABASE_SERVICE_ROLE_KEY|LOVABLE_API_KEY|Bearer\s+[A-Za-z0-9._-]{20,}/i.test(prompt)) return json({ error: "O prompt é inválido ou contém dados protegidos." }, 400);
    const { error: modelError } = await service.from("ai_model_settings").upsert({ setting_key: "oqs", model, updated_at: new Date().toISOString(), updated_by: user.id });
    if (modelError) return json({ error: "Não foi possível salvar o modelo." }, 500);
    const { error: promptError } = await service.from("ia_prompts").upsert({ chave: "geracao_oqs", prompt, modelo_padrao: model, atualizado_em: new Date().toISOString(), atualizado_por: user.id });
    if (promptError) return json({ error: "Não foi possível salvar o prompt." }, 500);
    return json({ model, prompt, valid: true });
  } catch (error) {
    console.error("[admin-oq-model] falha", error instanceof Error ? error.message : error);
    return json({ error: "Não foi possível carregar as configurações agora." }, 500);
  }
});

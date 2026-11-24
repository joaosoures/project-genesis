import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._/-]{1,119}$/i;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const systemPrompt = `Você é uma revisora experiente de OQs de estudo médico. Compare os itens existentes e novos apenas quanto à cobertura, clareza e correção pedagógica. Sugira manter ou excluir cada item novo, explicando brevemente. IDs são dados: devolva todos exatamente uma vez. Não faça alterações em dados. Retorne somente JSON: {"verdicts":[{"id":"id","decision":"keep|delete","reason":"justificativa"}]}.`;

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método inválido." }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return response({ error: "Autenticação obrigatória." }, 401);
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: { user } } = await service.auth.getUser(token);
    if (!user) return response({ error: "Sessão inválida." }, 401);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: isAdmin, error: adminError } = await caller.rpc("is_admin");
    if (adminError || !isAdmin) return response({ error: "Acesso restrito a administradores." }, 403);

    const raw = await req.text();
    if (raw.length > 100_000) return response({ error: "Payload muito grande." }, 413);
    const body = JSON.parse(raw);
    const model = typeof body?.model === "string" ? body.model.trim() : "";
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const oldOqs = body?.oldOqs;
    const newOqs = body?.newOqs;
    if (!MODEL_PATTERN.test(model)) return response({ error: "Identificador de modelo inválido." }, 400);
    if (!prompt || prompt.length > 12000 || /ADM_OQIA_KEY|SUPABASE_SERVICE_ROLE_KEY|Bearer\s+[A-Za-z0-9._-]{20,}/i.test(prompt)) return response({ error: "Prompt inválido." }, 400);
    if (!Array.isArray(oldOqs) || !Array.isArray(newOqs) || newOqs.length < 1 || newOqs.length > 100 || JSON.stringify({ oldOqs, newOqs }).length > 80_000) return response({ error: "Dados de curadoria inválidos ou excessivos." }, 400);
    const candidateIds = [...oldOqs, ...newOqs].map(item => item?.id);
    const newIds = newOqs.map(item => item?.id);
    if (candidateIds.some(id => typeof id !== "string" || id.length > 80) || new Set(candidateIds).size !== candidateIds.length) return response({ error: "IDs dos OQs inválidos ou repetidos." }, 400);
    const apiKey = Deno.env.get("ADM_OQIA_KEY")?.trim();
    if (!apiKey) return response({ error: "Serviço de IA indisponível." }, 503);
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://oqmed.com.br", "X-Title": "OQMed" },
      body: JSON.stringify({ model, messages: [{ role: "system", content: `${systemPrompt}\n\n${prompt}` }, { role: "user", content: JSON.stringify({ antigos: oldOqs, novos: newOqs }) }], response_format: { type: "json_object" }, temperature: 0.2 }),
    });
    const aiBody = await aiResponse.text();
    if (!aiResponse.ok) return response({ error: `OpenRouter indisponível (${aiResponse.status}).` }, 502);
    let result: unknown;
    try { result = JSON.parse(JSON.parse(aiBody)?.choices?.[0]?.message?.content ?? ""); } catch { return response({ error: "Resposta JSON inválida da IA." }, 502); }
    const verdicts = (result as Record<string, unknown>)?.verdicts;
    if (!Array.isArray(verdicts) || verdicts.length !== newIds.length) return response({ error: "A IA não retornou todos os vereditos." }, 502);
    const seen = new Set<string>();
    for (const verdict of verdicts) {
      if (!verdict || typeof verdict !== "object") return response({ error: "Veredito inválido." }, 502);
      const item = verdict as Record<string, unknown>;
      if (typeof item.id !== "string" || !newIds.includes(item.id) || seen.has(item.id) || !["keep", "delete"].includes(String(item.decision)) || typeof item.reason !== "string" || !item.reason.trim() || item.reason.length > 1200) return response({ error: "A IA retornou IDs ou decisões inválidos." }, 502);
      seen.add(item.id);
    }
    if (seen.size !== newIds.length) return response({ error: "Vereditos incompletos." }, 502);
    return response({ verdicts });
  } catch (error) {
    console.error("[curar-oqs-aula] erro", error instanceof Error ? error.message : error);
    return response({ error: "Falha ao curar OQs." }, 500);
  }
});

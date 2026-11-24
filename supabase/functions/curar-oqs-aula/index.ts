import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildJudgeSystemPrompt } from "../_shared/oqCuratorJudgePrompt.ts";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const MODEL_PATTERN = /^[a-z0-9][a-z0-9._/-]{1,119}$/i;
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
    const tituloTema = typeof body?.tituloTema === "string" ? body.tituloTema.trim() : "";
    const especialidade = typeof body?.especialidade === "string" ? body.especialidade.trim() : "";
    const oldOqs = body?.oldOqs;
    const newOqs = body?.newOqs;
    if (!MODEL_PATTERN.test(model)) return response({ error: "Identificador de modelo inválido." }, 400);
    if (!tituloTema || tituloTema.length > 500 || especialidade.length > 120) return response({ error: "Aula ou especialidade inválida." }, 400);
    if (!Array.isArray(oldOqs) || !Array.isArray(newOqs) || newOqs.length < 1 || newOqs.length > 100 || JSON.stringify({ oldOqs, newOqs }).length > 80_000) return response({ error: "Dados de curadoria inválidos ou excessivos." }, 400);
    const oldIds = oldOqs.map(item => item?.id);
    const newIds = newOqs.map(item => item?.temp_id);
    const allIds = [...oldIds, ...newIds];
    if (allIds.some(id => typeof id !== "string" || id.length > 80) || new Set(allIds).size !== allIds.length) return response({ error: "IDs dos OQs inválidos ou repetidos." }, 400);
    const apiKey = Deno.env.get("ADM_OQIA_KEY")?.trim();
    if (!apiKey) return response({ error: "Serviço de IA indisponível." }, 503);
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://oqmed.com.br", "X-Title": "OQMed" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: buildJudgeSystemPrompt(`${especialidade}|${tituloTema}`) },
          { role: "user", content: JSON.stringify({ titulo_tema: tituloTema, especialidade, oqs_antigos: oldOqs, oqs_novos: newOqs }) },
        ],
        response_format: { type: "json_object" },
        temperature: 0.1,
      }),
    });
    const aiBody = await aiResponse.text();
    if (!aiResponse.ok) return response({ error: `OpenRouter indisponível (${aiResponse.status}).` }, 502);
    let result: unknown;
    try { result = JSON.parse(JSON.parse(aiBody)?.choices?.[0]?.message?.content ?? ""); } catch { return response({ error: "Resposta JSON inválida da IA." }, 502); }
    const verdictsAntigos = (result as Record<string, unknown>)?.vereditos_antigos;
    const verdictsNovos = (result as Record<string, unknown>)?.vereditos_novos;
    if (!Array.isArray(verdictsAntigos) || verdictsAntigos.length !== oldIds.length || !Array.isArray(verdictsNovos) || verdictsNovos.length !== newIds.length) return response({ error: "A IA não retornou todos os vereditos." }, 502);
    const validateVerdicts = (verdicts: unknown[], expectedIds: unknown[], idKey: "id" | "temp_id") => {
      const seen = new Set<string>();
      for (const verdict of verdicts) {
        if (!verdict || typeof verdict !== "object") return false;
        const item = verdict as Record<string, unknown>;
        if (typeof item[idKey] !== "string" || !expectedIds.includes(item[idKey]) || seen.has(item[idKey]) || !["MANTER", "EXCLUIR"].includes(String(item.decisao)) || typeof item.motivo !== "string" || !item.motivo.trim() || item.motivo.length > 1200) return false;
        seen.add(item[idKey] as string);
      }
      return seen.size === expectedIds.length;
    };
    if (!validateVerdicts(verdictsAntigos, oldIds, "id") || !validateVerdicts(verdictsNovos, newIds, "temp_id")) return response({ error: "A IA retornou IDs ou decisões inválidos." }, 502);
    return response({ vereditos_antigos: verdictsAntigos, vereditos_novos: verdictsNovos });
  } catch (error) {
    console.error("[curar-oqs-aula] erro", error instanceof Error ? error.message : error);
    return response({ error: "Falha ao curar OQs." }, 500);
  }
});

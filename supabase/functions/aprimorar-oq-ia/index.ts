import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const MAX_BODY = 30000;
const MAX_TEXT = 6000;
const MODES = new Set(["abcde", "lacuna", "oq_falta"]);
const ROOT_KEYS = ["comando", "alternativas", "variações", "explicacao"];

const SYSTEM_PROMPT = `Você é médico e professor especialista em provas de residência médica no Brasil. Aprimore uma questão OQ em português do Brasil sem inventar fatos clínicos, doses ou critérios que não estejam no conteúdo recebido. Preserve a intenção pedagógica, corrija ambiguidades, torne o comando claro, mantenha alternativas plausíveis e produza uma explicação didática e clinicamente coerente.

Retorne SOMENTE um objeto JSON com exatamente estas quatro chaves: comando, alternativas, variações, explicacao.
- modo abcde: alternativas deve ter exatamente a,b,c,d,e,correta. Todas as cinco alternativas devem ser não vazias e correta deve ser uma letra A-E. Não altere variações.
- modo lacuna: alternativas deve ser {resposta} e variações deve ser {var_1}. A resposta deve ser não vazia e var_1 deve conter pelo menos três respostas aceitas separadas por ponto e vírgula.
- modo oq_falta: alternativas deve ser {itens:[{resposta}, ...]} com exatamente a mesma quantidade e ordem dos itens recebidos. variações deve conter var_1 até var_5 somente para os itens existentes; cada valor deve conter pelo menos três variações separadas por ponto e vírgula.
Use strings curtas quando forem respostas, mantenha todas as chaves internas permitidas e não inclua markdown, comentários ou texto extra.`;

type Mode = "abcde" | "lacuna" | "oq_falta";
type Result = { comando: string; alternativas: Record<string, unknown>; "variações": Record<string, unknown> | null; explicacao: string };

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});
const text = (value: unknown, field: string, max = MAX_TEXT) => {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`${field} inválido.`);
  return value.trim();
};
const exactKeys = (value: unknown, keys: string[]) => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const actual = Object.keys(value as Record<string, unknown>).sort();
  return actual.length === keys.length && actual.every((key, index) => key === [...keys].sort()[index]);
};

function validateResult(raw: unknown, mode: Mode, itemCount: number): Result {
  if (!exactKeys(raw, ROOT_KEYS)) throw new Error("A resposta da IA possui estrutura inválida.");
  const value = raw as Record<string, unknown>;
  const comando = text(value.comando, "comando");
  const explicacao = text(value.explicacao, "explicacao", 12000);
  if (!value.alternativas || typeof value.alternativas !== "object" || Array.isArray(value.alternativas)) throw new Error("Alternativas inválidas.");
  const alternativas = value.alternativas as Record<string, unknown>;
  const variacoes = value["variações"];

  if (mode === "abcde") {
    if (!exactKeys(alternativas, ["a", "b", "c", "d", "e", "correta"])) throw new Error("ABCDE exige cinco alternativas e um gabarito.");
    for (const letter of ["a", "b", "c", "d", "e"]) text(alternativas[letter], `alternativa ${letter}`, 2000);
    const correta = text(alternativas.correta, "correta", 1).toUpperCase();
    if (!["A", "B", "C", "D", "E"].includes(correta)) throw new Error("Gabarito ABCDE inválido.");
    if (variacoes !== null && !exactKeys(variacoes, [])) throw new Error("ABCDE não deve alterar variações.");
    return { comando, alternativas: { a: text(alternativas.a, "a", 2000), b: text(alternativas.b, "b", 2000), c: text(alternativas.c, "c", 2000), d: text(alternativas.d, "d", 2000), e: text(alternativas.e, "e", 2000), correta }, "variações": variacoes as Record<string, unknown> | null, explicacao };
  }

  if (mode === "lacuna") {
    if (!exactKeys(alternativas, ["resposta"]) || !exactKeys(variacoes, ["var_1"])) throw new Error("Lacuna exige resposta e variações.");
    const resposta = text(alternativas.resposta, "resposta", 1000);
    const var1 = text((variacoes as Record<string, unknown>).var_1, "var_1", 2000);
    if (var1.split(";").map((item) => item.trim()).filter(Boolean).length < 3) throw new Error("Lacuna exige pelo menos três variações.");
    return { comando, alternativas: { resposta }, "variações": { var_1: var1 }, explicacao };
  }

  if (!Array.isArray(alternativas.itens) || alternativas.itens.length !== itemCount || itemCount < 1 || itemCount > 5) throw new Error("A quantidade de itens não corresponde ao OQ atual.");
  if (!exactKeys(variacoes, Array.from({ length: itemCount }, (_, index) => `var_${index + 1}`))) throw new Error("Variações do OQ Falta inválidas.");
  const itens = alternativas.itens.map((item) => {
    if (!exactKeys(item, ["resposta"])) throw new Error("Item do OQ Falta inválido.");
    return { resposta: text((item as Record<string, unknown>).resposta, "resposta", 1000) };
  });
  const normalizedVars: Record<string, string> = {};
  for (let index = 1; index <= itemCount; index += 1) {
    const value = text((variacoes as Record<string, unknown>)[`var_${index}`], `var_${index}`, 2000);
    if (value.split(";").map((item) => item.trim()).filter(Boolean).length < 3) throw new Error(`var_${index} exige pelo menos três variações.`);
    normalizedVars[`var_${index}`] = value;
  }
  return { comando, alternativas: { itens }, "variações": normalizedVars, explicacao };
}

function parseJson(content: string) {
  const clean = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(clean);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return response({ error: "Método inválido." }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") ?? "";
    const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
    if (!token) return response({ error: "Autenticação obrigatória." }, 401);
    const { data: { user } } = await service.auth.getUser(token);
    if (!user) return response({ error: "Sessão inválida." }, 401);
    const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: `Bearer ${token}` } } });
    const { data: isAdmin, error: adminError } = await caller.rpc("is_admin");
    if (adminError || !isAdmin) return response({ error: "Acesso restrito a administradores." }, 403);

    const rawBody = await req.text();
    if (rawBody.length > MAX_BODY) return response({ error: "Payload muito grande." }, 413);
    let body: Record<string, unknown>;
    try { body = JSON.parse(rawBody); } catch { return response({ error: "JSON inválido." }, 400); }
    if (!exactKeys(body, ["modo", "comando", "alternativas", "variações", "explicacao"])) return response({ error: "Payload pedagógico inválido." }, 400);
    const mode = body.modo;
    if (typeof mode !== "string" || !MODES.has(mode)) return response({ error: "Modo não suportado." }, 400);
    const currentCommand = text(body.comando, "comando");
    const currentExplanation = text(body.explicacao, "explicacao", 12000);
    const currentAlternativas = body.alternativas;
    const currentVariacoes = body["variações"];
    let itemCount = 0;
    if (mode === "oq_falta") {
      if (!currentAlternativas || typeof currentAlternativas !== "object" || !Array.isArray((currentAlternativas as Record<string, unknown>).itens)) return response({ error: "Itens atuais inválidos." }, 400);
      itemCount = ((currentAlternativas as Record<string, unknown>).itens as unknown[]).length;
    }
    const apiKey = Deno.env.get("ADM_OQIA_KEY")?.trim();
    if (!apiKey) return response({ error: "Serviço de IA indisponível." }, 503);
    const { data: setting } = await service.from("ai_model_settings").select("model").eq("setting_key", "oqs").maybeSingle();
    const configuredModel = typeof setting?.model === "string" && /^[a-z0-9][a-z0-9._/-]{1,119}$/i.test(setting.model) ? setting.model : "openai/gpt-6-luna";
    const userPrompt = JSON.stringify({ modo: mode, comando: currentCommand, alternativas: currentAlternativas, "variações": currentVariacoes, explicacao: currentExplanation });
    const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: configuredModel, messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }], response_format: { type: "json_object" }, temperature: 0.35 }),
    });
    const aiBody = await aiResponse.text();
    if (!aiResponse.ok) return response({ error: "O provedor de IA recusou a solicitação." }, 502);
    let content: string;
    try { content = JSON.parse(aiBody)?.choices?.[0]?.message?.content ?? ""; } catch { return response({ error: "Resposta inválida do provedor de IA." }, 502); }
    let result: Result;
    try { result = validateResult(parseJson(content), mode as Mode, itemCount); } catch (error) { return response({ error: error instanceof Error ? error.message : "Resposta da IA inválida." }, 502); }
    return response(result);
  } catch (error) {
    console.error("[aprimorar-oq-ia] erro interno", error instanceof Error ? error.message : error);
    return response({ error: "Erro interno ao aprimorar o OQ." }, 500);
  }
});

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_INPUT_CHARS = 20000;

interface ApiKey {
  id: string;
  provider: string;
  key_value: string;
  label: string;
}

type AiCallResult =
  | { ok: true; content: string }
  | { ok: false; status: number; body: string };

function normalizeProvider(provider: string) {
  return (provider || "lovable_gateway").toLowerCase();
}

async function requestQuestions(
  keyInfo: ApiKey,
  systemPrompt: string,
  userPrompt: string,
): Promise<AiCallResult> {
  const provider = normalizeProvider(keyInfo.provider);
  const apiKey = keyInfo.key_value.trim();

  if (provider === "google") {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4 },
      }),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body };
    const data = JSON.parse(body);
    const content = data?.candidates?.[0]?.content?.parts
      ?.map((part: any) => part?.text ?? "").join("") ?? "";
    return { ok: true, content };
  }

  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      }),
    });
    const body = await res.text();
    if (!res.ok) return { ok: false, status: res.status, body };
    const data = JSON.parse(body);
    const content = data?.content
      ?.map((part: any) => part?.type === "text" ? part?.text ?? "" : "").join("") ?? "";
    return { ok: true, content };
  }

  let endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
  let model = "google/gemini-2.5-flash";
  if (provider === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    model = "gpt-4o-mini";
  }

  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    }),
  });
  const body = await res.text();
  if (!res.ok) return { ok: false, status: res.status, body };
  const data = JSON.parse(body);
  return { ok: true, content: data.choices?.[0]?.message?.content ?? "" };
}

const SYSTEM_PROMPT = `Você é examinador sênior de provas de residência médica no Brasil (padrão ENAMED/ENARE). Gere OQs de alto nível com linguagem orgânica de banca humana.

REGRAS DOS 3 MODOS (preserve EXATAMENTE para o app funcionar):
1) "abcde": 5 alternativas plausíveis em "opcoes" (A-E). "resposta" = string idêntica a uma das opções. Sem "todas as anteriores".
2) "lacuna": "pergunta" contém UMA marcação [___]. "resposta" = termo curto (1-3 palavras). "variacoes" = sinônimos/siglas separados por ";".
3) "oq_falta": cenário/regra com UM elemento ausente, SEM [___]. "resposta" = o que falta (1-3 palavras). "variacoes" = sinônimos separados por ";".

QUALIDADE OBRIGATÓRIA:
- Use SOMENTE informações presentes ou claramente inferíveis do texto enviado. Não invente doses/critérios.
- Varie as aberturas (proibido começar mais de uma questão com "Paciente, X anos..."). Use queixa direta, achado, contexto epidemiológico, evolução.
- Semiologia descritiva: descreva a manobra/achado em vez de nomear o sinal.
- Distratores plausíveis: diagnósticos diferenciais reais, drogas da mesma classe ou condutas corretas em cenário vizinho.
- Inclua ruído estratégico (comorbidades, alergia, gestação) quando contraindicar a conduta óbvia.
- Explicação: 3-6 linhas, prosa clínica, justificando o gabarito e pontuando por que cada distrator falha (sem bullets nem seções "dica").

DISTRIBUIÇÃO: gere 8 a 12 questões variando os 3 modos conforme a natureza do conteúdo (memorização → lacuna; padrão/critério → oq_falta; raciocínio/conduta → abcde).

SAÍDA — JSON ESTRITO, sem texto fora do JSON:
{
  "questions": [
    {
      "pergunta": "...",
      "resposta": "...",
      "variacoes": "...",
      "modo": "abcde" | "lacuna" | "oq_falta",
      "opcoes": ["A","B","C","D","E"] (apenas em abcde; nos outros modos use null),
      "explicacao": "..."
    }
  ]
}`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { text, fileName, specialty } = await req.json();

    if (!text || typeof text !== "string" || text.length < 200) {
      return new Response(
        JSON.stringify({ error: "Cole pelo menos 200 caracteres do resumo.", code: "CONTENT_TOO_SHORT" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (text.length > MAX_INPUT_CHARS) {
      return new Response(
        JSON.stringify({
          error: `Texto excede o limite de ${MAX_INPUT_CHARS.toLocaleString("pt-BR")} caracteres. Reduza para gerar.`,
          code: "CONTENT_TOO_LONG",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const keysToTry: ApiKey[] = [];
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      keysToTry.push({
        id: "default_lovable",
        provider: "lovable_gateway",
        key_value: LOVABLE_API_KEY,
        label: "Padrão Lovable",
      });
    }

    const { data: dbKeys } = await supabase
      .from("api_keys_pool")
      .select("id, provider, key_value, label")
      .eq("is_active", true)
      .order("priority", { ascending: true });
    if (dbKeys) keysToTry.push(...dbKeys);

    if (keysToTry.length === 0) {
      return new Response(
        JSON.stringify({
          error: "O serviço de IA está temporariamente indisponível (sem chaves configuradas).",
          code: "AI_KEY_MISSING",
        }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userPrompt = `Especialidade: ${specialty}\nBaralho: ${fileName}\n\nGere de 8 a 12 OQs com base estritamente no conteúdo abaixo:\n\n${text}`;

    let lastError: any = null;

    for (const keyInfo of keysToTry) {
      console.log(`[gerar-oqs-ia] tentando chave: ${keyInfo.label} (${keyInfo.provider})`);
      try {
        const aiRes = await requestQuestions(keyInfo, SYSTEM_PROMPT, userPrompt);

        if (aiRes.ok) {
          let result: any;
          try { result = JSON.parse(aiRes.content); }
          catch {
            console.error(`[gerar-oqs-ia] chave ${keyInfo.label} retornou JSON inválido`);
            continue;
          }

          const raw = result.questions || result.oqs || (Array.isArray(result) ? result : []);
          const validated = (Array.isArray(raw) ? raw : []).filter((q: any) => {
            if (!q?.pergunta || !q?.resposta || !q?.modo) return false;
            return true;
          }).map((q: any) => ({
            ...q,
            explicacao: q.explicacao || "Gerado por IA com base no material enviado.",
            variacoes: q.variacoes || "",
          }));

          if (validated.length > 0) {
            await supabase.from("api_keys_pool").update({
              last_used_at: new Date().toISOString(),
              error_count: 0,
            }).eq("id", keyInfo.id);

            return new Response(JSON.stringify({ questions: validated }), {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        } else {
          console.error(`[gerar-oqs-ia] chave ${keyInfo.label} falhou: ${aiRes.status}`, aiRes.body.slice(0, 200));
          if (keyInfo.id !== "default_lovable") {
            await supabase.rpc("increment_key_error", {
              _id: keyInfo.id,
              _error: `HTTP ${aiRes.status}: ${aiRes.body.slice(0, 100)}`,
            });
          }
          lastError = { status: aiRes.status, body: aiRes.body };
        }
      } catch (e: any) {
        console.error(`[gerar-oqs-ia] erro fatal na chave ${keyInfo.label}:`, e.message);
        lastError = { status: 500, body: e.message };
      }
    }

    return new Response(
      JSON.stringify({
        error: "Todas as tentativas de geração falharam. Tente novamente em alguns instantes.",
        code: "ALL_KEYS_FAILED",
        details: lastError,
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("[gerar-oqs-ia] erro crítico:", error?.message);
    return new Response(
      JSON.stringify({ error: "Erro interno no servidor.", code: "INTERNAL_ERROR" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

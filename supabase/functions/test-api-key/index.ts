import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function explainProviderError(provider: string, status: number, details: string) {
  const normalized = (provider || "lovable_gateway").toLowerCase();
  const lower = details.toLowerCase();

  if (normalized === "google") {
    if (status === 400 && (lower.includes("api key not valid") || lower.includes("api_key_invalid") || lower.includes("invalid"))) {
      return "Chave Google/Gemini inválida ou copiada de outro produto";
    }
    if (status === 403) return "Chave Google/Gemini sem permissão para a API Gemini";
    if (status === 429) return "Limite da chave Google/Gemini atingido";
    if (status === 404) return "Modelo Gemini indisponível para esta chave";
    return `Google/Gemini respondeu HTTP ${status}`;
  }

  if (normalized === "openai") {
    if (status === 401) return "Chave OpenAI inválida, expirada ou sem projeto ativo";
    if (status === 429) return "Limite/crédito OpenAI atingido";
    if (status === 402) return "Conta OpenAI sem créditos";
    return `OpenAI respondeu HTTP ${status}`;
  }

  if (normalized === "anthropic") {
    if (status === 401) return "Chave Anthropic/Claude inválida ou expirada";
    if (status === 403) return "Chave Anthropic/Claude sem permissão para o modelo";
    if (status === 429) return "Limite/crédito Anthropic/Claude atingido";
    return `Anthropic/Claude respondeu HTTP ${status}`;
  }

  if (status === 401) return "Chave Lovable Gateway inválida ou expirada";
  if (status === 429) return "Sem créditos / limite atingido";
  if (status === 402) return "Pagamento necessário (sem créditos)";
  return `HTTP ${status}`;
}

async function testProviderKey(provider: string, apiKey: string) {
  const normalized = (provider || "lovable_gateway").toLowerCase();
  const key = apiKey.trim();

  if (normalized === "google") {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`;
    return await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Teste de chave. Responda apenas OK." }] }],
        generationConfig: { maxOutputTokens: 5, temperature: 0 },
      }),
    });
  }

  if (normalized === "anthropic") {
    return await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-haiku-latest",
        max_tokens: 5,
        system: "Responda apenas com a palavra OK.",
        messages: [{ role: "user", content: "Teste de chave. Diga OK." }],
      }),
    });
  }

  let endpoint = "https://ai.gateway.lovable.dev/v1/chat/completions";
  let model = "google/gemini-2.5-flash";

  if (normalized === "openai") {
    endpoint = "https://api.openai.com/v1/chat/completions";
    model = "gpt-4o-mini";
  }

  return await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: "Responda apenas com a palavra OK." },
        { role: "user", content: "Teste de chave. Diga OK." },
      ],
      max_tokens: 5,
    }),
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    // Verifica autenticação
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ ok: false, error: "Não autenticado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica se é admin
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ ok: false, error: "Acesso negado" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { keyId } = await req.json();

    // Service-role client para ler key_value
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let provider: string;
    let apiKey: string;
    let label: string;

    if (keyId === "default_lovable") {
      apiKey = Deno.env.get("LOVABLE_API_KEY") ?? "";
      provider = "lovable_gateway";
      label = "Padrão Lovable";
      if (!apiKey) {
        return new Response(JSON.stringify({ ok: false, error: "LOVABLE_API_KEY não configurada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      const { data: keyRow, error: keyErr } = await admin
        .from("api_keys_pool")
        .select("provider, key_value, label")
        .eq("id", keyId)
        .maybeSingle();

      if (keyErr || !keyRow) {
        return new Response(JSON.stringify({ ok: false, error: "Chave não encontrada" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      provider = keyRow.provider;
      apiKey = keyRow.key_value;
      label = keyRow.label;
    }

    const started = Date.now();
    const testRes = await testProviderKey(provider, apiKey);

    const elapsed = Date.now() - started;

    if (!testRes.ok) {
      const errText = await testRes.text();
      // Registra erro no banco (se não for default)
      if (keyId !== "default_lovable") {
        await admin.from("api_keys_pool").update({
          last_error: `Teste falhou: HTTP ${testRes.status} - ${errText.slice(0, 120)}`,
          updated_at: new Date().toISOString(),
        }).eq("id", keyId);
      }
      return new Response(JSON.stringify({
        ok: false,
        status: testRes.status,
        error: explainProviderError(provider, testRes.status, errText),
        details: errText.slice(0, 200),
        elapsedMs: elapsed,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Sucesso - limpa contador de erros
    if (keyId !== "default_lovable") {
      await admin.from("api_keys_pool").update({
        error_count: 0,
        last_error: null,
        last_used_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", keyId);
    }

    return new Response(JSON.stringify({
      ok: true,
      provider,
      label,
      elapsedMs: elapsed,
      message: "Chave funcional e pronta para gerar OQs",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message ?? "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

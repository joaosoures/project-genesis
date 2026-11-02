import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const outputSchema = {
  type: "object", additionalProperties: false, required: ["oqs"],
  properties: {
    oqs: { type: "array", minItems: 1, maxItems: 3, items: {
      type: "object", additionalProperties: false,
      required: ["modo", "pergunta", "resposta", "opcoes", "variacoes", "explicacao", "aula_id"],
      properties: {
        modo: { type: "string", enum: ["lacuna", "oq_falta"] }, pergunta: { type: "string", minLength: 10 },
        resposta: { type: "string", minLength: 2 }, opcoes: { type: "array", minItems: 0, maxItems: 5, items: { type: "string" } },
        variacoes: { type: "array", maxItems: 8, items: { type: "string" } }, explicacao: { type: "string", minLength: 10 }, aula_id: { type: ["string", "null"] }
      }
    } }
  }
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";

function normalizeOq(raw: any) {
  const modo = raw?.modo;
  const pergunta = text(raw?.pergunta ?? raw?.comando);
  const legacyInfo = Array.isArray(raw?.info) ? raw.info.map(text).filter(Boolean) : [];
  const opcoes = Array.isArray(raw?.opcoes) ? raw.opcoes.map(text).filter(Boolean) : legacyInfo;
  const resposta = text(raw?.resposta ?? opcoes[0]);
  const variacoes = Array.isArray(raw?.variacoes) ? raw.variacoes.map(text).filter(Boolean) : text(raw?.variacoes) ? [text(raw.variacoes)] : [];
  return { modo, pergunta, resposta, opcoes, variacoes, explicacao: text(raw?.explicacao), aula_id: raw?.aula_id ?? null };
}

function validOqs(value: unknown, quantity: number, materialIds: Set<string>) {
  if (!value || typeof value !== "object" || !Array.isArray((value as any).oqs) || (value as any).oqs.length !== quantity) return false;
  return (value as any).oqs.every((raw: any) => {
    const oq = normalizeOq(raw);
    return ["lacuna", "oq_falta"].includes(oq.modo) && oq.pergunta.length >= 10 && oq.resposta.length >= 2 && oq.explicacao.length >= 10 && oq.variacoes.length <= 8 && (oq.modo !== "lacuna" || (oq.pergunta.match(/\[___\]/g) ?? []).length === 1) && (oq.modo !== "oq_falta" || (oq.opcoes.length >= 2 && oq.opcoes.length <= 5)) && (oq.aula_id === null || (typeof oq.aula_id === "string" && materialIds.has(oq.aula_id)));
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  let db: ReturnType<typeof createClient> | null = null;
  let reservation: string | null = null;
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Autenticação obrigatória." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const accessToken = authHeader.slice(7);
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
    const { data: auth, error: authError } = await authClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "Sessão inválida." }, 401);
    db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const payload = await req.json();
    const itemId = typeof payload?.item_id === "string" ? payload.item_id : "";
    const quantity = Number(payload?.quantidade);
    const orientacao = text(payload?.orientacao).slice(0, 1000);
    if (!itemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 3) return json({ error: "Item e quantidade inválidos." }, 400);
    const { data: ownedSessions } = await db.from("questoes_reais_sessoes").select("id,usuario_id,status").eq("usuario_id", auth.user.id).in("status", ["concluida", "pulada"]);
    let { data: item } = await db.from("questoes_reais_itens").select("id,sessao_id,tipo,confirmado_em,resposta_marcada,acertou,questao_original_id,castigo_filha_id,area").eq("id", itemId).maybeSingle();
    if (!item) {
      const sessionIds = (ownedSessions ?? []).map((ownedSession) => ownedSession.id);
      if (sessionIds.length > 0) {
        const { data: fallbackItem } = await db.from("questoes_reais_itens").select("id,sessao_id,tipo,confirmado_em,resposta_marcada,acertou,questao_original_id,castigo_filha_id,area").eq("questao_original_id", itemId).eq("tipo", "base").in("sessao_id", sessionIds).not("confirmado_em", "is", null).order("criado_em", { ascending: false }).limit(1).maybeSingle();
        item = fallbackItem;
      }
    }
    if (!item) return json({ error: "Questão não encontrada. Atualize o histórico e tente novamente." }, 404);
    const { data: session } = await db.from("questoes_reais_sessoes").select("id,usuario_id,status").eq("id", item.sessao_id).eq("usuario_id", auth.user.id).maybeSingle();
    if (!session || !["concluida", "pulada"].includes(session.status) || !item.confirmado_em) return json({ error: "A questão precisa pertencer a uma sessão encerrada e respondida." }, 403);
    const { data: role } = await db.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
    const { data: plan } = await db.rpc("get_user_plan", { _user_id: auth.user.id });
    if (!role && plan !== "ouro" && plan !== "trial") return json({ error: "A extração exige Ouro ou Trial ativo." }, 403);
    const { data: source } = item.tipo === "base" ? await db.from("simulado_questoes").select("comando,opcao_a,opcao_b,opcao_c,opcao_d,opcao_e,gabarito,explicacao_1,explicacao_2,explicacao_3,especialidade").eq("id", item.questao_original_id).maybeSingle() : await db.from("castigo_filhas").select("questao,alt_a,alt_b,alt_c,alt_d,alt_e,gabarito,justificativa").eq("id", item.castigo_filha_id).maybeSingle();
    if (!source) return json({ error: "Fonte da questão indisponível." }, 404);
    const { data: materials } = await db.from("materiais").select("id,nome").order("nome");
    const materialIds = new Set((materials ?? []).map((m) => m.id));
    const { data: reserved, error: reservationError } = await authClient.rpc("questoes_reais_reservar_extracao", { p_item: itemId, p_quantidade: quantity });
    reservation = reserved;
    if (reservationError || !reservation) return json({ error: reservationError?.message ?? "Não foi possível reservar a extração." }, 409);
    const model = (await db.from("ai_model_settings").select("model").eq("setting_key", "castigo").maybeSingle()).data?.model || "anthropic/claude-3.5-haiku";
    const apiKey = Deno.env.get("ADM_OQIA_KEY");
    if (!apiKey) throw new Error("Serviço de IA indisponível.");
    const preference = orientacao ? `Preferência opcional do aluno: ${orientacao}. Use-a para priorizar conteúdo quando fizer sentido, mas não force todos os OQs a seguirem o mesmo foco.` : "Não há preferência adicional do aluno.";
    const prompt = `Extraia ${quantity} OQs independentes como um preceptor rigoroso. ${preference} Converta dados do paciente em categorias gerais, não copie o caso, não invente números ou condutas e nunca gere ABCDE. Retorne exatamente o contrato curadoria: pergunta, resposta, opcoes, modo, especialidade não é necessária, explicacao, variacoes e aula_id. O modo lacuna tem exatamente um [___], resposta contém o termo correto e opcoes fica vazia. O modo oq_falta traz 2-5 informações completas em opcoes e a primeira também em resposta. Use somente o conteúdo-fonte e aula_id apenas entre os materiais fornecidos.\n\nMATERIAIS: ${JSON.stringify(materials ?? [])}\n\nFONTE: ${JSON.stringify(source)}`;
    console.info("[extrair-oqs-questao] Chamando OpenRouter", { model, quantity, itemId, reservation });
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://oqmed.com.br", "X-Title": "OQMed" }, body: JSON.stringify({ model, messages: [{ role: "system", content: "Você escreve JSON estrito e seguro para revisão médica humana." }, { role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "oq_extraction", strict: true, schema: outputSchema } }, temperature: 0.2 }) });
    const body = await response.text();
    if (!response.ok) throw new Error(`OpenRouter ${response.status}: ${body.slice(0, 500)}`);
    const providerPayload = JSON.parse(body);
    const content = providerPayload.choices?.[0]?.message?.content;
    if (!content) throw new Error("Conteúdo ausente na resposta");
    const parsed = JSON.parse(content);
    if (!validOqs(parsed, quantity, materialIds)) throw new Error(`Resposta inválida: ${JSON.stringify(parsed).slice(0, 2000)}`);
    const normalized = parsed.oqs.map(normalizeOq);
    const rows = normalized.map((oq: any) => ({ user_id: auth.user.id, pergunta: oq.pergunta, resposta: oq.resposta, opcoes: oq.modo === "oq_falta" ? oq.opcoes : null, modo: oq.modo, especialidade: source.especialidade ?? item.area ?? "clinica_medica", explicacao: oq.explicacao, variacoes: oq.variacoes.join("||"), aula_id: oq.aula_id, modelo_ia: model, contexto_origem: "Questões Reais", questoes_reais_item_id: item.id, questoes_reais_sessao_id: item.sessao_id, questoes_reais_extracao_id: reservation, questoes_reais_orientacao: orientacao || null }));
    const { error: insertError } = await db.from("temp_oqs").insert(rows);
    if (insertError) throw new Error(`Falha ao inserir OQs na fila: ${insertError.message}`);
    await db.from("questoes_reais_extracoes").update({ status: "concluida", resultado: normalized, concluido_em: new Date().toISOString() }).eq("id", reservation);
    const { count: pendingCount } = await db.from("temp_oqs").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id).eq("questoes_reais_item_id", item.id);
    const { count: completedCount } = await db.from("questoes_reais_extracoes").select("id", { count: "exact", head: true }).eq("usuario_id", auth.user.id).eq("sessao_id", item.sessao_id).eq("status", "concluida");
    return json({ extraction_id: reservation, oqs: normalized, created_count: normalized.length, pending_count: pendingCount ?? normalized.length, remaining: role ? null : Math.max(0, 5 - (completedCount ?? 0)) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro interno.";
    if (db && reservation) await db.from("questoes_reais_extracoes").update({ status: "erro", erro: message.slice(0, 2000) }).eq("id", reservation);
    console.error("[extrair-oqs-questao] Erro na extração", { message: message.slice(0, 500), reservation });
    return json({ error: message.startsWith("Resposta inválida") ? "A IA retornou uma estrutura inválida. Tente novamente." : message === "Serviço de IA indisponível." ? message : "Não foi possível concluir a extração. Tente novamente." }, 502);
  }
});

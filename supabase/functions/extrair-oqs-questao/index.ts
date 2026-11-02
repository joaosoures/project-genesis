import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const outputSchema = { type: "object", additionalProperties: false, required: ["oqs"], properties: { oqs: { type: "array", minItems: 1, maxItems: 3, items: { type: "object", additionalProperties: false, required: ["modo", "comando", "info", "variacoes", "explicacao", "aula_id"], properties: { modo: { type: "string", enum: ["lacuna", "oq_falta"] }, comando: { type: "string", minLength: 10 }, info: { type: "array", minItems: 2, maxItems: 5, items: { type: "string", minLength: 2 } }, variacoes: { type: "array", maxItems: 8, items: { type: "string" } }, explicacao: { type: "string", minLength: 10 }, aula_id: { type: ["string", "null"] } } } } } };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
function validOqs(value: unknown, quantity: number, materialIds: Set<string>) {
  if (!value || typeof value !== "object" || !Array.isArray((value as any).oqs) || (value as any).oqs.length !== quantity) return false;
  return (value as any).oqs.every((oq: any) => oq && ["lacuna", "oq_falta"].includes(oq.modo) && typeof oq.comando === "string" && (oq.modo !== "lacuna" || (oq.comando.match(/\[___\]/g) ?? []).length === 1) && Array.isArray(oq.info) && oq.info.length >= 2 && oq.info.length <= 5 && Array.isArray(oq.variacoes) && typeof oq.explicacao === "string" && (oq.aula_id === null || materialIds.has(oq.aula_id)));
}
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) return json({ error: "Autenticação obrigatória." }, 401);
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const accessToken = authHeader.slice(7);
    const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${accessToken}` } } });
    const { data: auth, error: authError } = await authClient.auth.getUser();
    if (authError || !auth.user) return json({ error: "Sessão inválida." }, 401);
    const db = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const payload = await req.json();
    const itemId = typeof payload?.item_id === "string" ? payload.item_id : "";
    const quantity = Number(payload?.quantidade);
    if (!itemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 3) return json({ error: "Item e quantidade inválidos." }, 400);
    const { data: item } = await db.from("questoes_reais_itens").select("id,sessao_id,tipo,confirmado_em,resposta_marcada,acertou,questao_original_id,castigo_filha_id").eq("id", itemId).maybeSingle();
    if (!item) return json({ error: "Questão não encontrada." }, 404);
    const { data: session } = await db.from("questoes_reais_sessoes").select("id,usuario_id,status").eq("id", item.sessao_id).eq("usuario_id", auth.user.id).maybeSingle();
    if (!session || !["concluida", "pulada"].includes(session.status) || !item.confirmado_em) return json({ error: "A questão precisa pertencer a uma sessão encerrada e respondida." }, 403);
    const { data: role } = await db.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
    const { data: plan } = await db.rpc("get_user_plan", { _user_id: auth.user.id });
    if (!role && plan !== "ouro" && plan !== "trial") return json({ error: "A extração exige Ouro ou Trial ativo." }, 403);
    const { data: source } = item.tipo === "base" ? await db.from("simulado_questoes").select("comando,opcao_a,opcao_b,opcao_c,opcao_d,opcao_e,gabarito,explicacao_1,explicacao_2,explicacao_3,especialidade").eq("id", item.questao_original_id).maybeSingle() : await db.from("castigo_filhas").select("questao,alt_a,alt_b,alt_c,alt_d,alt_e,gabarito,justificativa").eq("id", item.castigo_filha_id).maybeSingle();
    if (!source) return json({ error: "Fonte da questão indisponível." }, 404);
    const { data: materials } = await db.from("materiais").select("id,nome").order("nome");
    const materialIds = new Set((materials ?? []).map((m) => m.id));
    const { data: reservation, error: reservationError } = await authClient.rpc("questoes_reais_reservar_extracao", { p_item: itemId, p_quantidade: quantity });
    if (reservationError || !reservation) return json({ error: reservationError?.message ?? "Não foi possível reservar a extração." }, 409);
    const model = (await db.from("ai_model_settings").select("model").eq("setting_key", "castigo").maybeSingle()).data?.model || "anthropic/claude-3.5-haiku";
    const apiKey = Deno.env.get("ADM_OQIA_KEY");
    if (!apiKey) {
      await db.from("questoes_reais_extracoes").update({ status: "erro", erro: "Chave de IA ausente" }).eq("id", reservation);
      return json({ error: "Serviço de IA indisponível." }, 503);
    }
    const prompt = `Extraia ${quantity} OQs independentes como um preceptor rigoroso. Converta dados do paciente em categorias gerais, não copie o caso, não invente números ou condutas e nunca gere ABCDE. O modo lacuna tem exatamente um [___] e info_1 contém a resposta; oq_falta traz 2-5 informações completas sem escolher item oculto. Use somente o conteúdo-fonte e sugira aula_id apenas entre os materiais fornecidos. Justificativa clínica curta.\n\nMATERIAIS: ${JSON.stringify(materials ?? [])}\n\nFONTE: ${JSON.stringify(source)}`;
    console.info("[extrair-oqs-questao] Chamando OpenRouter", { model, quantity, itemId, reservation });
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json", "HTTP-Referer": "https://oqmed.com.br", "X-Title": "OQMed" }, body: JSON.stringify({ model, messages: [{ role: "system", content: "Você escreve JSON estrito e seguro para revisão médica humana." }, { role: "user", content: prompt }], response_format: { type: "json_schema", json_schema: { name: "oq_extraction", strict: true, schema: outputSchema } }, temperature: 0.2 }) });
    const body = await response.text();
    if (!response.ok) {
      console.error("[extrair-oqs-questao] OpenRouter respondeu com erro", { status: response.status, body: body.slice(0, 2000), model, reservation });
      await db.from("questoes_reais_extracoes").update({ status: "erro", erro: `OpenRouter ${response.status}: ${body.slice(0, 500)}` }).eq("id", reservation);
      return json({ error: `A extração falhou no provedor (${response.status}): ${body.slice(0, 500)}` }, 502);
    }
    let providerPayload: { choices?: Array<{ message?: { content?: string | null } }> };
    try {
      providerPayload = JSON.parse(body);
    } catch {
      await db.from("questoes_reais_extracoes").update({ status: "erro", erro: "Resposta não JSON do provedor" }).eq("id", reservation);
      console.error("[extrair-oqs-questao] Resposta não JSON do OpenRouter", { body: body.slice(0, 2000), reservation });
      return json({ error: "O provedor retornou uma resposta inválida." }, 502);
    }
    const content = providerPayload.choices?.[0]?.message?.content;
    if (!content) {
      await db.from("questoes_reais_extracoes").update({ status: "erro", erro: "Conteúdo ausente na resposta" }).eq("id", reservation);
      console.error("[extrair-oqs-questao] Conteúdo ausente na resposta do OpenRouter", { body: body.slice(0, 2000), reservation });
      return json({ error: "O provedor não retornou conteúdo para a extração." }, 502);
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      await db.from("questoes_reais_extracoes").update({ status: "erro", erro: "Conteúdo não JSON" }).eq("id", reservation);
      console.error("[extrair-oqs-questao] Conteúdo não JSON", { content: content.slice(0, 2000), reservation });
      return json({ error: "A IA retornou conteúdo fora do formato esperado." }, 502);
    }
    if (!validOqs(parsed, quantity, materialIds)) {
      const diagnostic = JSON.stringify(parsed).slice(0, 2000);
      await db.from("questoes_reais_extracoes").update({ status: "erro", erro: `Resposta inválida: ${diagnostic}` }).eq("id", reservation);
      console.error("[extrair-oqs-questao] Estrutura inválida retornada pelo OpenRouter", { parsed: diagnostic, quantity, reservation });
      return json({ error: "A IA retornou uma estrutura inválida. Tente novamente." }, 502);
    }
    await db.from("questoes_reais_extracoes").update({ status: "concluida", resultado: (parsed as { oqs: unknown }).oqs, concluido_em: new Date().toISOString() }).eq("id", reservation);
    return json({ extraction_id: reservation, oqs: (parsed as { oqs: unknown[] }).oqs, remaining: role ? null : Math.max(0, 5 - ((await db.from("questoes_reais_extracoes").select("id", { count: "exact", head: true }).eq("usuario_id", auth.user.id).eq("sessao_id", item.sessao_id).eq("status", "concluida")).count ?? 0)) });
  } catch (error) {
    console.error("[extrair-oqs-questao] Erro inesperado", { error: error instanceof Error ? error.message : String(error) });
    return json({ error: error instanceof Error ? error.message : "Erro interno." }, 500);
  }
});

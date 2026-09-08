import { createClient } from "npm:@supabase/supabase-js@2";

const TOKEN = "2851923cc8a2dbdf5b5f44bcc275eb55109c8114e9fe19cf";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });
  if (req.headers.get("x-import-token") !== TOKEN) {
    return new Response("Forbidden", { status: 403 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    const { sql } = await req.json();
    if (typeof sql !== "string" || !sql.trim()) {
      return new Response(JSON.stringify({ error: "missing sql" }), { status: 400 });
    }
    const { error } = await supabase.rpc("tmp_import_exec", { query: sql });
    if (error) {
      return new Response(JSON.stringify({ ok: false, error: error.message }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
});

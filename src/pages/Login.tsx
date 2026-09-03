import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TactileButton from "@/components/console/TactileButton";
import Logo from "@/components/console/Logo";
import { toast } from "sonner";
import { z } from "zod";
import { useReferralCapture, registerStoredReferral, getStoredReferral } from "@/hooks/useReferral";


const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  senha: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

export default function LoginPage() {
  const nav = useNavigate();
  const { session, isBanned } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const [cadastrosAbertos, setCadastrosAbertos] = useState(true);
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistWhats, setWaitlistWhats] = useState("");
  const [waitlistSent, setWaitlistSent] = useState(false);
  const [waitlistLoading, setWaitlistLoading] = useState(false);

  useReferralCapture();
  useEffect(() => {
    if (isBanned) {
      toast.error("Esta conta foi banida. Entre em contato com o suporte.");
      return;
    }
    if (session) {
      registerStoredReferral().finally(() => nav("/dashboard", { replace: true }));
    }
  }, [session, isBanned, nav]);
  useEffect(() => { document.title = mode === "login" ? "Entrar — OQ MED" : "Criar conta — OQ MED"; }, [mode]);

  // Carregar flag global de cadastros
  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("system_flags")
        .select("value")
        .eq("key", "cadastros_abertos")
        .maybeSingle();
      if (data) setCadastrosAbertos(data.value === true || data.value === "true");
    })();
  }, []);
  const refCode = getStoredReferral();


  async function handle(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "signup" && !cadastrosAbertos) {
      toast.error("Cadastros temporariamente bloqueados. Entre na lista de espera abaixo.");
      return;
    }
    const parsed = schema.safeParse({ email, senha });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email, password: senha,
          options: { emailRedirectTo: `${window.location.origin}/dashboard`, data: { nome: nome || email.split("@")[0] } },
        });
        if (error) throw error;
        toast.success("Conta criada! Verifique seu email para confirmar.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      }
    } catch (err: any) { toast.error(err.message ?? "Erro"); }
    finally { setLoading(false); }
  }

  async function google() {
    if (mode === "signup" && !cadastrosAbertos) {
      toast.error("Cadastros temporariamente bloqueados.");
      return;
    }
    const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/dashboard` });
    if (r.error) toast.error("Erro no login com Google");
  }

  async function submitWaitlist(e: React.FormEvent) {
    e.preventDefault();
    if (!waitlistEmail.trim()) { toast.error("Informe seu e-mail"); return; }
    setWaitlistLoading(true);
    const { error } = await (supabase as any).from("lista_espera").insert({
      nome: waitlistName.trim() || null,
      email: waitlistEmail.trim(),
      whatsapp: waitlistWhats.trim() || null,
    });
    setWaitlistLoading(false);
    if (error) {
      toast.error("Não foi possível enviar. Tente novamente.");
    } else {
      setWaitlistSent(true);
      toast.success("Você está na lista! Avisaremos quando abrirmos novas vagas.");
    }
  }


  return (
    <main className="min-h-screen grid place-items-center px-4 bg-background">
      <div className="w-full max-w-md space-y-8 animate-fade-up">
        <header className="text-center space-y-3 flex flex-col items-center">
          <Logo size={120} shadow="lg" />
          <p className="text-muted-foreground text-sm">Estudo inteligente para residência médica.</p>
        </header>

        {refCode && mode === "signup" && (
          <div className="paper-card p-4 border border-amber-500/40 bg-amber-500/5 text-center">
            <p className="text-xs uppercase tracking-wider text-amber-700 font-bold">Indicação aplicada</p>
            <p className="text-sm mt-1">Você receberá <strong>10% off</strong> no primeiro pagamento.</p>
            <p className="text-[10px] text-muted-foreground mt-1">Código: {refCode}</p>
          </div>
        )}

        <div className="paper-card p-7 md:p-8">
          {mode === "signup" && !cadastrosAbertos ? (
            waitlistSent ? (
              <div className="text-center space-y-3 py-6">
                <div className="text-4xl">✅</div>
                <h2 className="font-bold text-lg">Tudo certo!</h2>
                <p className="text-sm text-muted-foreground">
                  Você está na nossa lista de espera. Entraremos em contato assim que abrirmos novas vagas.
                </p>
                <button type="button" onClick={() => setMode("login")} className="text-sm text-primary underline mt-2">
                  Voltar para login
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center space-y-2">
                  <div className="text-3xl">🚧</div>
                  <h2 className="font-bold text-lg">O sistema está cheio</h2>
                  <p className="text-sm text-muted-foreground">
                    Estamos com a capacidade lotada no momento. Deixe seu contato e avisaremos quando abrirmos novas vagas.
                  </p>
                </div>
                <form onSubmit={submitWaitlist} className="space-y-3">
                  <div>
                    <Label htmlFor="w-nome" className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
                    <Input id="w-nome" value={waitlistName} onChange={(e) => setWaitlistName(e.target.value)} maxLength={100} className="h-11 rounded-2xl mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="w-email" className="text-xs uppercase tracking-wider text-muted-foreground">E-mail*</Label>
                    <Input id="w-email" type="email" value={waitlistEmail} onChange={(e) => setWaitlistEmail(e.target.value)} maxLength={255} required className="h-11 rounded-2xl mt-1" />
                  </div>
                  <div>
                    <Label htmlFor="w-wa" className="text-xs uppercase tracking-wider text-muted-foreground">WhatsApp</Label>
                    <Input id="w-wa" value={waitlistWhats} onChange={(e) => setWaitlistWhats(e.target.value)} maxLength={20} placeholder="(00) 00000-0000" className="h-11 rounded-2xl mt-1" />
                  </div>
                  <TactileButton type="submit" disabled={waitlistLoading} variant="primary" size="lg" className="w-full">
                    {waitlistLoading ? "Enviando..." : "Entrar na lista de espera"}
                  </TactileButton>
                </form>
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="w-full text-sm text-muted-foreground hover:text-foreground transition"
                >
                  Já tem conta? Entrar
                </button>
              </div>
            )
          ) : (
            <>
              <form onSubmit={handle} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <Label htmlFor="nome" className="text-xs uppercase tracking-wider text-muted-foreground">Nome</Label>
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} maxLength={100} className="h-12 rounded-2xl mt-1" />
                  </div>
                )}
                <div>
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required className="h-12 rounded-2xl mt-1" />
                </div>
                <div>
                  <Label htmlFor="senha" className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                  <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} maxLength={100} required className="h-12 rounded-2xl mt-1" />
                </div>
                <TactileButton type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
                  {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
                </TactileButton>
              </form>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px bg-border flex-1" />
              </div>
              <TactileButton onClick={google} variant="neutral" size="lg" className="w-full">
                Entrar com Google
              </TactileButton>
              <button
                type="button"
                onClick={() => setMode(mode === "login" ? "signup" : "login")}
                className="mt-5 w-full text-sm text-muted-foreground hover:text-foreground transition"
              >
                {mode === "login" ? "Não tem conta? Criar agora" : "Já tem conta? Entrar"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

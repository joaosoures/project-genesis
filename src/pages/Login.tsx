import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import TactileButton from "@/components/console/TactileButton";
import Logo from "@/components/console/Logo";
import { toast } from "sonner";
import { z } from "zod";
import { useReferralCapture, registerStoredReferral, getStoredReferral } from "@/hooks/useReferral";


const schema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

const signupSchema = schema.extend({
  nome: z.string().trim().min(2, "Informe seu nome de usuário").max(100),
  telefone: z.string().trim().refine(
    (value) => value === "" || /^\(\d{2}\) \d{9}$/.test(value),
    "Informe o celular no formato (DDD) 999999999",
  ),
});

function formatCellphone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
}

export default function LoginPage() {
  const nav = useNavigate();
  const { session, isBanned } = useAuth();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
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
    const parsed = mode === "signup"
      ? signupSchema.safeParse({ email, senha, nome, telefone })
      : schema.safeParse({ email, senha });
    if (!parsed.success) { toast.error(parsed.error.errors[0].message); return; }
    if (mode === "signup" && senha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    try {
      if (mode === "signup") {
        const normalizedEmail = email.trim().toLowerCase();
        const normalizedPhone = telefone.trim();
        const userMetadata: Record<string, string> = { nome: nome.trim() };
        if (normalizedPhone) userMetadata.telefone = normalizedPhone;

        const { data, error } = await supabase.auth.signUp({
          email: normalizedEmail,
          password: senha,
          options: { data: userMetadata },
        });
        if (error) {
          const duplicateEmail = error.code === "user_already_exists"
            || error.code === "email_exists"
            || /already registered|already exists|user already registered|email.*(?:used|taken|registered)/i.test(error.message);
          if (duplicateEmail) {
            toast.error("Este e-mail já está em uso. Entre na sua conta ou utilize outro e-mail.");
            return;
          }
          throw error;
        }
        if (data.user?.identities?.length === 0) {
          toast.error("Este e-mail já está em uso. Entre na sua conta ou utilize outro e-mail.");
          return;
        }

        if (!data.session) {
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: senha,
          });
          if (signInError) throw signInError;
        }

        toast.success("Conta criada com sucesso.");
        nav("/dashboard", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
        if (error) throw error;
      }
    } catch (err: any) { toast.error(err.message ?? "Não foi possível concluir a operação."); }
    finally { setLoading(false); }
  }

  async function signInWithGoogle() {
    if (mode === "signup" && !cadastrosAbertos) {
      toast.error("Cadastros temporariamente bloqueados.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/login`,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      setLoading(false);
      toast.error(error.message || "Não foi possível iniciar o login com Google.");
    }
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
                    <Label htmlFor="nome" className="text-xs uppercase tracking-wider text-muted-foreground">Nome de usuário</Label>
                    <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} minLength={2} maxLength={100} required autoComplete="username" className="h-12 rounded-2xl mt-1" />
                  </div>
                )}
                <div>
                  <Label htmlFor="email" className="text-xs uppercase tracking-wider text-muted-foreground">E-mail</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" className="h-12 rounded-2xl mt-1" />
                </div>
                <div>
                  <Label htmlFor="senha" className="text-xs uppercase tracking-wider text-muted-foreground">Senha</Label>
                  <Input id="senha" type="password" value={senha} onChange={(e) => setSenha(e.target.value)} minLength={6} maxLength={100} required autoComplete={mode === "signup" ? "new-password" : "current-password"} className="h-12 rounded-2xl mt-1" />
                </div>
                {mode === "signup" && (
                  <>
                    <div>
                      <Label htmlFor="confirmar-senha" className="text-xs uppercase tracking-wider text-muted-foreground">Confirmação de senha</Label>
                      <Input
                        id="confirmar-senha"
                        type="password"
                        value={confirmarSenha}
                        onChange={(e) => setConfirmarSenha(e.target.value)}
                        minLength={6}
                        maxLength={100}
                        required
                        autoComplete="new-password"
                        aria-invalid={confirmarSenha.length > 0 && senha !== confirmarSenha}
                        className="h-12 rounded-2xl mt-1"
                      />
                      {confirmarSenha.length > 0 && senha !== confirmarSenha && (
                        <p className="mt-1 text-xs text-destructive">As senhas não coincidem.</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="telefone" className="text-xs uppercase tracking-wider text-muted-foreground">Número do celular</Label>
                      <Input
                        id="telefone"
                        type="tel"
                        inputMode="numeric"
                        value={telefone}
                        onChange={(e) => setTelefone(formatCellphone(e.target.value))}
                        maxLength={14}
                        placeholder="(DDD) 999999999"
                        autoComplete="tel"
                        className="h-12 rounded-2xl mt-1"
                      />
                    </div>
                  </>
                )}
                <TactileButton type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
                  {loading ? "..." : mode === "login" ? "Entrar" : "Criar conta"}
                </TactileButton>
              </form>
              <div className="my-5 flex items-center gap-3">
                <div className="h-px bg-border flex-1" />
                <span className="text-xs text-muted-foreground">ou</span>
                <div className="h-px bg-border flex-1" />
              </div>
              <TactileButton type="button" onClick={signInWithGoogle} disabled={loading} variant="neutral" size="lg" className="w-full">
                {loading ? "Redirecionando..." : "Entrar com Google"}
              </TactileButton>
              <button
                type="button"
                onClick={() => {
                  setMode(mode === "login" ? "signup" : "login");
                  setSenha("");
                  setConfirmarSenha("");
                  setTelefone("");
                }}
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

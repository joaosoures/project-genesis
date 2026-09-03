import { useEffect, useState } from "react";
import { useSettings } from "@/contexts/SettingsContext";
import { BigSwitch } from "@/components/ui/big-switch";
import { Sun, Moon, Volume2, Vibrate, Bell, Focus, Target, Type, Sparkles, RotateCcw, Info, Settings2, Fingerprint, Smartphone, HelpCircle, Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { feedback } from "@/lib/sensory";
import { triggerInstallPrompt } from "@/components/InstallPrompt";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

function Row({
  icon: Icon, title, desc, children, danger,
}: { icon: any; title: string; desc: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className="paper-card p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
      <div
        className="shrink-0 grid place-items-center rounded-2xl"
        style={{
          width: 52, height: 52,
          background: "hsl(var(--background))",
          boxShadow: "var(--shadow-neu-out-sm)",
        }}
      >
        <Icon className={`h-6 w-6 ${danger ? "text-[hsl(var(--destructive))]" : "text-[hsl(var(--accent))]"}`} />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-display font-bold text-base md:text-lg text-[hsl(var(--foreground))] leading-tight">{title}</h3>
        <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0 flex items-center self-end sm:self-center">{children}</div>
    </div>
  );
}

import ConsoleCustomizer from "@/components/console/ConsoleCustomizer";
import { FAQDialog } from "@/components/FAQDialog";

export default function Configuracoes() {
  const s = useSettings();
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [wipeText, setWipeText] = useState("");
  const [wiping, setWiping] = useState(false);

  async function handleWipeAll() {
    if (wipeText !== "EXCLUIR") return;
    setWiping(true);
    try {
      // Garante uma sessão válida antes de chamar a RPC.
      // Sem isso, auth.uid() vem nulo no banco e a função aborta.
      let { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        sessionData = { session: refreshed.session } as any;
      }
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user?.id) {
        throw new Error("Sua sessão expirou. Faça login novamente e tente de novo.");
      }

      const { error } = await supabase.rpc("reset_my_data" as any);
      if (error) throw error;

      try {
        Object.keys(localStorage).forEach((k) => {
          if (k.startsWith("oqmed:") || k.startsWith("trilha:") || k.startsWith("settings:")) {
            localStorage.removeItem(k);
          }
        });
      } catch {}
      s.reset();
      toast({ title: "Tudo apagado", description: "Seus dados foram excluídos. Recarregando…" });
      setTimeout(() => window.location.assign("/"), 800);
    } catch (e: any) {
      const msg = e?.message || "Tente novamente.";
      toast({ title: "Erro ao excluir", description: msg, variant: "destructive" });
      setWiping(false);
    }
  }

  useEffect(() => { 
    document.title = "Configurações — OQ MED";
    const checkPWA = () => {
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
      setIsInstalled(standalone);
    };
    checkPWA();
  }, []);

  const goalOptions = [10, 15, 20, 30, 50];
  const fontOptions: { v: number; label: string }[] = [
    { v: 0.9, label: "A−" }, { v: 1, label: "A" }, { v: 1.1, label: "A+" }, { v: 1.25, label: "A++" },
  ];

  return (
    <div className="min-h-full px-4 md:px-8 py-8 md:py-12 max-w-3xl mx-auto">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--accent))] font-black mb-2">Personalize</p>
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter text-[hsl(var(--foreground))]">
          Configurações
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base">
          Ajuste o app ao seu ritmo de estudo. Suas preferências são salvas na nuvem e sincronizadas entre seus dispositivos.
        </p>
      </header>
      {/* === Banner de Instalação (PWA) === */}
      {!isInstalled && (
        <section className="mb-10">
          <div 
            className="relative overflow-hidden rounded-3xl p-6 md:p-8 border border-[hsl(var(--accent)/0.2)]"
            style={{
              background: "linear-gradient(135deg, hsl(var(--accent)/0.05) 0%, hsl(var(--background)) 100%)",
              boxShadow: "var(--shadow-neu-out-sm)",
            }}
          >
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
              <div 
                className="shrink-0 grid place-items-center rounded-2xl w-16 h-16 bg-white shadow-[0_0_20px_rgba(0,0,0,0.1)] overflow-hidden"
              >
                <img src="/icons/icon-192.png" alt="OQ MED Logo" className="w-12 h-12 rounded-xl" />
              </div>
              <div className="flex-1 space-y-2">
                <h2 className="font-display text-xl md:text-2xl font-black tracking-tight text-[hsl(var(--foreground))]">
                  Estude como um App Nativo
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Instale o <span className="font-bold text-[hsl(var(--accent))]">OQ MED</span> na sua tela inicial para acesso instantâneo, mais espaço de tela e uma experiência premium sem distrações.
                </p>
              </div>
              <button
                onClick={() => { feedback("tap"); triggerInstallPrompt(true); }}
                className="w-full md:w-auto px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg relative z-20"
                style={{
                  background: "hsl(var(--accent))",
                  color: "white",
                  boxShadow: "0 8px 20px -6px hsl(var(--accent)/0.5)",
                }}
              >
                Instalar agora
              </button>
            </div>
            
            {/* Elementos decorativos de fundo */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-[hsl(var(--accent)/0.03)] blur-3xl" />
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 rounded-full bg-[hsl(var(--accent)/0.03)] blur-2xl" />
          </div>
        </section>
      )}

      {/* === Aparência === */}
      <section className="mb-8">
        <h2 className="text-[11px] uppercase tracking-[0.25em] font-black text-muted-foreground mb-3 px-1">Aparência</h2>
        <div className="space-y-3">
          <Row
            icon={s.theme === "dark" ? Moon : Sun}
            title="Tema escuro"
            desc="Reduz brilho e fadiga visual em sessões longas ou ambientes pouco iluminados."
          >
            <BigSwitch
              checked={s.theme === "dark"}
              onCheckedChange={(v) => s.set("theme", v ? "dark" : "light")}
              label="Tema escuro"
              size="lg"
            />
          </Row>

          <Row icon={Type} title="Tamanho da fonte" desc="Ajuste o tamanho do texto em todo o app.">
            <div className="flex gap-2">
              {fontOptions.map(opt => (
                <button
                  key={opt.v}
                  onClick={() => { feedback("tap"); s.set("fontScale", opt.v); }}
                  className="rounded-xl px-3 py-2 text-sm font-bold transition-all"
                  style={{
                    background: "hsl(var(--background))",
                    color: s.fontScale === opt.v ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
                    boxShadow: s.fontScale === opt.v
                      ? "inset 3px 3px 8px hsl(var(--neu-dark) / 0.7), inset -3px -3px 8px hsl(var(--neu-light) / 0.9), 0 0 0 2px hsl(var(--accent))"
                      : "var(--shadow-neu-out-sm)",
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Row>

          <Row icon={Sparkles} title="Reduzir animações" desc="OQ pode ser feito para melhorar a velocidade do app em  PC/Preview sem alterar a boa funcionalidade ja presente nos mobile e tablet\né possivel ter uma etapa de reconhecimento em qual plataforma / dispositivo está sendo rodado o app e então atribuir automaticamente o desligamento de alguns recursos n">
            <BigSwitch checked={s.reduceMotion} onCheckedChange={(v) => s.set("reduceMotion", v)} label="Reduzir animações" />
          </Row>
        </div>
      </section>

      {/* === Feedback Sensorial === */}
      <section className="mb-8">
        <h2 className="text-[11px] uppercase tracking-[0.25em] font-black text-muted-foreground mb-3 px-1">Feedback sensorial</h2>
        <div className="space-y-3">
          <div className="paper-card p-5 md:p-6 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6">
              <div
                className="shrink-0 grid place-items-center rounded-2xl"
                style={{ width: 52, height: 52, background: "hsl(var(--background))", boxShadow: "var(--shadow-neu-out-sm)" }}
              >
                <Volume2 className="h-6 w-6 text-[hsl(var(--accent))]" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-bold text-base md:text-lg text-[hsl(var(--foreground))] leading-tight">Sons e Vibrações</h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">
                  Cliques, confirmações e alertas. A resposta tátil pode variar conforme o dispositivo.
                </p>
              </div>
              <div className="flex gap-4">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase font-black text-muted-foreground">Som</span>
                  <BigSwitch checked={s.sound} onCheckedChange={(v) => s.set("sound", v)} label="Sons" />
                </div>
                <div className="flex flex-col items-center gap-1">
                  <span className="text-[10px] uppercase font-black text-muted-foreground">Vibrar</span>
                  <BigSwitch checked={s.haptics} onCheckedChange={(v) => s.set("haptics", v)} label="Vibração" />
                </div>
              </div>
            </div>

            {s.sound && (
              <div className="pt-2">
                <div className="flex justify-between items-end mb-3">
                  <span className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Volume dos sons</span>
                  <span className="text-xs font-bold text-[hsl(var(--accent))]">{Math.round(s.soundVolume * 5)} de 5</span>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((v, i) => (
                    <button
                      key={v}
                      onClick={() => { s.set("soundVolume", v); feedback("tap"); }}
                      className="h-10 rounded-xl flex items-center justify-center transition-all"
                      style={{
                        background: "hsl(var(--background))",
                        boxShadow: s.soundVolume === v
                          ? "inset 3px 3px 8px hsl(var(--neu-dark) / 0.7), inset -3px -3px 8px hsl(var(--neu-light) / 0.9), 0 0 0 2px hsl(var(--accent))"
                          : "var(--shadow-neu-out-sm)",
                      }}
                    >
                      <div 
                        className="w-1.5 rounded-full transition-all"
                        style={{ 
                          height: `${(i + 1) * 20}%`,
                          background: s.soundVolume === v ? "hsl(var(--accent))" : "hsl(var(--muted-foreground)/0.3)"
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* === Comunicação === */}
      <section className="mb-8">
        <h2 className="text-[11px] uppercase tracking-[0.25em] font-black text-muted-foreground mb-3 px-1">Comunicação</h2>
        <div className="space-y-3">
          <Row icon={Bell} title="Notificações" desc="Lembretes de estudo, novos conteúdos e avisos importantes.">
            <BigSwitch checked={s.notifications} onCheckedChange={(v) => s.set("notifications", v)} label="Notificações" />
          </Row>
        </div>
      </section>

      {/* === Performance === */}
      <section className="mb-8">
        <h2 className="text-[11px] uppercase tracking-[0.25em] font-black text-muted-foreground mb-3 px-1">Módulos de performance</h2>
        <div className="space-y-3">
          <Row icon={Focus} title="Modo Focus (Deep Work)" desc="Silencia sons, vibrações e notificações para sessões de estudo profundo.">
            <BigSwitch checked={s.focusMode} onCheckedChange={(v) => s.set("focusMode", v)} label="Modo focus" size="lg" />
          </Row>

          <div className="paper-card p-5 md:p-6">
            <div className="flex items-center gap-4 mb-4">
              <div
                className="shrink-0 grid place-items-center rounded-2xl"
                style={{ width: 52, height: 52, background: "hsl(var(--background))", boxShadow: "var(--shadow-neu-out-sm)" }}
              >
                <Target className="h-6 w-6 text-[hsl(var(--accent))]" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-bold text-base md:text-lg text-[hsl(var(--foreground))] leading-tight">Meta diária de OQs</h3>
                <p className="text-xs md:text-sm text-muted-foreground mt-0.5">Quantas questões pretende resolver por dia.</p>
              </div>
              <div
                className="text-3xl md:text-4xl font-black tabular-nums text-[hsl(var(--accent))] drop-shadow-[0_0_10px_hsl(var(--accent)/0.5)]"
              >
                {s.dailyGoal}
              </div>
            </div>
            <div className="grid grid-cols-5 gap-2">
              {goalOptions.map(g => (
                <button
                  key={g}
                  onClick={() => { feedback("tap"); s.set("dailyGoal", g); }}
                  className="rounded-xl py-3 text-base font-black tabular-nums transition-all"
                  style={{
                    background: "hsl(var(--background))",
                    color: s.dailyGoal === g ? "hsl(var(--accent-foreground))" : "hsl(var(--foreground))",
                    boxShadow: s.dailyGoal === g
                      ? "inset 3px 3px 8px hsl(var(--neu-dark) / 0.7), inset -3px -3px 8px hsl(var(--neu-light) / 0.9), 0 0 0 2px hsl(var(--accent))"
                      : "var(--shadow-neu-out-sm)",
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* === Painel de Comando === */}
      <section className="mb-8">
        <h2 className="text-[11px] uppercase tracking-[0.25em] font-black text-muted-foreground mb-3 px-1">Painel de comando</h2>
        <div className="space-y-3">
          <Row 
            icon={Settings2} 
            title="Customizar Console" 
            desc="Altere a ordem dos botões (destro/canhoto) e mude o estilo visual dos componentes."
          >
            <button
              onClick={() => { feedback("tap"); setCustomizerOpen(true); }}
              className="px-4 py-2 rounded-xl text-sm font-bold shadow-neu-out-sm active:shadow-neu-in transition-all bg-[hsl(var(--background))]"
            >
              Configurar
            </button>
          </Row>

          <Row 
            icon={Fingerprint} 
            title="Usar touch para scroll" 
            desc="Oculta o disco lateral e permite rolar o conteúdo diretamente com o dedo na tela."
          >
            <BigSwitch 
              checked={s.useNativeScroll} 
              onCheckedChange={(v) => s.set("useNativeScroll", v)} 
              label="Native scroll" 
            />
          </Row>
        </div>
      </section>

      {/* === Reset e Info === */}
      <section className="mt-12 mb-20 space-y-6">
        <button
          onClick={() => { feedback("tap"); s.reset(); }}
          className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-bold text-sm text-muted-foreground tactile-btn"
          style={{ background: "hsl(var(--background))" }}
        >
          <RotateCcw className="h-4 w-4" />
          Restaurar configurações padrão
        </button>

        <div className="p-5 md:p-6 rounded-3xl border border-[hsl(var(--destructive)/0.3)] bg-[hsl(var(--destructive)/0.04)] space-y-4">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-xl bg-[hsl(var(--destructive)/0.1)] grid place-items-center">
              <AlertTriangle className="h-5 w-5 text-[hsl(var(--destructive))]" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-black uppercase tracking-widest text-[hsl(var(--destructive))]">Zona de perigo</p>
              <p className="text-sm font-bold text-[hsl(var(--foreground))] mt-0.5">
                Excluir todo o processo até aqui
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Apaga permanentemente todo o seu progresso. Sua conta permanece ativa, mas você começará do zero.
              </p>
            </div>
          </div>
          <button
            onClick={() => { feedback("tap"); setWipeText(""); setWipeOpen(true); }}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.98]"
            style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}
          >
            <Trash2 className="h-4 w-4" />
            Excluir todo o processo
          </button>
        </div>

        <div 
          onClick={() => { feedback("tap"); setFaqOpen(true); }}
          className="p-5 md:p-6 rounded-3xl bg-orange-500/5 border border-orange-500/20 flex items-center gap-4 cursor-pointer hover:bg-orange-500/10 transition-all active:scale-[0.99] group shadow-neu-out-sm"
        >
          <div className="shrink-0 w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
            <HelpCircle className="h-6 w-6 text-orange-500" />
          </div>
          <div className="flex-1 space-y-1">
            <p className="text-xs font-black text-orange-600 uppercase tracking-widest">Suporte & FAQ</p>
            <p className="text-sm font-bold text-[hsl(var(--foreground))]">
              Retire suas dúvidas sobre o algoritmo, plano e funcionamento
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-3">
          <Info className="h-5 w-5 text-blue-600 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-bold text-blue-800 uppercase tracking-wider">Políticas de Retenção de Dados</p>
            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
              Conforme as regras do plano, o congelamento da conta por mais de 60 dias acarreta a exclusão definitiva de todos os dados estatísticos de desempenho e materiais personalizados gerados por IA. Avisos de pré-exclusão são enviados aos 45 dias.
            </p>
          </div>
        </div>
      </section>
      <ConsoleCustomizer open={customizerOpen} onOpenChange={setCustomizerOpen} />
      <FAQDialog open={faqOpen} onOpenChange={setFaqOpen} />

      <Dialog open={wipeOpen} onOpenChange={(o) => { if (!wiping) { setWipeOpen(o); if (!o) setWipeText(""); } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-12 h-12 rounded-2xl bg-[hsl(var(--destructive)/0.1)] grid place-items-center mb-2">
              <AlertTriangle className="h-6 w-6 text-[hsl(var(--destructive))]" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight">
              Tem certeza absoluta?
            </DialogTitle>
            <DialogDescription className="text-sm">
              Esta ação é <strong className="text-[hsl(var(--destructive))]">permanente e irreversível</strong>. Os seguintes dados serão apagados:
            </DialogDescription>
          </DialogHeader>

          <ul className="space-y-2 text-sm bg-[hsl(var(--destructive)/0.04)] border border-[hsl(var(--destructive)/0.2)] rounded-xl p-4">
            {[
              "Todos os OQs feitos e seu histórico de respostas",
              "Estatísticas e dados de desempenho (acertos, erros, revisões)",
              "Todo o planejamento da Trilha Estratégica",
              "Configurações pessoais (tema, sons, metas, console)",
              "Favoritos, anotações e marcações em materiais",
              "OQs criados por você e gerações de IA",
              "Tentativas e respostas de simulados",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <Trash2 className="h-3.5 w-3.5 mt-0.5 shrink-0 text-[hsl(var(--destructive))]" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="rounded-xl border-2 border-[hsl(var(--destructive))] bg-[hsl(var(--destructive)/0.08)] p-3 text-center">
            <p className="text-xs font-black uppercase tracking-widest text-[hsl(var(--destructive))] leading-relaxed">
              ATENÇÃO: NÃO SERÁ POSSÍVEL RESTAURAR ESTES DADOS APÓS A EXCLUSÃO. ESTA AÇÃO É DEFINITIVA E IRREVERSÍVEL.
            </p>
          </div>



          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Para confirmar, digite <span className="text-[hsl(var(--destructive))] font-black">EXCLUIR</span> abaixo:
            </label>
            <Input
              value={wipeText}
              onChange={(e) => setWipeText(e.target.value)}
              placeholder="EXCLUIR"
              autoComplete="off"
              disabled={wiping}
              className="font-mono font-bold tracking-widest text-center"
            />
          </div>

          <DialogFooter className="gap-2">
            <button
              onClick={() => setWipeOpen(false)}
              disabled={wiping}
              className="px-4 py-2.5 rounded-xl font-bold text-sm bg-[hsl(var(--background))] shadow-neu-out-sm active:shadow-neu-in disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleWipeAll}
              disabled={wipeText !== "EXCLUIR" || wiping}
              className="px-4 py-2.5 rounded-xl font-black text-sm uppercase tracking-wider inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "hsl(var(--destructive))", color: "hsl(var(--destructive-foreground))" }}
            >
              {wiping ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {wiping ? "Excluindo…" : "Excluir tudo"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

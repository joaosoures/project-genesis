import { useEffect, lazy, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { motion } from "framer-motion";
import { Brain, Zap, BookOpen, Target, Check, LineChart, Layers, Sparkles } from "lucide-react";

// Critical components stay synchronous
import LogoHero from "@/components/landing/LogoHero";
import TactileButton from "@/components/console/TactileButton";
import { LiquidCTAButton } from "@/components/landing/LiquidCTAButton";

// Non-critical components are lazy loaded
const MegaDial = lazy(() => import("@/components/landing/MegaDial"));
const TestimonialsPhone = lazy(() => import("@/components/landing/TestimonialsPhone"));
const RollingNumber = lazy(() => import("@/components/landing/RollingNumber"));
const TimerAnimation = lazy(() => import("@/components/landing/TimerAnimation"));
import logo from "@/assets/oqmed-logo.png";
import heroDoctors from "@/assets/hero-medicos-humanizada.jpg";

export default function Landing() {
  const { session } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (session) {
      nav("/estudo", { replace: true });
    }
  }, [session, nav]);

  return (
    <main className="relative min-h-screen overflow-x-clip bg-[hsl(var(--background))] text-[hsl(var(--primary))]">
      {/* === NAV === */}
      <header className="fixed top-0 inset-x-0 z-50 backdrop-blur-md bg-[hsl(var(--background)/0.7)] border-b border-[hsl(var(--border)/0.5)]">
        <div className="mx-auto max-w-6xl px-5 sm:px-6 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <motion.img
              src={logo}
              alt="OQ MED"
              className="h-10 w-auto"
              style={{ filter: "drop-shadow(0 2px 6px hsl(211 100% 11% / 0.18))" }}
              whileHover={{ scale: 1.06, rotate: -2 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
            />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-[hsl(var(--muted-foreground))]">
            <a href="#metodo" className="hover:text-[hsl(var(--primary))] transition">Método</a>
            <a href="#diferenciais" className="hover:text-[hsl(var(--primary))] transition">Diferenciais</a>
            <a href="#planos" className="hover:text-[hsl(var(--primary))] transition">Planos</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="hidden sm:block">
              <TactileButton variant="ghost" size="sm">Login</TactileButton>
            </Link>
            <Link to="/login">
              <TactileButton variant="primary" size="sm">Começar</TactileButton>
            </Link>
          </div>
        </div>
      </header>

      {/* === HERO === */}
      <section className="relative pt-28 pb-20 md:pt-36 md:pb-28 px-5 sm:px-6 overflow-visible">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[hsl(var(--accent)/0.1)] rounded-full blur-[120px] -z-10" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-blue-500/10 rounded-full blur-[100px] -z-10" />

        <div className="mx-auto max-w-4xl flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden border border-white/20 shadow-[0_40px_100px_-20px_rgba(9,0,61,0.2),inset_0_1px_1px_rgba(255,255,255,0.4)] group"
            style={{ aspectRatio: "16 / 10" }}
          >
            {/* Imagem enviada pelo usuário com transparência aumentada */}
            <img
              src={heroDoctors}
              alt="Médico e paciente colaborando com tecnologia"
              className="absolute inset-0 w-full h-full object-cover scale-100 group-hover:scale-105 transition-transform ease-out opacity-60"
              style={{ transitionDuration: "3000ms" }}
              fetchPriority="high"
            />

            {/* Camadas de degradê refinadas para centralizar e destacar a logo */}
            {/* Gradiente sutil nas bordas laterais */}
            <div className="absolute inset-y-0 left-0 w-[15%] bg-gradient-to-r from-[hsl(var(--background))] to-transparent opacity-60" />
            <div className="absolute inset-y-0 right-0 w-[20%] bg-gradient-to-l from-[hsl(var(--background))] to-transparent opacity-70" />

            {/* Gradiente Central — Cria um 'buraco' de luz no centro para a logo */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,hsl(var(--background)/0.3)_100%)]" />
            
            {/* Overlay de tom de marca sutil para unificar paleta sem tirar clareza */}
            <div className="absolute inset-0 bg-[hsl(var(--primary)/0.1)] mix-blend-multiply pointer-events-none" />

            {/* Conteúdo: logo perfeitamente centralizada e badge na borda inferior */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4 md:p-6">
              <div className="relative z-10 scale-75 xs:scale-90 md:scale-110 drop-shadow-2xl">
                <LogoHero />
              </div>
              
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="absolute bottom-0 translate-y-1/2 z-20 inline-flex items-center gap-2 md:gap-3 rounded-full border border-white/20 bg-white/10 backdrop-blur-xl px-3 py-1.5 md:px-5 md:py-2 text-[8px] md:text-[10px] font-bold uppercase tracking-[0.2em] md:tracking-[0.3em] text-[hsl(var(--primary))] shadow-sm"
              >
                <span className="h-1 w-1 md:h-1.5 md:w-1.5 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent))]" />
                Residência médica · 2026
              </motion.div>
            </div>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7 }}
            className="mt-6 md:mt-8 text-3xl sm:text-5xl md:text-6xl font-semibold tracking-tight leading-[1.1] md:leading-[1.05]"
          >
            <span className="text-[hsl(var(--accent))] uppercase font-bold text-2xl sm:text-5xl md:text-6xl">O que falta</span><br />
            <span className="text-black font-semibold text-2xl sm:text-4xl md:text-5xl">para a sua aprovação</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.7 }}
            className="mt-6 text-base md:text-lg text-[hsl(var(--muted-foreground))] max-w-xl leading-relaxed"
          >
            Um método de revisão que mede sua precisão real em cada conteúdo
            e devolve o que está fraco no momento certo.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.7 }}
            className="mt-9 flex flex-col items-center justify-center gap-4 w-full sm:w-auto"
          >
            <Link to="/login" className="w-full sm:w-auto group relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
              <LiquidCTAButton className="w-full sm:w-auto px-8 py-3.5 md:py-4">
                <div className="flex flex-col items-center leading-tight">
                  <span className="text-base md:text-lg">Faz um OQ!</span>
                  <span className="text-[10px] md:text-xs opacity-80 font-medium">7 dias grátis · sem cartão</span>
                </div>
              </LiquidCTAButton>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 0.8 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-[hsl(var(--muted-foreground))]"
          >
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Sem cartão</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Cancele quando quiser</span>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-[hsl(var(--accent))]" /> Diretrizes 2026</span>
          </motion.div>
        </div>
      </section>

      {/* === BAR DE NÚMEROS === */}
      <section className="px-5 sm:px-6 pb-24 md:pb-32">
        <div className="mx-auto max-w-5xl grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {[
            { k: <Suspense fallback="..."> <RollingNumber value={3000} prefix="+" /> </Suspense>, v: "OQs validados no banco" },
            { k: "Diretrizes", v: "Atualizadas para 2026" },
            { k: "1 clique", v: "Gera OQs do seu resumo" },
            { 
              k: <Suspense fallback="..."> <TimerAnimation /> </Suspense>, 
              v: "Duração máxima da sessão" 
            },
          ].map((s, idx) => (
            <div key={idx} className="paper-card p-4 md:p-5 text-center flex flex-col items-center justify-center min-h-[110px]">
              <div className="text-2xl md:text-3xl font-semibold text-[hsl(var(--accent))]">{s.k}</div>
              <div className="text-xs text-[hsl(var(--muted-foreground))] mt-1">{s.v}</div>
            </div>
          ))}
        </div>
      </section>

      {/* === MÉTODO — Os 3 modos === */}
      <section id="metodo" className="relative py-20 md:py-28 px-5 sm:px-6 border-t border-[hsl(var(--border)/0.4)]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-14 md:mb-20">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-3">
              O método
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
              Três modos de estudo.<br className="hidden sm:block" /> Um único objetivo: precisão.
            </h2>
            <p className="mt-5 text-[hsl(var(--muted-foreground))] text-base md:text-lg leading-relaxed">
              Cada modo trabalha uma camada diferente do conteúdo — da memorização
              ao raciocínio clínico — para que a revisão deixe de ser passiva.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 md:gap-6">
            {[
              {
                tag: "Modo 1",
                title: "ABCDE",
                desc: "Questão clássica de múltipla escolha, no formato das principais provas, para você testar raciocínio clínico de forma direta.",
              },
              {
                tag: "Modo 2",
                title: "Lacunas técnicas",
                desc: "Preenchimento dos detalhes que costumam decidir a prova: doses, critérios diagnósticos, intervalos, marcadores.",
              },
              {
                tag: "Modo 3",
                title: "OQ Falta",
                desc: "O formato exclusivo do app. Você completa o que está faltando no raciocínio e exercita memória ativa, não reconhecimento.",
              },
            ].map((m) => (
              <motion.div
                key={m.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
                className="paper-card p-6 md:p-7 flex flex-col"
              >
                <div className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))] mb-3">
                  {m.tag}
                </div>
                <h3 className="text-xl md:text-2xl font-semibold">{m.title}</h3>
                <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                  {m.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* === MEGA DIAL Sticky === */}
      <Suspense fallback={<div className="h-40" />}>
        <MegaDial />
      </Suspense>

      {/* === DIFERENCIAIS — agrupados em 2 blocos === */}
      <section id="diferenciais" className="relative py-20 md:py-28 px-5 sm:px-6 border-t border-[hsl(var(--border)/0.4)]">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-14 md:mb-20">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-3">
              Diferenciais
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
              O fim da autoavaliação subjetiva.
            </h2>
            <p className="mt-5 text-[hsl(var(--muted-foreground))] text-base md:text-lg leading-relaxed">
              Em vez de marcar "fácil" ou "difícil", o app interpreta seu desempenho real
              e ajusta a frequência de revisão automaticamente.
            </p>
          </div>

          {/* Bloco 1 — Inteligência do algoritmo */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-4 md:mb-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="paper-card p-6 md:p-8 ring-1 ring-[hsl(var(--accent)/0.2)]"
            >
              <Brain className="h-7 w-7 text-[hsl(var(--accent))]" />
              <h3 className="mt-4 text-xl md:text-2xl font-semibold">Algoritmo que entende sua precisão</h3>
              <p className="mt-3 text-sm md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
                Cada interação alimenta o cálculo de prioridade. O uso de dicas e o tempo de resposta 
                modificam o retorno do OQ, garantindo que o conteúdo fraco apareça com mais frequência. 
                Sem julgamento subjetivo, sem carga mental extra.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="paper-card p-6 md:p-8"
            >
              <LineChart className="h-7 w-7 text-[hsl(var(--accent))]" />
              <h3 className="mt-4 text-xl md:text-2xl font-semibold">Painel que aponta as lacunas</h3>
              <p className="mt-3 text-sm md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
                Estatísticas detalhadas por especialidade e tema. Os seletores automáticos
                montam a sessão certa para reforçar exatamente onde seu desempenho está abaixo.
              </p>
            </motion.div>
          </div>

          {/* Bloco 2 — Conteúdo */}
          <div className="grid md:grid-cols-2 gap-4 md:gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5 }}
              className="paper-card p-6 md:p-8"
            >
              <BookOpen className="h-7 w-7 text-[hsl(var(--accent))]" />
              <h3 className="mt-4 text-xl md:text-2xl font-semibold">Banco atualizado pelas diretrizes 2026</h3>
              <p className="mt-3 text-sm md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
                Conteúdo curado e revisado por médicos, alinhado às últimas atualizações
                de ESC, AHA, SBP, FEBRASGO e SBC. Você estuda o que de fato será cobrado.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="paper-card p-6 md:p-8 ring-1 ring-[hsl(var(--accent)/0.2)]"
            >
              <Sparkles className="h-7 w-7 text-[hsl(var(--accent))]" />
              <h3 className="mt-4 text-xl md:text-2xl font-semibold">Seu material vira OQs em 1 clique</h3>
              <p className="mt-3 text-sm md:text-base text-[hsl(var(--muted-foreground))] leading-relaxed">
                IA integrada transforma seus resumos, PDFs e anotações em OQs, audioaulas
                e revisões personalizadas. Adapte o método ao seu próprio conteúdo.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* === SOCIAL PROOF === */}
      <Suspense fallback={<div className="h-80" />}>
        <TestimonialsPhone />
      </Suspense>

      {/* === PLANOS / CTA FINAL === */}
      <section id="planos" className="relative py-24 md:py-32 px-5 sm:px-6">
        <div className="container mx-auto max-w-3xl">
          <div
            className="paper-card p-8 md:p-14 text-center relative overflow-hidden"
            style={{ boxShadow: "var(--shadow-card-float), 0 0 80px hsl(var(--accent)/0.15)" }}
          >
            <div
              className="absolute -top-20 -right-20 h-64 w-64 rounded-full opacity-30 blur-3xl"
              style={{ background: "hsl(var(--accent))" }}
            />
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-3">
              7 dias grátis · Sem cartão
            </div>
            <h2 className="text-3xl md:text-5xl font-semibold tracking-tight leading-[1.05]">
              Faz um OQ.<br />
              <span className="text-[hsl(var(--accent))]">Descobre o que falta.</span>
            </h2>
            <p className="mt-5 text-base md:text-lg text-[hsl(var(--muted-foreground))] max-w-xl mx-auto leading-relaxed">
              Acesso completo aos três modos de estudo, banco validado por médicos,
              painel de desempenho e geração de material por IA.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4">
              <Link to="/login" className="w-full sm:w-auto group relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
                <LiquidCTAButton className="w-full sm:w-auto px-10 py-4 md:py-5">
                  <div className="flex flex-col items-center leading-tight">
                    <span className="text-lg md:text-xl">Faz um OQ!</span>
                    <span className="text-xs md:text-sm opacity-90 font-medium">Começar meus 7 dias grátis</span>
                  </div>
                </LiquidCTAButton>
              </Link>
              <Link to="/login" className="text-sm font-medium text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--primary))] transition-colors">
                Já tenho uma conta? Entrar
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="border-t border-[hsl(var(--border))] py-8 px-5 sm:px-6">
        <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-[hsl(var(--muted-foreground))]">
          <div className="flex items-center gap-2">
            <img src={logo} alt="OQ MED" className="h-8 w-auto" />
            <span>© 2026</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-[hsl(var(--primary))]">Termos</a>
            <a href="#" className="hover:text-[hsl(var(--primary))]">Privacidade</a>
            <a href="#" className="hover:text-[hsl(var(--primary))]">Contato</a>
          </div>
        </div>
      </footer>
    </main>
  );
}

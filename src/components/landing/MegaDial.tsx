import { useEffect, useRef, useState } from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { feedback, ensureAudio } from "@/lib/sensory";
import { useSettings } from "@/contexts/SettingsContext";

const PHRASES = [
  {
    n: "01",
    title: "Algoritmo de Incidência",
    body: "O que realmente cai. Cada OQ é priorizado pelo histórico real das provas das principais instituições.",
  },
  {
    n: "02",
    title: "Diretrizes 2026",
    body: "Ciência atualizada. ESC, AHA, SBP, FEBRASGO — sempre na versão mais recente para sua segurança.",
  },
  {
    n: "03",
    title: "Lembrança Ativa",
    body: "Sem múltipla escolha rasa. Você desmistifica a resposta com pistas progressivas e esforço mental real.",
  },
  {
    n: "04",
    title: "Zero Distração",
    body: "Um card por vez. A IA decide o próximo baseado no seu desempenho. Você só precisa pensar e responder.",
  },
  {
    n: "05",
    title: "Revisão Inteligente",
    body: "O sistema entende quando você está prestes a esquecer e traz o conteúdo no momento exato para fixar na memória.",
  },
  {
    n: "06",
    title: "Estudo em Pílulas",
    body: "Sessões curtas e de altíssima densidade. Estude 15 minutos e aprenda mais que em 2 horas de videoaula.",
  },
  {
    n: "07",
    title: "Raio-X da Aprovação",
    body: "Saiba sua probabilidade de aprovação em tempo real. Identifique lacunas antes mesmo de fazer o simulado.",
  },
  {
    n: "08",
    title: "Comunidade de Elite",
    body: "Compare seu desempenho com os 5% melhores candidatos do país e ajuste seu ritmo para a liderança.",
  },
];

export default function MegaDial() {
  const { reduceMotion } = useSettings();
  const sectionRef = useRef<HTMLDivElement>(null);
  const lastTickRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  const [active, setActive] = useState(0);

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    const idx = Math.min(PHRASES.length - 1, Math.max(0, Math.floor(p * PHRASES.length * 0.999)));
    if (idx !== lastTickRef.current) {
      lastTickRef.current = idx;
      setActive(idx);
      feedback("tick");
    }
  });

  const rotate = useTransform(scrollYProgress, [0, 1], [0, 360]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1.04, 1]);
  const tiltX = useTransform(scrollYProgress, [0, 1], [18, -8]);
  const glow = useTransform(scrollYProgress, [0, 0.5, 1], [0.25, 0.6, 0.4]);

  useEffect(() => {
    const onAny = () => ensureAudio();
    window.addEventListener("pointerdown", onAny, { once: true });
    window.addEventListener("wheel", onAny, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onAny);
      window.removeEventListener("wheel", onAny);
    };
  }, []);

  const DialSection = (
    <div
      className="relative flex items-center justify-center order-2 md:order-1"
      style={{ perspective: "1200px" }}
    >
      {reduceMotion ? (
        <div style={{ transform: `rotateX(5deg) scale(1)` }}>
          <Dial3D size={340} />
        </div>
      ) : (
        <motion.div
          style={{ rotateX: tiltX, scale, transformStyle: "preserve-3d" }}
          className="will-change-transform"
        >
          <motion.div style={{ rotate }} className="will-change-transform">
            <Dial3D size={340} />
          </motion.div>
        </motion.div>
      )}

      {reduceMotion ? (
        <div 
          className="absolute inset-0 -z-10 blur-3xl"
          style={{
            background: "radial-gradient(circle at center, hsl(var(--accent) / 0.4) 0%, transparent 60%)",
            opacity: 0.4,
          }}
        />
      ) : (
        <motion.div
          aria-hidden
          className="absolute inset-0 -z-10 blur-3xl"
          style={{
            background: "radial-gradient(circle at center, hsl(var(--accent) / 1) 0%, transparent 60%)",
            opacity: glow,
          }}
        />
      )}
    </div>
  );

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: reduceMotion ? "auto" : "600vh" }}
    >
      <div className={reduceMotion ? "relative w-full py-20 overflow-hidden" : "sticky top-0 h-screen w-full overflow-hidden flex items-center"}>
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "radial-gradient(ellipse at 50% 40%, hsl(220 60% 14% / 0.15), transparent 60%), linear-gradient(180deg, hsl(var(--background)) 0%, hsl(220 30% 95%) 100%)",
          }}
        />
        
        <div className="container mx-auto h-full px-5 sm:px-6 grid grid-cols-1 md:grid-cols-2 items-center gap-8">
          {DialSection}

          <div className="order-1 md:order-2">
            <div className="text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-3">
              A engrenagem
            </div>
            <h3 className="text-3xl md:text-5xl font-semibold tracking-tight text-[hsl(var(--primary))] leading-[1.05]">
              Oito mecanismos.<br />
              <span className="text-[hsl(var(--accent))]">Uma aprovação imparável.</span>
            </h3>

            <div className="mt-8 flex items-center gap-2">
              {PHRASES.map((_, i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full overflow-hidden bg-[hsl(var(--border))]"
                >
                  {reduceMotion ? (
                    <div 
                      className="h-full bg-[hsl(var(--accent))]"
                      style={{ 
                        width: i <= active ? "100%" : "0%",
                        opacity: i <= active ? 1 : 0.3 
                      }}
                    />
                  ) : (
                    <motion.div
                      className="h-full bg-[hsl(var(--accent))]"
                      initial={false}
                      animate={{
                        width: i < active ? "100%" : i === active ? "100%" : "0%",
                        opacity: i <= active ? 1 : 0.3,
                      }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      style={{
                        boxShadow: i === active ? "0 0 12px hsl(var(--accent))" : undefined,
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="mt-8 relative min-h-[220px]">
              {PHRASES.map((p, i) => {
                const isActive = i === active;
                if (reduceMotion) {
                  return isActive ? (
                    <div key={p.n} className="relative">
                       <PhraseCard p={p} />
                    </div>
                  ) : null;
                }
                return (
                  <motion.div
                    key={p.n}
                    initial={false}
                    animate={{
                      opacity: isActive ? 1 : 0,
                      y: isActive ? 0 : 20,
                      filter: isActive ? "blur(0px)" : "blur(8px)",
                    }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="absolute inset-0"
                    style={{ pointerEvents: isActive ? "auto" : "none" }}
                  >
                    <PhraseCard p={p} />
                  </motion.div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function PhraseCard({ p }: { p: any }) {
  return (
    <div
      className="paper-card p-6 md:p-8"
      style={{
        transform: "translateZ(0)",
        boxShadow: "var(--shadow-card-float), 0 0 60px hsl(var(--accent) / 0.18)",
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.3em] text-[hsl(var(--muted-foreground))]">
        Mecanismo {p.n}
      </div>
      <div className="mt-2 text-2xl md:text-3xl font-semibold text-[hsl(var(--primary))]">
        {p.title}
      </div>
      <p className="mt-3 text-[hsl(var(--muted-foreground))]">
        {p.body}
      </p>
    </div>
  );
}

function Dial3D({ size }: { size: number }) {
  return (
    <div
      className="relative"
      style={{ width: size, height: size, transformStyle: "preserve-3d" }}
    >
      <div
        aria-hidden
        className="absolute left-1/2 -translate-x-1/2"
        style={{
          bottom: -size * 0.1,
          width: size * 1.1,
          height: size * 0.2,
          background: "radial-gradient(ellipse at center, hsl(218 24% 70% / 0.45), transparent 70%)",
          filter: "blur(12px)",
        }}
      />
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background: "hsl(220 23% 95%)",
          boxShadow: "20px 20px 50px hsl(218 24% 70% / 0.7), -20px -20px 50px hsl(0 0% 100% / 0.95), 0 0 80px hsl(205 67% 70% / 0.15)",
        }}
      />
      <div
        className="absolute inset-[3%] rounded-full"
        style={{
          background: "radial-gradient(circle at 50% 50%, hsl(220 22% 96%) 60%, hsl(220 18% 88%) 100%)",
          boxShadow: "0 0 0 2px hsl(211 100% 11% / 0.9), inset 12px 12px 25px hsl(218 24% 75% / 0.45), inset -12px -12px 25px hsl(0 0% 100% / 0.95)",
        }}
      >
        <div
          className="absolute rounded-full"
          style={{
            width: "8%",
            height: "8%",
            left: "84%",
            top: "46%",
            background: "radial-gradient(circle at 35% 30%, hsl(140 95% 85%), hsl(140 85% 50%) 70%)",
            boxShadow: "0 0 15px hsl(140 80% 55% / 0.9), 0 0 35px hsl(140 80% 55% / 0.4), inset 0 -1px 2px hsl(0 0% 0% / 0.3)",
          }}
        />
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-40"
          viewBox="0 0 100 100"
        >
          <defs>
            <path
              id="landing-dial-text"
              d="M 50,50 m -38,0 a 38,38 0 1,1 76,0 a 38,38 0 1,1 -76,0"
            />
          </defs>
          <text
            fontSize="3.4"
            fill="hsl(211 100% 11%)"
            letterSpacing="0.8"
            fontFamily="Inter, sans-serif"
            fontWeight="600"
          >
            <textPath href="#landing-dial-text" startOffset="0">
              OQ FALTA · APROVAÇÃO POR REPETIÇÃO · OQ FALTA · APROVAÇÃO POR REPETIÇÃO · 
            </textPath>
          </text>
        </svg>
      </div>
      <div
        className="absolute inset-[24%] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle at 38% 32%, hsl(0 0% 100%) 0%, hsl(220 22% 94%) 45%, hsl(220 18% 86%) 100%)",
          boxShadow: "inset 6px 6px 15px hsl(0 0% 100% / 0.9), inset -8px -8px 20px hsl(218 24% 72% / 0.5), 0 4px 12px hsl(218 24% 60% / 0.2)",
        }}
      />
    </div>
  );
}

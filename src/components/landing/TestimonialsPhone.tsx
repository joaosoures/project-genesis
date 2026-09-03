import { useRef, useState, useEffect } from "react";
import { motion, useScroll, useMotionValueEvent } from "framer-motion";
import logo from "@/assets/oqmed-logo.png";
import MechanicalCounter from "./MechanicalCounter";

const TESTIMONIALS = [
  {
    quote: "oq é o anki perto disso? serio esse app é o meu vício diário",
    name: "João P.",
    role: "Aprovado USP-SP 2026 · Cirurgia",
    initial: "J",
  },
  {
    quote: "Prá que que eu paguei #Cards, isso aqui foi um achado para minha aprovação",
    name: "Beatriz L.",
    role: "Aprovada Einstein 2026 · Clínica",
    initial: "B",
  },
  {
    quote: "Simplesmente decorei todos os OQs kkkkk Bora pra cima!",
    name: "Lucas M.",
    role: "Aprovado UNIFESP 2026 · Pediatria",
    initial: "L",
  },
  {
    quote: "Finalmente um jeito de estudar que não dá vontade de chorar kkkk",
    name: "Fernanda S.",
    role: "Aprovada UFRJ 2026 · GO",
    initial: "F",
  },
  {
    quote: "Consigo encaixar uma sessão de 5 minutos entre um ambulatório e outro. Faz diferença real.",
    name: "Marina A.",
    role: "Aprovada HCFMUSP 2026 · Anestesia",
    initial: "M",
  },
  {
    quote: "O algoritmo sabe o que eu preciso revisar antes de mim. É bizarro.",
    name: "Pedro T.",
    role: "Aprovado UFMG 2026 · Cardiologia",
    initial: "P",
  },
];

// Posições espalhadas em torno do iPhone (em % relativo ao container do mockup)
const POSITIONS = [
  { x: -130, y: -90, rot: -10 },
  { x: 140, y: -60, rot: 8 },
  { x: -160, y: 60, rot: -7 },
  { x: 150, y: 110, rot: 12 },
  { x: -100, y: 180, rot: -5 },
  { x: 110, y: 200, rot: 6 },
];

export default function TestimonialsPhone() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(0);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (p) => {
    // distribui a revelação ao longo de 80% do scroll, deixando 20% para respiração final
    const count = Math.min(
      TESTIMONIALS.length,
      Math.floor((p / 0.85) * TESTIMONIALS.length) + (p > 0.02 ? 1 : 0)
    );
    if (count !== revealed) setRevealed(Math.max(0, count));
  });

  // iPhone estático e menor
  const phoneScale = 0.75;
  const phoneRotate = 0;

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: isMobile ? "350vh" : "650vh" }}
    >
      <div className="sticky top-0 h-screen w-full flex flex-col items-center justify-center overflow-visible">
        {/* Header fixo */}
        <div className="absolute top-[5vh] md:top-[8vh] left-0 right-0 text-center px-5 z-30">
            <div className="text-[10px] md:text-[11px] uppercase tracking-[0.3em] text-[hsl(var(--accent))] mb-2 md:mb-3">
              Comunidade
            </div>
            <h2 className="flex flex-col md:flex-row items-center justify-center gap-2 md:gap-4 text-2xl sm:text-3xl md:text-5xl font-semibold tracking-tight leading-tight text-[hsl(var(--primary))]">
              <span>Já são</span>
              <MechanicalCounter initialValue={850} />
              <span>alunos praticando com OQs</span>
            </h2>
        </div>

        {/* Palco central */}
        <div
          className="relative flex items-center justify-center"
          style={{ perspective: 1400, marginTop: isMobile ? "25vh" : "12vh" }}
        >
          {/* iPhone */}
          <motion.div
            style={{ scale: phoneScale, rotate: phoneRotate, transformStyle: "preserve-3d" }}
            className="relative z-10"
          >
            <PhoneWithLogo />
          </motion.div>

          {/* Testimonials sobrepostos */}
          {TESTIMONIALS.map((t, i) => {
            const rawPos = POSITIONS[i % POSITIONS.length];
            const pos = {
              x: isMobile ? rawPos.x * 0.6 : rawPos.x,
              y: isMobile ? rawPos.y * 0.8 : rawPos.y,
              rot: rawPos.rot
            };
            const isRevealed = i < revealed;
            return (
              <motion.div
                key={t.name}
                initial={false}
                animate={{
                  opacity: isRevealed ? 1 : 0,
                  x: isRevealed ? pos.x : pos.x * 0.4,
                  y: isRevealed ? pos.y : pos.y * 0.4 + 30,
                  rotate: isRevealed ? pos.rot : 0,
                  scale: isRevealed ? 1 : 0.7,
                }}
                transition={{
                  type: "spring",
                  stiffness: 110,
                  damping: 18,
                  mass: 0.8,
                }}
                className="absolute z-20 w-[190px] md:w-[280px] pointer-events-none"
                style={{ zIndex: 20 + i }}
              >
                <div
                  className="paper-card p-5 backdrop-blur-md bg-white/85 dark:bg-black/40"
                  style={{
                    boxShadow:
                      "0 30px 60px -20px hsl(220 40% 15% / 0.35), 0 8px 20px -8px hsl(220 40% 15% / 0.2), 0 0 0 1px hsl(0 0% 100% / 0.6) inset",
                  }}
                >
                  <div className="text-[hsl(var(--accent))] text-2xl leading-none font-serif">"</div>
                  <p className="mt-1 text-[13px] md:text-sm text-[hsl(var(--primary))] leading-relaxed">
                    {t.quote}
                  </p>
                  <div className="mt-4 flex items-center gap-3 pt-3 border-t border-[hsl(var(--border))]">
                    <div className="h-8 w-8 rounded-full bg-[hsl(var(--accent))] text-white flex items-center justify-center text-xs font-semibold">
                      {t.initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-[hsl(var(--primary))]">{t.name}</div>
                      <div className="text-[10px] text-[hsl(var(--muted-foreground))] truncate">{t.role}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
        {/* Gradiente removido para melhorar a leitura */}
        <div className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none z-40" />
      </div>
    </section>
  );
}

function PhoneWithLogo() {
  return (
    <div className="relative" style={{ width: 260, height: 540 }}>
      {/* Carcaça titanium */}
      <div
        className="absolute inset-0 rounded-[50px]"
        style={{
          background:
            "linear-gradient(140deg, hsl(220 12% 88%) 0%, hsl(220 16% 70%) 35%, hsl(220 18% 55%) 50%, hsl(220 16% 78%) 70%, hsl(220 14% 90%) 100%)",
          boxShadow:
            "0 30px 60px -20px hsl(230 40% 15% / 0.3), 0 10px 20px -10px hsl(230 40% 15% / 0.2), 0 1px 0 hsl(0 0% 100% / 0.6) inset",
        }}
      />
      {/* Bezel */}
      <div className="absolute inset-[5px] rounded-[46px] bg-[#0a0a0e]" />
      {/* Tela */}
      <div className="absolute inset-[9px] rounded-[42px] overflow-hidden bg-gradient-to-br from-[hsl(var(--background))] via-[hsl(220_30%_97%)] to-[hsl(220_40%_92%)]">
        {/* Dynamic island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 h-7 w-24 rounded-full bg-black z-20" />

        {/* Brilho de tela */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse at 30% 0%, hsl(0 0% 100% / 0.6), transparent 50%)",
          }}
        />

        {/* Conteúdo: logo centralizada com pulse */}
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
          <img
            src={logo}
            alt="OQ MED"
            className="w-[70%] h-auto"
            style={{ filter: "drop-shadow(0 8px 24px hsl(211 100% 11% / 0.2))" }}
          />
          <motion.div
            initial={{ opacity: 0.5 }}
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ duration: 3, repeat: Infinity }}
            className="mt-6 text-[10px] uppercase tracking-[0.35em] text-[hsl(var(--muted-foreground))]"
          >
            Residência · 2026
          </motion.div>
          <div className="mt-3 flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="h-1 w-1 rounded-full bg-[hsl(var(--accent))]"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Botões laterais */}
      <div className="absolute -left-[3px] top-28 w-[3px] h-14 rounded-l bg-[hsl(220_18%_55%)]" />
      <div className="absolute -left-[3px] top-48 w-[3px] h-20 rounded-l bg-[hsl(220_18%_55%)]" />
      <div className="absolute -right-[3px] top-40 w-[3px] h-24 rounded-r bg-[hsl(220_18%_55%)]" />
    </div>
  );
}

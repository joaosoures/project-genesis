import { motion, useScroll, useTransform, MotionValue } from "framer-motion";
import { RefObject } from "react";

/**
 * iPhone 3D que rotaciona conforme o scroll:
 *  - inicia ~ -75° (lateralizado à esquerda)
 *  - termina ~ +75° (lateralizado à direita)
 * Tela mostra prévia da experiência tátil do app.
 */
export default function PhoneMockup({ targetRef }: { targetRef: RefObject<HTMLElement> }) {
  const { scrollYProgress } = useScroll({
    target: targetRef,
    offset: ["start end", "end start"],
  });
  const rotateY = useTransform(scrollYProgress, [0, 0.5, 1], [-75, 0, 75]);
  const rotateX = useTransform(scrollYProgress, [0, 0.5, 1], [10, -2, 10]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 1, 0.85]);

  return (
    <div className="relative w-full flex items-center justify-center" style={{ perspective: 1600 }}>
      <motion.div
        style={{ rotateY, rotateX, scale, transformStyle: "preserve-3d" }}
        className="relative will-change-transform"
      >
        <PhoneFrame yMV={scrollYProgress} />
      </motion.div>
    </div>
  );
}

function PhoneFrame({ yMV }: { yMV: MotionValue<number> }) {
  // Animação interna do "card girando" sincronizada
  const cardRotate = useTransform(yMV, [0, 1], [0, 360]);
  const dialRotate = useTransform(yMV, [0, 1], [0, 540]);

  return (
    <div
      className="relative"
      style={{ width: 300, height: 620 }}
    >
      {/* Carcaça (titanium) */}
      <div
        className="absolute inset-0 rounded-[58px]"
        style={{
          background:
            "linear-gradient(140deg, hsl(220 12% 88%) 0%, hsl(220 16% 70%) 35%, hsl(220 18% 55%) 50%, hsl(220 16% 78%) 70%, hsl(220 14% 90%) 100%)",
          boxShadow:
            "0 40px 80px -30px hsl(230 40% 15% / 0.55), 0 10px 30px -10px hsl(230 40% 15% / 0.35), 0 1px 0 hsl(0 0% 100% / 0.6) inset",
        }}
      />
      {/* Bezel preto */}
      <div className="absolute inset-[6px] rounded-[54px] bg-[#0a0a0e]" />
      {/* Tela */}
      <div className="absolute inset-[10px] rounded-[48px] overflow-hidden bg-[#F5F5F7]">
        {/* Dynamic island */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 h-7 w-24 rounded-full bg-black z-20" />

        {/* Conteúdo do app — mini Estudo */}
        <div className="absolute inset-0 flex flex-col items-center pt-14 pb-4 px-4">
          <div className="text-[10px] uppercase tracking-[0.25em] text-[hsl(var(--muted-foreground))]">
            Cardiologia · Q de 4
          </div>

          {/* Card-revista */}
          <motion.div
            style={{ rotateZ: cardRotate }}
            className="mt-3 paper-card w-[230px] h-[280px] flex flex-col p-4"
          >
            <div className="text-[9px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
              ESC · 2026
            </div>
            <div className="mt-2 text-[13px] font-semibold text-[hsl(var(--primary))] leading-snug">
              Primeira escolha em FA aguda com instabilidade hemodinâmica:
            </div>
            <div className="mt-auto flex flex-col gap-1.5">
              {["Cardioversão elétrica", "Amiodarona EV", "Diltiazem EV"].map((o, i) => (
                <div
                  key={i}
                  className={`text-[10.5px] px-2.5 py-1.5 rounded-xl border ${
                    i === 0
                      ? "border-[hsl(var(--accent))] bg-[hsl(var(--accent)/0.08)] text-[hsl(var(--primary))]"
                      : "border-[hsl(var(--border))] bg-white text-[hsl(var(--muted-foreground))]"
                  }`}
                >
                  {String.fromCharCode(65 + i)}. {o}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Console mini */}
          <div className="mt-4 console-surface w-full h-[120px] flex items-center justify-around px-3">
            {/* Lâmpada desmistificar */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="h-9 w-9 rounded-full bg-white tactile-btn grid place-items-center animate-lamp-pulse">
                <div className="h-3 w-3 rounded-full bg-[hsl(var(--accent))] shadow-[0_0_10px_hsl(var(--accent))]" />
              </div>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--accent))]" />
                ))}
              </div>
            </div>
            {/* Dial */}
            <motion.div
              style={{ rotate: dialRotate }}
              className="relative h-16 w-16 rounded-full"
            >
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 30% 25%, hsl(0 0% 100% / 0.5), transparent 35%), linear-gradient(180deg, hsl(218 90% 54%), hsl(218 90% 38%))",
                  boxShadow: "0 4px 10px -2px hsl(220 30% 15% / 0.4), 0 1px 0 hsl(0 0% 100% / 0.4) inset",
                }}
              />
              {Array.from({ length: 18 }).map((_, i) => (
                <div
                  key={i}
                  className="absolute left-1/2 top-0 h-1/2 w-px bg-white/40 origin-bottom"
                  style={{ transform: `translateX(-0.5px) rotate(${(360 / 18) * i}deg)` }}
                />
              ))}
              <div
                className="absolute inset-[30%] rounded-full"
                style={{
                  background:
                    "radial-gradient(circle at 35% 30%, hsl(0 0% 100% / 0.55), transparent 60%), linear-gradient(180deg, hsl(220 14% 30%), hsl(220 18% 16%))",
                }}
              />
            </motion.div>
            {/* Botão tátil */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="h-9 w-9 rounded-2xl tactile-btn grid place-items-center text-white text-[10px] font-bold"
                style={{
                  background: "linear-gradient(180deg, hsl(226 100% 62%), hsl(226 100% 46%))",
                }}
              >
                OK
              </div>
              <div className="text-[8px] uppercase tracking-widest text-[hsl(var(--muted-foreground))]">
                Confirma
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Botões laterais */}
      <div className="absolute -left-[3px] top-32 w-[3px] h-16 rounded-l bg-[hsl(220_18%_55%)]" />
      <div className="absolute -left-[3px] top-56 w-[3px] h-24 rounded-l bg-[hsl(220_18%_55%)]" />
      <div className="absolute -right-[3px] top-44 w-[3px] h-28 rounded-r bg-[hsl(220_18%_55%)]" />
    </div>
  );
}

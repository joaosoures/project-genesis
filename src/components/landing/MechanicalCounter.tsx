import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface MechanicalCounterProps {
  initialValue: number;
  intervalMs?: number;
}

export default function MechanicalCounter({ initialValue, intervalMs = 5000 }: MechanicalCounterProps) {
  const [count, setCount] = useState(initialValue);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev >= 900) return initialValue;
        return prev + 1;
      });
    }, intervalMs);
    return () => clearInterval(interval);
  }, [intervalMs, initialValue]);

  const digits = count.toString().split("");

  return (
    <div className="inline-flex items-center gap-1 font-mono">
      {digits.map((digit, idx) => (
        <Digit key={idx} value={digit} />
      ))}
    </div>
  );
}

function Digit({ value }: { value: string }) {
  return (
    <div className="relative h-12 w-8 md:h-16 md:w-11 bg-[#1A1A1A] rounded-md overflow-hidden flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.1)] border border-black/40">
      <AnimatePresence mode="popLayout">
        <motion.span
          key={value}
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -30, opacity: 0 }}
          transition={{ 
            type: "spring", 
            stiffness: 400, 
            damping: 30,
            duration: 0.5 
          }}
          className="text-[#E0E0E0] text-2xl md:text-4xl font-bold tabular-nums"
        >
          {value}
        </motion.span>
      </AnimatePresence>
      
      {/* Linha horizontal no meio para o efeito de placar mecânico */}
      <div className="absolute inset-x-0 top-1/2 h-[2px] bg-black/60 z-10 shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
      
      {/* Sombreamento degradê para dar profundidade de curvatura */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/40 pointer-events-none" />
    </div>
  );
}

import { useEffect, useState, useRef } from "react";
import { useInView, motion, AnimatePresence } from "framer-motion";
import { useSettings } from "@/contexts/SettingsContext";

export default function TimerAnimation() {
  const { reduceMotion } = useSettings();
  const [displayTime, setDisplayTime] = useState("00:00:00");
  const [isFinished, setIsFinished] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (reduceMotion) {
      setIsFinished(true);
      return;
    }

    if (isInView) {
      let startTime = Date.now();
      const duration = 2000;

      const updateTimer = () => {
        const now = Date.now();
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);

        const targetSeconds = 900;
        const currentSeconds = Math.floor(progress * targetSeconds);

        const h = Math.floor(currentSeconds / 3600).toString().padStart(2, "0");
        const m = Math.floor((currentSeconds % 3600) / 60).toString().padStart(2, "0");
        const s = (currentSeconds % 60).toString().padStart(2, "0");

        setDisplayTime(`${h}:${m}:${s}`);

        if (progress < 1) {
          requestAnimationFrame(updateTimer);
        } else {
          setTimeout(() => setIsFinished(true), 300);
        }
      };

      requestAnimationFrame(updateTimer);
    }
  }, [isInView, reduceMotion]);

  if (reduceMotion) {
    return (
      <div ref={ref} className="flex items-center justify-center min-h-[1.5em] relative">
        <span className="text-2xl md:text-3xl font-semibold text-[hsl(var(--accent))]">
          15 min
        </span>
      </div>
    );
  }

  return (
    <div ref={ref} className="flex items-center justify-center min-h-[1.5em] relative">
      <AnimatePresence mode="wait">
        {!isFinished ? (
          <motion.div
            key="timer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex items-center gap-2 text-[hsl(var(--accent))] font-mono"
          >
            <div className="w-3 h-3 rounded-full border border-[hsl(var(--accent))] border-t-transparent animate-spin shadow-[0_0_8px_hsl(var(--accent))]" />
            <span className="text-xl md:text-2xl drop-shadow-[0_0_8px_rgba(59,130,246,0.3)]">{displayTime}</span>
          </motion.div>
        ) : (
          <motion.span
            key="final"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-3xl font-semibold text-[hsl(var(--accent))]"
          >
            15 min
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

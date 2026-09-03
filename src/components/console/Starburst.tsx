import { motion, AnimatePresence } from "framer-motion";
import { useMemo } from "react";
import { useSettings } from "@/contexts/SettingsContext";

export default function Starburst({ show }: { show: boolean }) {
  const { reduceMotion } = useSettings();
  
  const particles = useMemo(
    () => Array.from({ length: 22 }).map((_, i) => {
      const angle = (Math.PI * 2 * i) / 22 + Math.random() * 0.3;
      const dist = 90 + Math.random() * 90;
      const size = 6 + Math.random() * 10;
      const blue = Math.random() > 0.5;
      const delay = Math.random() * 0.08;
      return {
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist,
        size, blue, delay,
        rot: Math.random() * 360,
      };
    }),
    [show ? 1 : 0],
  );

  if (reduceMotion) return null;

  return (
    <AnimatePresence>
      {show && (
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center">
          <div className="relative h-0 w-0">
            {particles.map((p, i) => (
              <motion.div
                key={i}
                initial={{ x: 0, y: 0, opacity: 1, scale: 0.4, rotate: 0 }}
                animate={{ x: p.x, y: p.y, opacity: 0, scale: 1.1, rotate: p.rot }}
                transition={{ duration: 0.95, delay: p.delay, ease: [0.16, 1, 0.3, 1] }}
                exit={{ opacity: 0 }}
                style={{
                  position: "absolute",
                  width: p.size,
                  height: p.size,
                  filter: `drop-shadow(0 0 6px ${p.blue ? "hsl(var(--accent))" : "white"})`,
                }}
              >
                <Star color={p.blue ? "hsl(var(--accent))" : "white"} />
              </motion.div>
            ))}
            {/* flash central */}
            <motion.div
              initial={{ scale: 0, opacity: 0.9 }}
              animate={{ scale: 4, opacity: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="absolute -translate-x-1/2 -translate-y-1/2 h-20 w-20 rounded-full"
              style={{ background: "radial-gradient(circle, hsl(var(--accent)/0.9), transparent 70%)" }}
            />
          </div>
        </div>
      )}
    </AnimatePresence>
  );
}

function Star({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 24 24" width="100%" height="100%" fill={color}>
      <path d="M12 2 L14.6 9.4 L22 12 L14.6 14.6 L12 22 L9.4 14.6 L2 12 L9.4 9.4 Z" />
    </svg>
  );
}

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

export default function BentoCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const { reduceMotion } = useSettings();

  if (reduceMotion) {
    return <div className={cn("paper-card p-5", className)}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className={cn("paper-card p-5", className)}
    >
      {children}
    </motion.div>
  );
}

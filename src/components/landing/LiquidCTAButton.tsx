import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { feedback, ensureAudio } from "@/lib/sensory";

interface LiquidCTAButtonProps extends HTMLMotionProps<"button"> {
  className?: string;
  children: React.ReactNode;
  haptic?: boolean;
}

export const LiquidCTAButton = ({
  className,
  children,
  haptic = true,
  onPointerDown,
  ...props
}: LiquidCTAButtonProps) => {
  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.98, y: 2 }}
      onPointerDown={(e) => {
        ensureAudio();
        if (haptic && !props.disabled) feedback("tap");
        onPointerDown?.(e);
      }}
      className={cn(
        "relative overflow-hidden group px-10 py-5 rounded-full",
        "flex items-center justify-center gap-2",
        "font-bold text-white text-lg tracking-tight",
        "shadow-[0_20px_50px_-10px_rgba(59,130,246,0.4),0_10px_30px_-10px_rgba(16,185,129,0.3)]",
        "transition-all duration-300",
        className
      )}
      {...props}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-blue-500 to-emerald-500 bg-[length:200%_auto] animate-gradient-x" />
      
      <motion.div
        className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
        animate={{
          backgroundPosition: ["0% 0%", "100% 100%"],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "linear",
        }}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="absolute inset-x-4 top-1 h-[35%] bg-white/20 rounded-full blur-[2px]" />
      
      {[...Array(3)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-white/30 blur-[1px]"
          animate={{
            x: [0, Math.random() * 40 - 20, 0],
            y: [0, Math.random() * -40 - 10, 0],
            opacity: [0, 0.6, 0],
          }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: i * 0.8,
          }}
          style={{
            left: `${20 + i * 30}%`,
            bottom: "10%",
          }}
        />
      ))}

      <span className="relative z-10 drop-shadow-md flex items-center gap-2">
        {children}
      </span>

      <div className="absolute inset-0 rounded-full border border-white/20 pointer-events-none" />
    </motion.button>
  );
};


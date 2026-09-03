import logo from "@/assets/oqmed-logo.png";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface LogoProps {
  className?: string;
  size?: number;
  /** Intensidade da sombra projetada. */
  shadow?: "none" | "sm" | "md" | "lg";
  /** Anima entrada suave (fade + scale). */
  animated?: boolean;
}

const SHADOW: Record<NonNullable<LogoProps["shadow"]>, string> = {
  none: "none",
  sm: "drop-shadow(0 1px 2px hsl(var(--foreground) / 0.15)) drop-shadow(0 2px 6px hsl(var(--foreground) / 0.1))",
  md: "drop-shadow(0 4px 8px hsl(var(--foreground) / 0.18)) drop-shadow(0 10px 20px hsl(var(--foreground) / 0.12))",
  lg: "drop-shadow(0 10px 18px hsl(var(--foreground) / 0.2)) drop-shadow(0 24px 40px hsl(var(--foreground) / 0.15))",
};

export default function Logo({ className, size = 32, shadow = "sm", animated = true }: LogoProps) {
  const Img = animated ? motion.img : "img";
  const animProps = animated
    ? {
        initial: { opacity: 0, scale: 0.9 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
        whileHover: { scale: 1.05, rotate: -1.5 },
      }
    : {};

  return (
    <span className={cn("inline-flex items-center", className)}>
      <Img
        src={logo}
        alt="OQ MED"
        height={size}
        style={{ 
          height: size, 
          width: "auto", 
          filter: SHADOW[shadow],
        }}
        className="select-none dark:invert dark:brightness-[1.2]"
        draggable={false}
        {...(animProps as any)}
      />
    </span>
  );
}

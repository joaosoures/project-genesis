import { motion } from "framer-motion";
import logo from "@/assets/oqmed-logo-hero-final.png";
import { useSettings } from "@/contexts/SettingsContext";

export default function LogoHero() {
  const { reduceMotion } = useSettings();

  const Halo = (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 blur-3xl opacity-30"
      style={{
        background:
          "radial-gradient(circle, hsl(var(--accent)) 0%, hsl(var(--primary) / 0.4) 40%, transparent 70%)",
      }}
    />
  );

  const Ring = (
    <div
      aria-hidden
      className="absolute inset-0 -z-10 blur-2xl opacity-20"
      style={{
        background:
          "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.5), transparent, hsl(var(--accent) / 0.5), transparent)",
      }}
    />
  );

  if (reduceMotion) {
    return (
      <div className="relative flex items-center justify-center">
        {Halo}
        <div className="relative">
          <img
            src={logo}
            alt="OQ MED"
            draggable={false}
            className="select-none w-[240px] sm:w-[300px] md:w-[380px] h-auto"
            style={{
              filter:
                "drop-shadow(0 8px 16px hsl(var(--foreground) / 0.25)) drop-shadow(0 20px 40px hsl(var(--primary) / 0.35)) drop-shadow(0 30px 60px hsl(var(--accent) / 0.25))",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 blur-3xl"
        animate={{ scale: [1, 1.15, 1], opacity: [0.25, 0.45, 0.25] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle, hsl(var(--accent)) 0%, hsl(var(--primary) / 0.4) 40%, transparent 70%)",
        }}
      />

      <motion.div
        aria-hidden
        className="absolute inset-0 -z-10 blur-2xl opacity-30"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "conic-gradient(from 0deg, transparent, hsl(var(--primary) / 0.5), transparent, hsl(var(--accent) / 0.5), transparent)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.85, filter: "blur(20px)" }}
        animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        transition={{ duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
        className="relative"
        whileHover={{ scale: 1.04, rotate: -1 }}
      >
        <motion.img
          src={logo}
          alt="OQ MED"
          draggable={false}
          className="select-none w-[240px] sm:w-[300px] md:w-[380px] h-auto"
          style={{
            filter:
              "drop-shadow(0 8px 16px hsl(var(--foreground) / 0.25)) drop-shadow(0 20px 40px hsl(var(--primary) / 0.35)) drop-shadow(0 30px 60px hsl(var(--accent) / 0.25))",
          }}
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </motion.div>
    </div>
  );
}

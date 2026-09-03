import { useEffect, useState, useRef } from "react";
import { useInView, animate } from "framer-motion";

interface RollingNumberProps {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
}

export default function RollingNumber({ value, duration = 2, prefix = "", suffix = "" }: RollingNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  useEffect(() => {
    if (isInView) {
      const controls = animate(0, value, {
        duration: duration,
        onUpdate: (latest) => setDisplayValue(Math.floor(latest)),
        ease: "easeOut",
      });
      return () => controls.stop();
    }
  }, [isInView, value, duration]);

  return (
    <span ref={ref}>
      {prefix}
      {displayValue.toLocaleString("pt-BR")}
      {suffix}
    </span>
  );
}

import * as React from "react";
import { cn } from "@/lib/utils";
import { feedback } from "@/lib/sensory";

interface BigSwitchProps {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

/**
 * Chunky pill toggle inspired by tactile / Amazon Dash aesthetic.
 * Uses neumorphic shadows + accent color for ON state.
 */
export function BigSwitch({ checked, onCheckedChange, disabled, size = "md", label, className }: BigSwitchProps) {
  const dims = {
    sm: { w: 56, h: 32, pad: 4 },
    md: { w: 76, h: 42, pad: 5 },
    lg: { w: 96, h: 54, pad: 6 },
  }[size];
  const knob = dims.h - dims.pad * 2;
  const travel = dims.w - knob - dims.pad * 2;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => { if (!disabled) { feedback("tap"); onCheckedChange(!checked); } }}
      className={cn(
        "relative inline-flex shrink-0 items-center rounded-full transition-all duration-300",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        disabled && "opacity-50 cursor-not-allowed",
        className,
      )}
      style={{
        width: dims.w,
        height: dims.h,
        padding: dims.pad,
        background: checked
          ? "linear-gradient(135deg, hsl(210 83% 35%), hsl(205 67% 60%))"
          : "hsl(var(--background))",
        boxShadow: checked
          ? "inset 3px 3px 8px hsl(211 100% 8% / 0.55), inset -2px -2px 6px hsl(205 67% 75% / 0.45), 0 0 18px hsl(var(--accent) / 0.45)"
          : "inset 4px 4px 10px hsl(var(--neu-dark) / 0.7), inset -4px -4px 10px hsl(var(--neu-light) / 0.9)",
      }}
    >
      <span
        className="block rounded-full transition-transform duration-300"
        style={{
          width: knob,
          height: knob,
          transform: `translateX(${checked ? travel : 0}px)`,
          transitionTimingFunction: "cubic-bezier(0.34, 1.56, 0.64, 1)",
          background: "linear-gradient(160deg, #ffffff 0%, #e6ecf2 100%)",
          boxShadow:
            "0 4px 10px hsl(211 100% 11% / 0.35), 0 1px 0 hsl(0 0% 100%) inset, 0 -2px 4px hsl(218 24% 80% / 0.6) inset",
        }}
      />
    </button>
  );
}

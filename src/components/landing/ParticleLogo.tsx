import { useEffect, useRef } from "react";
import logo from "@/assets/logo-oq-hero.png";

/**
 * Hero com Shatter Effect: logo se fragmenta em milhares de partículas
 * conforme o usuário scrolla. Partículas reagem ao mouse/touch.
 * Renderizado em Canvas (60 FPS, requestAnimationFrame).
 */
export default function ParticleLogo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef({
    particles: [] as Particle[],
    mouse: { x: -9999, y: -9999, active: false },
    progress: 0, // 0 = logo intacto, 1 = totalmente fragmentado
    raf: 0,
    ready: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      const r = container!.getBoundingClientRect();
      canvas!.width = r.width * DPR;
      canvas!.height = r.height * DPR;
      canvas!.style.width = r.width + "px";
      canvas!.style.height = r.height + "px";
      ctx!.setTransform(DPR, 0, 0, DPR, 0, 0);
      buildParticles(r.width, r.height);
    }

    function buildParticles(w: number, h: number) {
      const img = new Image();
      img.src = logo;
      img.crossOrigin = "anonymous";
      img.onload = () => {
        // Tamanho do logo dentro do canvas
        const targetH = Math.min(h * 0.6, 380);
        const ratio = img.width / img.height;
        const drawH = targetH;
        const drawW = drawH * ratio;
        const offX = (w - drawW) / 2;
        const offY = (h - drawH) / 2;

        // Sample em offscreen
        const off = document.createElement("canvas");
        off.width = Math.floor(drawW);
        off.height = Math.floor(drawH);
        const octx = off.getContext("2d")!;
        octx.drawImage(img, 0, 0, off.width, off.height);
        const data = octx.getImageData(0, 0, off.width, off.height).data;

        const STEP = 4; // densidade
        const parts: Particle[] = [];
        for (let y = 0; y < off.height; y += STEP) {
          for (let x = 0; x < off.width; x += STEP) {
            const i = (y * off.width + x) * 4;
            const a = data[i + 3];
            if (a < 128) continue;
            const r = data[i], g = data[i + 1], b = data[i + 2];
            // Apenas pixels escuros (logo) ou navy do MED
            const lum = (r + g + b) / 3;
            if (lum > 220) continue;
            const isNavy = b > r && b > 30 && lum < 90;
            const color = isNavy
              ? "rgba(9,0,61,1)"
              : Math.random() > 0.85
              ? "rgba(22,89,255,1)"
              : "rgba(15,15,20,1)";
            parts.push({
              ox: offX + x,
              oy: offY + y,
              x: offX + x,
              y: offY + y,
              vx: 0,
              vy: 0,
              size: 1.4 + Math.random() * 1.2,
              color,
              angle: Math.random() * Math.PI * 2,
              spin: (Math.random() - 0.5) * 0.04,
            });
          }
        }
        stateRef.current.particles = parts;
        stateRef.current.ready = true;
      };
    }

    function tick() {
      const { particles, mouse, progress } = stateRef.current;
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      ctx!.clearRect(0, 0, w, h);

      const shatter = Math.min(1, Math.max(0, progress));
      for (let p of particles) {
        // Posição alvo "explodida"
        const dx = p.ox - w / 2;
        const dy = p.oy - h / 2;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const ex = p.ox + (dx / dist) * 220 * shatter + Math.cos(p.angle) * 40 * shatter;
        const ey = p.oy + (dy / dist) * 260 * shatter + Math.sin(p.angle) * 40 * shatter;

        // Suaviza em direção ao alvo
        p.x += (ex - p.x) * 0.12;
        p.y += (ey - p.y) * 0.12;

        // Repulsão do mouse
        if (mouse.active) {
          const mx = p.x - mouse.x;
          const my = p.y - mouse.y;
          const md = mx * mx + my * my;
          if (md < 90 * 90) {
            const f = (1 - md / 8100) * 8;
            p.x += (mx / Math.sqrt(md + 0.001)) * f;
            p.y += (my / Math.sqrt(md + 0.001)) * f;
          }
        }
        p.angle += p.spin;

        ctx!.fillStyle = p.color;
        ctx!.globalAlpha = 1 - shatter * 0.35;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      stateRef.current.raf = requestAnimationFrame(tick);
    }

    function onScroll() {
      const r = container!.getBoundingClientRect();
      const total = r.height + window.innerHeight * 0.6;
      const passed = Math.min(total, Math.max(0, -r.top + window.innerHeight * 0.2));
      stateRef.current.progress = passed / total;
    }

    function onMove(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      stateRef.current.mouse.x = e.clientX - r.left;
      stateRef.current.mouse.y = e.clientY - r.top;
      stateRef.current.mouse.active = true;
    }
    function onLeave() { stateRef.current.mouse.active = false; }

    resize();
    onScroll();
    window.addEventListener("resize", resize);
    window.addEventListener("scroll", onScroll, { passive: true });
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    stateRef.current.raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(stateRef.current.raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("scroll", onScroll);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div ref={containerRef} className="absolute inset-0 pointer-events-none">
      <canvas ref={canvasRef} className="w-full h-full pointer-events-auto" />
    </div>
  );
}

type Particle = {
  ox: number; oy: number;
  x: number; y: number;
  vx: number; vy: number;
  size: number;
  color: string;
  angle: number;
  spin: number;
};

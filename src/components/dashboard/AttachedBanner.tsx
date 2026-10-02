import { useEffect, useState } from "react";
import {
  Bot,
  CheckCircle2,
  ChevronRight,
  Crosshair,
  FileText,
  Flame,
  Headphones,
  LayoutList,
  Map,
  PenTool,
  RefreshCw,
  Settings,
  Sparkles,
  Target,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Slide = { badge: string; title: string; subtitle: string; tone: "sky" | "rose" | "indigo" };

const slides: Slide[] = [
  { badge: "O Fluxo Perfeito", title: "O dia a dia da aprovação", subtitle: "Deixe o algoritmo guiar sua rotina. Você só precisa sentar e estudar.", tone: "sky" },
  { badge: "1 Erro = 3 Acertos", title: "Transforme erros em aprovação", subtitle: "O simulado só tem valor se você consertar suas falhas cirurgicamente.", tone: "rose" },
  { badge: "Inteligência Artificial", title: "O Hack do Cursinho", subtitle: "Extraia o suco das suas aulas transformando-as em estudo ativo na hora.", tone: "indigo" },
];

const toneClasses = {
  sky: { badge: "bg-sky-50 text-sky-600 border-sky-100", fill: "bg-sky-500" },
  rose: { badge: "bg-rose-50 text-rose-600 border-rose-100", fill: "bg-rose-500" },
  indigo: { badge: "bg-indigo-50 text-indigo-600 border-indigo-100", fill: "bg-indigo-500" },
};

const animationStyles = `
  @keyframes attached-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  @keyframes attached-timeline { 0% { top: -10%; opacity: 0; } 20%, 80% { opacity: 1; } 100% { top: 100%; opacity: 0; } }
  @keyframes attached-audio { 0%, 100% { transform: scaleY(.4); opacity: .6; } 50% { transform: scaleY(1); opacity: 1; } }
  @keyframes attached-drop-in { 0% { top: -30px; opacity: 0; transform: translateX(-50%) rotate(-15deg); } 15% { top: 15px; opacity: 1; transform: translateX(-50%) rotate(5deg); } 40% { top: 60px; opacity: 0; transform: translateX(-50%) scale(.3); } 100% { top: 60px; opacity: 0; } }
  @keyframes attached-pop-out { 0%, 40% { top: 60px; opacity: 0; transform: translateX(-50%) scale(.3); } 50% { top: 60px; opacity: 1; transform: translateX(var(--tx)) scale(1.15) rotate(var(--rot)); } 80% { top: 130px; opacity: 1; transform: translateX(var(--tx)) rotate(var(--rot)); } 100% { top: 170px; opacity: 0; transform: translateX(var(--tx)) scale(.8) rotate(var(--rot)); } }
  @keyframes attached-scan { 0% { top: -20%; opacity: 0; } 10%, 90% { opacity: 1; } 100% { top: 120%; opacity: 0; } }
  @keyframes attached-orbit { to { transform: rotate(360deg); } }
  @keyframes attached-counter-orbit { 0% { transform: rotate(0deg) rotateY(0deg); } 50% { transform: rotate(-180deg) rotateY(180deg); } 100% { transform: rotate(-360deg) rotateY(360deg); } }
  @keyframes attached-progress { from { width: 0%; } to { width: 100%; } }
  .attached-stagger { animation: attached-fade-up .6s cubic-bezier(.16,1,.3,1) both; }
  .attached-stagger-1 { animation-delay: .1s; } .attached-stagger-2 { animation-delay: .2s; } .attached-stagger-3 { animation-delay: .3s; } .attached-stagger-4 { animation-delay: .4s; } .attached-stagger-5 { animation-delay: .5s; }
  .attached-timeline-line { position: absolute; bottom: 15px; left: 23px; top: 15px; width: 2px; border-radius: 2px; background: #e2e8f0; }
  .attached-timeline-glow { position: absolute; left: -1.5px; width: 5px; height: 25%; border-radius: 4px; background: linear-gradient(to bottom, transparent, #0ea5e9, transparent); animation: attached-timeline 5s infinite ease-in-out; }
  .attached-audio-wave { display: flex; align-items: flex-end; gap: 3px; height: 20px; }
  .attached-audio-bar { width: 4px; border-radius: 2px; transform-origin: bottom; animation: attached-audio 1.2s ease-in-out infinite; }
  .attached-audio-bar:nth-child(1) { animation-delay: .1s; height: 10px; } .attached-audio-bar:nth-child(2) { animation-delay: .3s; height: 18px; } .attached-audio-bar:nth-child(3) { height: 14px; } .attached-audio-bar:nth-child(4) { animation-delay: .4s; height: 20px; } .attached-audio-bar:nth-child(5) { animation-delay: .2s; height: 12px; }
  .attached-card-in { position: absolute; left: 50%; z-index: 20; width: 26px; height: 34px; border-radius: 4px; background: #ef4444; box-shadow: 0 4px 8px rgba(239,68,68,.3); animation: attached-drop-in 3s infinite cubic-bezier(.4,0,.2,1); }
  .attached-card-out { position: absolute; top: 60px; z-index: 15; width: 24px; height: 32px; border-radius: 4px; background: #10b981; box-shadow: 0 4px 8px rgba(16,185,129,.3); animation: attached-pop-out 3s infinite cubic-bezier(.4,0,.2,1); }
  .attached-card-in::after, .attached-card-out::after { content: ''; position: absolute; top: 6px; left: 4px; right: 4px; height: 2px; border-radius: 1px; background: rgba(255,255,255,.7); box-shadow: 0 6px 0 rgba(255,255,255,.7), 0 12px 0 rgba(255,255,255,.7); }
  .attached-card-left { left: 50%; --tx: -40px; --rot: -20deg; } .attached-card-center { left: 50%; --tx: -50%; --rot: 0deg; animation-delay: .12s; } .attached-card-right { left: 50%; --tx: 15px; --rot: 20deg; animation-delay: .24s; }
  .attached-gear { animation: spin 4s linear infinite; } .attached-scanner-line { position: absolute; left: 0; right: 0; z-index: 10; height: 3px; background: #0ea5e9; box-shadow: 0 0 20px 4px rgba(14,165,233,.5); animation: attached-scan 2s infinite ease-in-out; } .attached-scanner-gradient { position: absolute; bottom: 100%; left: 0; right: 0; height: 60px; background: linear-gradient(to bottom, transparent, rgba(14,165,233,.15)); }
  .attached-orbit { animation: attached-orbit 8s infinite linear; } .attached-flip-card { transform-style: preserve-3d; animation: attached-counter-orbit 8s infinite linear; }
  .attached-hover-lift { transition: all .3s cubic-bezier(.4,0,.2,1); } .attached-hover-lift:hover { transform: translateY(-4px); box-shadow: 0 16px 30px -10px rgba(14,165,233,.15); border-color: rgba(14,165,233,.3); background: white; }
  @media (prefers-reduced-motion: reduce) { .attached-stagger, .attached-timeline-glow, .attached-audio-bar, .attached-card-in, .attached-card-out, .attached-gear, .attached-scanner-line, .attached-orbit, .attached-flip-card { animation: none; } }
`;

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("attached-hover-lift rounded-2xl border border-slate-100 bg-white/85 p-5 shadow-sm", className)}>{children}</div>;
}

function TimelineSlide() {
  const items = [
    [Map, "1. Trilha Estratégica", "O seu mapa diário moldado para o ENARE e PSU."],
    [Headphones, "2. Resumos & Áudio-aulas", "Teoria nativa em texto ou áudio, focada na alta incidência."],
    [Target, "3. OQs de Fixação", "Sua vez. Você lembra a resposta exata, ou você erra."],
    [RefreshCw, "4. Revisão Automática", "O algoritmo agenda suas pendências para o momento perfeito."],
  ] as const;
  return <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-3">
    <div className="attached-timeline-line"><div className="attached-timeline-glow" /></div>
    {items.map(([Icon, title, text], index) => <div key={title} className={cn("attached-stagger relative z-10 flex items-center gap-4 rounded-2xl border bg-white/85 p-3.5 shadow-sm", `attached-stagger-${index + 2}`, index === 2 ? "border-sky-200" : "border-slate-100")}>
      <div className={cn("rounded-xl border p-3", index === 2 ? "border-sky-200 bg-sky-500 text-white" : "border-slate-100 bg-slate-50 text-slate-700")}><Icon className="h-5 w-5" /></div>
      <div className="flex-1"><h3 className={cn("flex items-center gap-2 text-[15px] font-bold", index === 2 ? "text-sky-600" : "text-slate-800")}>{title}{index === 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">Automático</span>}{index === 2 && <span className="ml-auto flex items-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-2 py-1 text-[10px] text-sky-600"><PenTool className="h-3 w-3" /> Estudo Ativo</span>}</h3><p className="mt-0.5 text-xs font-medium text-slate-500">{text}</p></div>
      {index === 1 && <div className="attached-audio-wave"><i className="attached-audio-bar bg-indigo-500" /><i className="attached-audio-bar bg-indigo-500" /><i className="attached-audio-bar bg-indigo-500" /><i className="attached-audio-bar bg-indigo-500" /><i className="attached-audio-bar bg-indigo-500" /></div>}
    </div>)}
  </div>;
}

function FunnelSlide() {
  return <div className="space-y-8">
    <div className="attached-stagger attached-stagger-2 flex h-52 items-center justify-center">
      <div className="relative flex w-full max-w-xl items-center justify-between px-10">
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white shadow-lg"><LayoutList className="h-8 w-8 text-slate-800" /></div>
        <div className="relative mx-4 flex h-48 w-40 flex-col items-center justify-center"><div className="attached-card-in" /><div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[1.5rem] border-2 border-rose-500 bg-gradient-to-b from-white to-rose-50/30 shadow-[0_10px_30px_rgba(244,63,94,0.2)]"><Settings className="attached-gear h-10 w-10 text-rose-500" /><span className="absolute -bottom-3 flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-md"><Flame className="h-3 w-3" /> CASTIGO</span></div><div className="attached-card-out attached-card-left" /><div className="attached-card-out attached-card-center" /><div className="attached-card-out attached-card-right" /></div>
        <div className="relative z-10 flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 shadow-lg shadow-emerald-100"><CheckCircle2 className="h-7 w-7 text-emerald-500" /><span className="text-[10px] font-bold text-emerald-600">3x OQs</span></div>
      </div>
    </div>
    <div className="grid gap-4 text-center md:grid-cols-3">{[["1. O Raio-X", "Faça simulados focados no ENARE/PSU para diagnosticar exatamente onde você perde pontos."], ["2. O Castigo", "O app rastreia cada questão errada e gera 3 novas questões de fixação para curar essa falha."], ["3. A Cura", "Você preenche a lacuna do conhecimento. O erro é liquidado e sua pontuação global sobe."]].map(([title, text], index) => <GlassCard key={title} className={cn("attached-stagger", `attached-stagger-${index + 3}`, index === 1 && "border-rose-100", index === 2 && "border-emerald-100")}><h3 className={cn("mb-1.5 text-sm font-bold", index === 1 ? "text-rose-600" : index === 2 ? "text-emerald-600" : "text-slate-800")}>{title}</h3><p className="text-xs font-medium leading-relaxed text-slate-500">{text}</p></GlassCard>)}</div>
  </div>;
}

function AiSlide() {
  return <div className="space-y-8">
    <div className="attached-stagger attached-stagger-2 flex h-48 items-center justify-center"><div className="flex w-full max-w-3xl items-center justify-center gap-6 md:gap-12">
      <div className="relative h-44 w-32 rounded-xl border border-slate-200 bg-white p-5 shadow-lg"><FileText className="absolute right-3 top-3 h-4 w-4 text-slate-300" />{["w-full", "w-3/4", "w-5/6", "w-full", "w-1/2"].map(width => <div key={width} className={cn("mb-4 h-2.5 rounded-full bg-slate-100", width)} />)}<div className="attached-scanner-line"><div className="attached-scanner-gradient" /></div></div>
      <div className="flex flex-col items-center text-sky-500"><div className="mb-2 rounded-full border border-sky-100 bg-sky-50 p-3 shadow-sm"><Sparkles className="h-6 w-6 animate-pulse" /></div><div className="flex gap-1"><ChevronRight className="animate-pulse text-sky-500/40" /><ChevronRight className="animate-pulse text-sky-500/70 [animation-delay:200ms]" /><ChevronRight className="animate-pulse text-sky-500 [animation-delay:400ms]" /></div></div>
      <div className="relative flex h-40 w-40 items-center justify-center"><div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200" /><div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-[10px] bg-slate-900 text-sm font-bold text-white shadow-lg">OQ</div><div className="attached-orbit absolute inset-0"><div className="attached-flip-card absolute -top-6 left-1/2 flex h-16 w-12 -translate-x-1/2 items-center justify-center rounded-lg border-2 border-sky-400 bg-white text-[10px] font-bold text-sky-500 shadow-md">OQ</div><div className="attached-flip-card absolute -bottom-6 left-1/2 flex h-16 w-12 -translate-x-1/2 items-center justify-center rounded-lg border-2 border-slate-900 bg-slate-900 text-[10px] font-bold text-white shadow-md [animation-delay:-4s]">?</div></div></div>
    </div></div>
    <div className="grid gap-4 text-center md:grid-cols-3">{[["1. Estudo Passivo", "Alimente a plataforma com suas anotações ou resumo em PDF."], ["2. Magia da IA", "Nossa IA lê o material e constrói dezenas de OQs cirúrgicos."], ["3. Domínio Absoluto", "As questões entram no algoritmo e retornam nos dias de revisão."]].map(([title, text], index) => <GlassCard key={title} className={cn("attached-stagger", `attached-stagger-${index + 3}`, index === 1 && "border-sky-200")}><h3 className={cn("mb-1.5 text-sm font-bold", index === 1 ? "text-sky-600" : "text-slate-800")}>{title}</h3><p className="text-xs font-medium leading-relaxed text-slate-500">{text}</p></GlassCard>)}</div>
  </div>;
}

export default function AttachedBanner() {
  const [current, setCurrent] = useState(0);
  const [closed, setClosed] = useState(false);
  const slide = slides[current];
  const tone = toneClasses[slide.tone];

  useEffect(() => {
    if (closed) return;
    const timer = window.setTimeout(() => setCurrent(value => (value + 1) % slides.length), 9000);
    return () => window.clearTimeout(timer);
  }, [closed, current]);

  if (closed) return null;

  return <section className="relative w-full py-4 md:py-8">
    <style>{animationStyles}</style>
    <div className="relative mx-auto min-h-[580px] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_50px_-12px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(226,232,240,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.6)_1px,transparent_1px)] [background-size:24px_24px]" />
      <button aria-label="Fechar banner" onClick={() => setClosed(true)} className="absolute right-4 top-4 z-30 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
      <div className="absolute left-0 right-0 top-0 z-20 h-1.5 bg-slate-100"><div key={current} className={cn("relative h-full overflow-hidden rounded-r-full", tone.fill)} style={{ animation: "attached-progress 9s linear forwards" }}><div className="absolute inset-0 animate-pulse bg-white/30" /></div></div>
      <div key={current} className="relative z-10 flex min-h-[520px] flex-col justify-center p-6 pt-14 md:p-10 md:pt-16"><div className="attached-stagger attached-stagger-1 mb-8 text-center"><span className={cn("mb-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider", tone.badge)}>{current === 0 ? <Zap className="h-3.5 w-3.5" /> : current === 1 ? <Crosshair className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}{slide.badge}</span><h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{slide.title}</h2><p className="mt-2 text-sm font-medium text-slate-500">{slide.subtitle}</p></div>{current === 0 ? <TimelineSlide key="timeline" /> : current === 1 ? <FunnelSlide key="funnel" /> : <AiSlide key="ai" />}</div>
      <div className="relative z-20 flex items-center justify-center gap-2 border-t border-slate-100 bg-white/85 p-5 backdrop-blur-md">{slides.map((item, index) => <button key={item.title} aria-label={`Ir para slide ${index + 1}`} onClick={() => setCurrent(index)} className={cn("h-2.5 rounded-full transition-all duration-300", index === current ? "w-12 bg-sky-500" : "w-3 bg-slate-200 hover:bg-slate-300")} />)}</div>
    </div>
  </section>;
}

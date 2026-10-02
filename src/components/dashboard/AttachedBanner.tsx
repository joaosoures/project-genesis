import { useEffect, useState, type ReactNode } from "react";
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
import { useSettings } from "@/contexts/SettingsContext";

const TIME_PER_SLIDE = 9000;

const bannerStyles = `
  .attached-banner { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .attached-bg-grid { background-image: linear-gradient(to right, rgba(226,232,240,.6) 1px, transparent 1px), linear-gradient(to bottom, rgba(226,232,240,.6) 1px, transparent 1px); background-size: 24px 24px; }
  .attached-stagger-1 { animation: attached-fade-up .6s cubic-bezier(.16,1,.3,1) .1s both; }
  .attached-stagger-2 { animation: attached-fade-up .6s cubic-bezier(.16,1,.3,1) .2s both; }
  .attached-stagger-3 { animation: attached-fade-up .6s cubic-bezier(.16,1,.3,1) .3s both; }
  .attached-stagger-4 { animation: attached-fade-up .6s cubic-bezier(.16,1,.3,1) .4s both; }
  .attached-stagger-5 { animation: attached-fade-up .6s cubic-bezier(.16,1,.3,1) .5s both; }
  @keyframes attached-fade-up { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
  .attached-timeline-line { position:absolute; left:23px; top:15px; bottom:15px; width:2px; background:#e2e8f0; border-radius:2px; z-index:0; }
  .attached-timeline-glow { position:absolute; left:-1.5px; width:5px; height:25%; background:linear-gradient(to bottom, transparent,#0ea5e9,transparent); border-radius:4px; animation:attached-move-down 5s infinite ease-in-out; }
  @keyframes attached-move-down { 0% { top:-10%; opacity:0; } 20% { opacity:1; } 80% { opacity:1; } 100% { top:100%; opacity:0; } }
  .attached-audio-wave { display:flex; align-items:flex-end; gap:3px; height:20px; }
  .attached-audio-bar { width:4px; background:#6366f1; border-radius:2px; animation:attached-bounce-audio 1.2s ease-in-out infinite; transform-origin:bottom; }
  .attached-audio-bar:nth-child(1) { animation-delay:.1s; height:10px; } .attached-audio-bar:nth-child(2) { animation-delay:.3s; height:18px; } .attached-audio-bar:nth-child(3) { height:14px; } .attached-audio-bar:nth-child(4) { animation-delay:.4s; height:20px; } .attached-audio-bar:nth-child(5) { animation-delay:.2s; height:12px; }
  @keyframes attached-bounce-audio { 0%,100% { transform:scaleY(.4); opacity:.6; } 50% { transform:scaleY(1); opacity:1; } }
  .attached-card-in { width:26px; height:34px; border-radius:4px; background:#ef4444; position:absolute; left:50%; transform:translateX(-50%); animation:attached-drop-in 3s infinite cubic-bezier(.4,0,.2,1); z-index:20; box-shadow:0 4px 8px rgba(239,68,68,.3); }
  .attached-card-out { width:24px; height:32px; border-radius:4px; background:#10b981; position:absolute; top:60px; z-index:15; box-shadow:0 4px 8px rgba(16,185,129,.3); animation:attached-pop-out 3s infinite cubic-bezier(.4,0,.2,1); }
  .attached-card-in::after,.attached-card-out::after { content:''; position:absolute; top:6px; left:4px; right:4px; height:2px; background:rgba(255,255,255,.7); border-radius:1px; box-shadow:0 6px 0 rgba(255,255,255,.7),0 12px 0 rgba(255,255,255,.7); }
  .attached-card-left { left:50%; --attached-tx:-40px; --attached-rot:-20deg; } .attached-card-center { left:50%; --attached-tx:-50%; --attached-rot:0deg; animation-delay:.12s; } .attached-card-right { left:50%; --attached-tx:15px; --attached-rot:20deg; animation-delay:.24s; }
  @keyframes attached-drop-in { 0% { top:-30px; opacity:0; transform:translateX(-50%) rotate(-15deg); } 15% { top:15px; opacity:1; transform:translateX(-50%) rotate(5deg); } 40% { top:60px; opacity:0; transform:translateX(-50%) scale(.3) rotate(0deg); } 100% { top:60px; opacity:0; } }
  @keyframes attached-pop-out { 0%,40% { top:60px; opacity:0; transform:translateX(-50%) scale(.3); } 50% { top:60px; opacity:1; transform:translateX(var(--attached-tx)) scale(1.15) rotate(var(--attached-rot)); } 80% { top:130px; opacity:1; transform:translateX(var(--attached-tx)) rotate(var(--attached-rot)); } 100% { top:170px; opacity:0; transform:translateX(var(--attached-tx)) scale(.8) rotate(var(--attached-rot)); } }
  .attached-gear-spin { animation:attached-spin 4s linear infinite; } @keyframes attached-spin { 100% { transform:rotate(360deg); } }
  @keyframes attached-progress { from { width:0%; } to { width:100%; } }
  .attached-scanner-line { position:absolute; left:0; right:0; height:3px; background:#0ea5e9; box-shadow:0 0 20px 4px rgba(14,165,233,.5); animation:attached-scan-doc 2s infinite ease-in-out; z-index:10; }
  .attached-scanner-gradient { position:absolute; left:0; right:0; height:60px; background:linear-gradient(to bottom,transparent,rgba(14,165,233,.15)); bottom:100%; }
  @keyframes attached-scan-doc { 0% { top:-20%; opacity:0; } 10% { opacity:1; } 90% { opacity:1; } 100% { top:120%; opacity:0; } }
  .attached-orbit { animation:attached-orbit 8s infinite linear; } .attached-flip-card { animation:attached-counter-orbit-and-flip 8s infinite linear; transform-style:preserve-3d; }
  @keyframes attached-orbit { 0% { transform:rotate(0deg); } 100% { transform:rotate(360deg); } }
  @keyframes attached-counter-orbit-and-flip { 0% { transform:rotate(0deg) rotateY(0deg); } 50% { transform:rotate(-180deg) rotateY(180deg); } 100% { transform:rotate(-360deg) rotateY(360deg); } }
  .attached-hover-lift { transition:all .3s cubic-bezier(.4,0,.2,1); } .attached-hover-lift:hover { transform:translateY(-4px); box-shadow:0 16px 30px -10px rgba(14,165,233,.15); border-color:rgba(14,165,233,.3); background:white; }
  .attached-banner[data-reduce-motion="1"] .attached-stagger-1,.attached-banner[data-reduce-motion="1"] .attached-stagger-2,.attached-banner[data-reduce-motion="1"] .attached-stagger-3,.attached-banner[data-reduce-motion="1"] .attached-stagger-4,.attached-banner[data-reduce-motion="1"] .attached-stagger-5,.attached-banner[data-reduce-motion="1"] .attached-timeline-glow,.attached-banner[data-reduce-motion="1"] .attached-audio-bar,.attached-banner[data-reduce-motion="1"] .attached-card-in,.attached-banner[data-reduce-motion="1"] .attached-card-out,.attached-banner[data-reduce-motion="1"] .attached-gear-spin,.attached-banner[data-reduce-motion="1"] .attached-scanner-line,.attached-banner[data-reduce-motion="1"] .attached-orbit,.attached-banner[data-reduce-motion="1"] .attached-flip-card { animation:none; }
  .attached-banner[data-reduce-motion="1"] .attached-hover-lift { transition:none; }
  .attached-banner[data-reduce-motion="1"] .attached-progress-shimmer { animation:none; }
`;

function GlassCard({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("attached-hover-lift glass-card rounded-2xl border border-white/50 bg-white/85 p-5 shadow-sm", className)}>{children}</div>;
}

function TimelineSlide() {
  const items = [
    { icon: Map, title: "1. Trilha Estratégica", text: "O seu mapa diário moldado para o ENARE e PSU." },
    { icon: Headphones, title: "2. Resumos & Áudio-aulas", text: "Teoria nativa em texto ou áudio, focada na alta incidência." },
    { icon: Target, title: "3. OQs de Fixação", text: "Sua vez. Você lembra a resposta exata, ou você erra." },
    { icon: RefreshCw, title: "4. Revisão Automática", text: "O algoritmo agenda suas pendências para o momento perfeito." },
  ];
  return <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-3">
    <div className="attached-timeline-line"><div className="attached-timeline-glow" /></div>
    {items.map(({ icon: Icon, title, text }, index) => <div key={title} className={cn(`attached-stagger-${index + 2}`, "attached-hover-lift glass-card relative z-10 flex cursor-default items-center gap-5 rounded-2xl border border-slate-100 p-3.5 shadow-sm", index === 2 && "border-sky-200")}>
      <div className={cn("rounded-xl border p-3 shadow-sm", index === 1 ? "border-indigo-100 bg-indigo-50 text-indigo-600" : index === 2 ? "border-sky-500 bg-sky-500 text-white shadow-md" : "border-slate-100 bg-slate-50 text-slate-900")}><Icon className="h-5 w-5" /></div>
      <div className="flex-1">{index === 2 ? <h3 className="flex w-full items-center justify-between text-[15px] font-bold text-sky-600">{title}<span className="flex items-center gap-1 rounded-md border border-sky-100 bg-sky-50 px-2 py-1 text-[10px] font-bold text-sky-600"><PenTool className="h-3 w-3" /> Estudo Ativo</span></h3> : <h3 className={cn("flex items-center gap-2 text-[15px] font-bold", index === 1 ? "text-indigo-700" : "text-slate-900")}>{title}{index === 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] uppercase tracking-wide text-slate-500">Automático</span>}</h3>}<p className="mt-0.5 text-xs font-medium text-slate-500">{text}</p></div>
      {index === 1 && <div className="attached-audio-wave"><i className="attached-audio-bar" /><i className="attached-audio-bar" /><i className="attached-audio-bar" /><i className="attached-audio-bar" /><i className="attached-audio-bar" /></div>}
    </div>)}
  </div>;
}

function FunnelSlide() {
  const cards: Array<[string, ReactNode]> = [["1. O Raio-X", "Faça simulados focados no ENARE/PSU para diagnosticar exatamente onde você perde pontos."], ["2. O Castigo", <>O app rastreia cada questão errada e gera <strong className="text-rose-500">3 novas questões de fixação</strong> para curar essa falha.</>], ["3. A Cura", "Você preenche a lacuna do conhecimento. O erro é liquidado e sua pontuação global sobe."]];
  return <>
    <div className="attached-stagger-2 mb-8 flex h-52 items-center justify-center">
      <div className="relative flex w-full max-w-xl items-center justify-between px-10">
        <div className="relative z-10 flex h-20 w-20 items-center justify-center rounded-[1.25rem] border border-slate-200 bg-white shadow-lg"><LayoutList className="h-8 w-8 text-slate-900" /></div>
        <div className="relative mx-4 flex h-48 w-40 flex-col items-center justify-center"><div className="attached-card-in" /><div className="relative z-10 flex h-28 w-28 items-center justify-center rounded-[1.5rem] border-2 border-rose-500 bg-gradient-to-b from-white to-rose-50/30 shadow-[0_10px_30px_rgba(244,63,94,0.2)]"><Settings className="attached-gear-spin h-10 w-10 text-rose-500" /><span className="absolute -bottom-3 flex items-center gap-1 rounded-full bg-rose-500 px-3 py-1.5 text-[10px] font-bold text-white shadow-md"><Flame className="h-3 w-3" /> CASTIGO</span></div><div className="attached-card-out attached-card-left" /><div className="attached-card-out attached-card-center" /><div className="attached-card-out attached-card-right" /></div>
        <div className="relative z-10 flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-[1.25rem] border border-emerald-200 bg-emerald-50 shadow-[0_10px_30px_rgba(16,185,129,0.2)]"><CheckCircle2 className="h-7 w-7 text-emerald-500" /><span className="text-[10px] font-bold text-emerald-600">3x OQs</span></div>
      </div>
    </div>
    <div className="mx-auto grid max-w-4xl gap-4 text-center md:grid-cols-3">{cards.map(([title, text], index) => <GlassCard key={title} className={cn(`attached-stagger-${index + 3}`, index === 1 && "border-rose-100 bg-white/90", index === 2 && "border-emerald-100 bg-white/90")}><h3 className={cn("mb-1.5 text-sm font-bold", index === 1 ? "text-rose-600" : index === 2 ? "text-emerald-600" : "text-slate-900")}>{title}</h3><p className="text-xs font-medium leading-relaxed text-slate-500">{text}</p></GlassCard>)}</div>
  </>;
}

function AiSlide() {
  const cards: Array<[string, ReactNode]> = [["1. Estudo Passivo", "Assistiu à aula no cursinho? Alimente a plataforma com as suas anotações ou resumo em PDF."], ["2. Magia da IA", "Nossa IA lê todo o material em segundos e constrói dezenas de OQs cirúrgicos na hora para você."], ["3. Domínio Absoluto", "As questões geradas entram no seu algoritmo e retornam magicamente nos dias de revisão programada."]];
  return <>
    <div className="attached-stagger-2 mb-10 flex h-48 items-center justify-center"><div className="flex w-full max-w-3xl items-center justify-center gap-6 md:gap-12">
      <div className="relative h-44 w-32 rounded-xl border border-slate-200 bg-white p-5 shadow-lg"><div className="absolute right-3 top-3"><FileText className="h-4 w-4 text-slate-300" /></div>{["w-full", "w-3/4", "w-5/6", "w-full", "w-1/2"].map(width => <div key={width} className={`${width} mb-4 mt-2 h-2.5 rounded-full bg-slate-100`} />)}<div className="attached-scanner-line"><div className="attached-scanner-gradient" /></div></div>
      <div className="flex flex-col items-center text-sky-500"><div className="relative mb-2 rounded-full border border-sky-100 bg-sky-50 p-3 shadow-sm"><Sparkles className="relative z-10 h-6 w-6 animate-pulse" /></div><div className="flex gap-1"><ChevronRight className="h-5 w-5 animate-pulse text-sky-500/40" /><ChevronRight className="h-5 w-5 animate-pulse text-sky-500/70 [animation-delay:200ms]" /><ChevronRight className="h-5 w-5 animate-pulse text-sky-500 [animation-delay:400ms]" /></div></div>
      <div className="relative flex h-40 w-40 items-center justify-center"><div className="absolute inset-0 rounded-full border-2 border-dashed border-slate-200" /><div className="relative z-10 flex h-14 w-14 items-center justify-center"><div className="absolute inset-0 rotate-12 rounded-[10px] bg-sky-500 opacity-20" /><div className="absolute inset-0 flex items-center justify-center rounded-[10px] bg-slate-900 text-sm font-bold tracking-tighter text-white shadow-lg">OQ</div></div><div className="attached-orbit absolute inset-0"><div className="attached-flip-card absolute -top-6 left-1/2 flex h-16 w-12 -translate-x-1/2 items-center justify-center rounded-lg border-2 border-sky-400 bg-white text-[10px] font-bold text-sky-500 shadow-md">OQ</div><div className="attached-flip-card absolute -bottom-6 left-1/2 flex h-16 w-12 -translate-x-1/2 items-center justify-center rounded-lg border-2 border-slate-900 bg-slate-900 text-[10px] font-bold text-white shadow-md" style={{ animationDelay: "-4s" }}>?</div></div></div>
    </div></div>
    <div className="mx-auto grid max-w-4xl gap-4 text-center md:grid-cols-3">{cards.map(([title, text], index) => <GlassCard key={title} className={cn(`attached-stagger-${index + 3}`, index === 1 && "border-sky-500/20 bg-white/90")}><h3 className={cn("mb-1.5 text-sm font-bold", index === 1 ? "text-sky-500" : "text-slate-900")}>{title}</h3><p className="text-xs font-medium leading-relaxed text-slate-500">{text}</p></GlassCard>)}</div>
  </>;
}

export default function AttachedBanner() {
  const { reduceMotion } = useSettings();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [closed, setClosed] = useState(false);

  useEffect(() => {
    if (closed || reduceMotion) return;
    const timer = window.setTimeout(() => setCurrentSlide(current => (current + 1) % 3), TIME_PER_SLIDE);
    return () => window.clearTimeout(timer);
  }, [closed, currentSlide, reduceMotion]);

  if (closed) return null;

  const goToSlide = (index: number) => setCurrentSlide(index);
  const slideHeader = [
    { icon: Zap, label: "O Fluxo Perfeito", badge: "bg-sky-50 text-sky-600 border-sky-100", title: "O dia a dia da aprovação", subtitle: "Deixe o algoritmo guiar sua rotina. Você só precisa sentar e estudar." },
    { icon: Crosshair, label: "1 Erro = 3 Acertos", badge: "bg-rose-50 text-rose-600 border-rose-100", title: "Transforme erros em aprovação", subtitle: "O simulado só tem valor se você consertar suas falhas cirurgicamente." },
    { icon: Bot, label: "Inteligência Artificial", badge: "bg-indigo-50 text-indigo-600 border-indigo-100", title: "O Hack do Cursinho", subtitle: "Extraia o suco das suas aulas transformando-as em estudo ativo na hora." },
  ][currentSlide];
  const HeaderIcon = slideHeader.icon;

  return <section className="attached-banner relative w-full py-4 md:py-8" data-reduce-motion={reduceMotion ? "1" : "0"}>
    <style>{bannerStyles}</style>
    <div className="relative mx-auto flex min-h-[580px] w-full max-w-5xl flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_50px_-12px_rgba(15,23,42,0.1),0_0_0_1px_rgba(15,23,42,0.03)]">
      <div className="attached-bg-grid pointer-events-none absolute inset-0" />
      <div className="absolute left-0 right-0 top-0 z-50 h-1.5 bg-slate-100"><div key={currentSlide} className="relative h-full w-0 overflow-hidden rounded-r-full bg-sky-500" style={reduceMotion ? { width: "100%" } : { animation: `attached-progress ${TIME_PER_SLIDE}ms linear forwards` }}><div className={cn("attached-progress-shimmer absolute inset-0 bg-white/30", !reduceMotion && "animate-pulse")} /></div></div>
      <button type="button" aria-label="Fechar banner" onClick={() => setClosed(true)} className="absolute right-4 top-4 z-[60] rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
      <div key={currentSlide} className="relative z-10 flex flex-1 flex-col justify-center p-6 md:p-10">
        <div className="attached-stagger-1 mb-8 text-center"><span className={cn("mb-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider", slideHeader.badge)}><HeaderIcon className="h-3.5 w-3.5" /> {slideHeader.label}</span><h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{slideHeader.title}</h1><p className="mt-2 text-sm font-medium text-slate-500">{slideHeader.subtitle}</p></div>
        {currentSlide === 0 ? <TimelineSlide /> : currentSlide === 1 ? <FunnelSlide /> : <AiSlide />}
      </div>
      <div className="relative z-20 flex items-center justify-center gap-4 border-t border-slate-100 bg-white/80 p-6 backdrop-blur-md">{[0, 1, 2].map(index => <button type="button" key={index} onClick={() => goToSlide(index)} aria-label={`Ir para slide ${index + 1}`} className={cn("h-2.5 rounded-full transition-all duration-300", currentSlide === index ? "w-12 bg-sky-500 shadow-sm" : "w-3 bg-slate-200 hover:bg-slate-300")} />)}</div>
    </div>
  </section>;
}

import { useEffect, useState } from "react";
import {
  CalendarClock,
  History,
  Layers,
  Lightbulb,
  ListChecks,
  MousePointerClick,
  RefreshCw,
  TextCursorInput,
  WholeWord,
  Cpu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

const SLIDE_TIME = 12000;

const styles = `
  .methodology-showcase { font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
  .methodology-grid { background-image: linear-gradient(to right, rgba(226,232,240,.7) 1px, transparent 1px), linear-gradient(to bottom, rgba(226,232,240,.7) 1px, transparent 1px); background-size: 32px 32px; }
  .methodology-fade-up { animation: methodology-fade-up .8s cubic-bezier(.16,1,.3,1) both; }
  .methodology-float-1 { animation: methodology-float 6s ease-in-out infinite; }
  .methodology-float-2 { animation: methodology-float 6s ease-in-out 2s infinite; }
  .methodology-float-3 { animation: methodology-float 6s ease-in-out 4s infinite; }
  .methodology-strike { animation: methodology-strike 12s infinite; position: relative; }
  .methodology-strike::after { content:''; position:absolute; left:0; top:50%; height:2px; background:#ef4444; border-radius:2px; animation: methodology-draw 12s infinite; transform-origin:left; }
  .methodology-fade-option { animation: methodology-option 12s infinite; }
  .methodology-reveal::before { content:'_ _ _ _ _ _ _'; animation: methodology-word 12s infinite; color:#0ea5e9; font-family:monospace; letter-spacing:2px; }
  .methodology-bulb { animation: methodology-bulb 12s infinite; }
  .methodology-algo-bulb { animation: methodology-algo-bulb 12s infinite; }
  .methodology-algo-glow { animation: methodology-algo-glow 12s infinite; }
  .methodology-algo-badge { animation: methodology-algo-badge 12s infinite; }
  .methodology-algo-text::before { content:'Revisar em 21 dias'; animation: methodology-algo-text 12s infinite; }
  .methodology-progress { transition: width .1s linear; }
  .methodology-showcase[data-reduce-motion="1"] .methodology-fade-up,
  .methodology-showcase[data-reduce-motion="1"] .methodology-float-1,
  .methodology-showcase[data-reduce-motion="1"] .methodology-float-2,
  .methodology-showcase[data-reduce-motion="1"] .methodology-float-3,
  .methodology-showcase[data-reduce-motion="1"] .methodology-strike,
  .methodology-showcase[data-reduce-motion="1"] .methodology-strike::after,
  .methodology-showcase[data-reduce-motion="1"] .methodology-fade-option,
  .methodology-showcase[data-reduce-motion="1"] .methodology-reveal::before,
  .methodology-showcase[data-reduce-motion="1"] .methodology-bulb,
  .methodology-showcase[data-reduce-motion="1"] .methodology-algo-bulb,
  .methodology-showcase[data-reduce-motion="1"] .methodology-algo-glow,
  .methodology-showcase[data-reduce-motion="1"] .methodology-algo-badge,
  .methodology-showcase[data-reduce-motion="1"] .methodology-algo-text::before,
  .methodology-showcase[data-reduce-motion="1"] .animate-ping { animation: none; }
  .methodology-showcase[data-reduce-motion="1"] .methodology-progress { transition: none; }
  @keyframes methodology-fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes methodology-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  @keyframes methodology-draw { 0%,20%{width:0;opacity:0} 25%,85%{width:100%;opacity:1} 90%,100%{width:0;opacity:0} }
  @keyframes methodology-strike { 0%,20%{opacity:1} 25%,85%{opacity:.4} 90%,100%{opacity:1} }
  @keyframes methodology-option { 0%,20%{opacity:1;filter:grayscale(0)} 25%,85%{opacity:.4;filter:grayscale(1)} 90%,100%{opacity:1;filter:grayscale(0)} }
  @keyframes methodology-word { 0%,15%{content:'_ _ _ _ _ _ _'} 20%,35%{content:'M _ _ _ _ _ _'} 40%,60%{content:'M u t _ _ _ _'} 65%,85%{content:'M u t i s _ _'} 90%,100%{content:'_ _ _ _ _ _ _'} }
  @keyframes methodology-bulb { 0%,15%,100%{transform:scale(1);background:#f1f5f9;color:#94a3b8} 18%,22%,38%,42%,63%,67%{transform:scale(.85);background:#fef08a;color:#eab308} }
  @keyframes methodology-algo-bulb { 0%,15%,100%{transform:scale(1);background:rgba(255,255,255,.8)} 18%,43%,68%{transform:scale(.9)} 20%,40%{background:#fef08a} 45%,65%{background:#fdba74} 70%,95%{background:#fca5a5} }
  @keyframes methodology-algo-glow { 0%,15%,100%{color:#94a3b8;filter:none} 20%,40%{color:#eab308;filter:drop-shadow(0 0 10px rgba(234,179,8,.6))} 45%,65%{color:#f97316;filter:drop-shadow(0 0 15px rgba(249,115,22,.6))} 70%,95%{color:#ef4444;filter:drop-shadow(0 0 20px rgba(239,68,68,.8))} }
  @keyframes methodology-algo-badge { 0%,15%,100%{background:#dcfce7;color:#166534;border-color:#bbf7d0} 20%,40%{background:#fef9c3;color:#854d0e;border-color:#fef08a} 45%,65%{background:#ffedd5;color:#9a3412;border-color:#fed7aa} 70%,95%{background:#fee2e2;color:#991b1b;border-color:#fecaca} }
  @keyframes methodology-algo-text { 0%,15%,100%{content:'Revisar em 21 dias'} 20%,40%{content:'Punição: Volta em 7 dias'} 45%,65%{content:'Punição: Volta em 3 dias'} 70%,95%{content:'Crítico: Volta Amanhã'} }
  @keyframes methodology-progress { from { width: 0%; } to { width: 100%; } }
`;

function SlideHeader({ type, title, subtitle }: { type: "indigo" | "yellow" | "rose"; title: string; subtitle: string }) {
  const config = {
    indigo: { icon: Layers, label: "Formatos Exclusivos", classes: "bg-indigo-50 text-indigo-500 border-indigo-100" },
    yellow: { icon: Lightbulb, label: "Gatilho Mnemônico", classes: "bg-yellow-50 text-yellow-600 border-yellow-200" },
    rose: { icon: Cpu, label: "Algoritmo Penalizador", classes: "bg-rose-50 text-rose-600 border-rose-200" },
  }[type];
  const Icon = config.icon;
  return <div className="methodology-fade-up mb-8 text-center md:mb-10"><span className={cn("mb-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider", config.classes)}><Icon className="h-3.5 w-3.5" /> {config.label}</span><h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{title}</h1><p className="mx-auto mt-2 max-w-3xl text-sm font-medium text-slate-500 md:text-[15px]">{subtitle}</p></div>;
}

function ModesSlide() {
  const modes = [
    { icon: ListChecks, title: "Modo ABCDE", subtitle: "Múltipla Escolha", text: "Simula o formato padrão das provas (caso clínico com 5 alternativas).", focus: "Foco: Raciocínio Clínico", className: "methodology-float-1 border-t-sky-500", iconClass: "border-sky-100 bg-sky-50 text-sky-500", corner: "bg-sky-50" },
    { icon: TextCursorInput, title: "Modo OQ Falta", subtitle: "Listas & Tópicos", text: "Exige que você digite o critério exato que está faltando na lista estruturada.", focus: "Foco: Evocação Ativa", className: "methodology-float-2 scale-105 border-t-indigo-500 shadow-md", iconClass: "border-indigo-100 bg-indigo-50 text-indigo-500", corner: "bg-indigo-50" },
    { icon: WholeWord, title: "Modo Lacuna", subtitle: "Preenchimento", text: "Preencha o espaço em branco no trecho conceitual ou diretriz de forma exata.", focus: "Foco: Memorização de Termos", className: "methodology-float-3 border-t-rose-500", iconClass: "border-rose-100 bg-rose-50 text-rose-500", corner: "bg-rose-50" },
  ];
  return <><SlideHeader type="indigo" title="Metodologia de Alta Retenção" subtitle="Não somos um mero banco de questões. Construímos 3 formatos cirúrgicos para treinar raciocínio, evocação e precisão diagnóstica." /><div className="methodology-fade-up grid w-full max-w-5xl gap-5 md:grid-cols-3">{modes.map(({ icon: Icon, title, subtitle, text, focus, className, iconClass, corner }) => <div key={title} className={cn("relative flex flex-col overflow-hidden rounded-[1.5rem] border-t-4 bg-white/90 p-5 shadow-sm backdrop-blur-xl md:p-6", className)}><div className={cn("absolute right-0 top-0 h-16 w-16 rounded-bl-full", corner)} /><div className="relative flex items-center gap-3"><div className={cn("flex h-10 w-10 items-center justify-center rounded-xl border", iconClass)}><Icon className="h-5 w-5" /></div><h3 className="text-sm font-bold leading-tight text-slate-900 md:text-base">{title}<br /><span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{subtitle}</span></h3></div><p className="mt-4 text-xs font-medium leading-relaxed text-slate-500">{text}</p><div className="mt-auto rounded-lg border border-slate-100 bg-slate-50 px-3 py-1.5 text-center text-[10px] font-bold text-slate-500">{focus}</div></div>)}</div></>;
}

function TipsSlide() {
  return <><SlideHeader type="yellow" title="O Sistema Inteligente de Dicas" subtitle="Em vez de revelar a resposta e arruinar o aprendizado, o app entrega fragmentos progressivos para forçar seu cérebro a recuperar a memória." /><div className="methodology-fade-up grid w-full max-w-4xl gap-8 md:grid-cols-2"><div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-6 shadow-md"><div className="mb-4 flex items-center justify-between"><h4 className="text-sm font-bold text-slate-500">No Modo ABCDE</h4><div className="methodology-bulb flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"><Lightbulb className="h-4 w-4" /></div></div><p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">A dica elimina o errado:</p><div className="space-y-2">{["A", "B", "C"].map((letter, index) => <div key={letter} className={cn("relative flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 p-2", index === 1 && "methodology-fade-option")}><div className={cn("flex h-5 w-5 items-center justify-center rounded-full border border-slate-300 bg-white text-[10px] font-bold text-slate-400", index === 1 && "z-10")}><span>{letter}</span></div><div className={cn("h-1.5 rounded bg-slate-200", index === 0 ? "w-3/4" : index === 1 ? "w-1/2" : "w-5/6")} />{index === 1 && <div className="methodology-strike pointer-events-none absolute inset-y-0 left-10 right-4" />}</div>)}</div></div><div className="rounded-[1.5rem] border border-slate-200 bg-white/90 p-6 shadow-md"><div className="mb-4 flex items-center justify-between"><h4 className="text-sm font-bold text-slate-500">No Modo Lacuna / OQ Falta</h4><div className="methodology-bulb flex h-8 w-8 items-center justify-center rounded-full border border-slate-200"><Lightbulb className="h-4 w-4" /></div></div><p className="mb-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">A dica revela fragmentos:</p><div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 shadow-inner"><p className="text-sm font-medium leading-relaxed text-slate-900">A complicação clínica mais prevalente é a <span className="methodology-reveal inline-flex h-8 min-w-[120px] items-center justify-center rounded border border-slate-200 bg-white px-2 py-1 text-lg font-bold shadow-sm" />.</p><div className="mt-2 flex items-center justify-center gap-1 text-center text-[9px] font-bold uppercase tracking-widest text-indigo-400"><MousePointerClick className="h-3 w-3" /> Clique para revelar partes</div></div></div></div></>;
}

function AlgorithmSlide() {
  return <><SlideHeader type="rose" title="O motor de Repetição Espaçada" subtitle="Não adianta enganar o sistema. Quanto mais dicas você pedir para acertar a questão, mais curto é o intervalo gerado para o card retornar à sua rotina." /><div className="methodology-fade-up flex w-full max-w-xl items-center justify-between rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-xl md:p-8"><div className="flex-1 border-r border-slate-100 pr-5 md:pr-8"><div className="mb-4 flex items-start justify-between"><span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">OQ EM REVISÃO</span><button type="button" aria-label="Pedir dica" className="methodology-algo-bulb relative flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 shadow-inner md:h-14 md:w-14"><div className="absolute inset-0 animate-ping rounded-full border border-current opacity-20" /><Lightbulb className="methodology-algo-glow h-6 w-6 md:h-7 md:w-7" /></button></div><div className="mb-3 h-2.5 w-3/4 rounded-full bg-slate-200" /><div className="mb-3 h-2.5 w-full rounded-full bg-slate-200" /><div className="mb-8 h-2.5 w-5/6 rounded-full bg-slate-200" /><div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400 md:text-xs"><MousePointerClick className="h-4 w-4 text-sky-500" /> Aluno pediu +1 dica...</div></div><div className="flex w-36 flex-col items-center justify-center pl-4 text-center md:w-56 md:pl-6"><div className="relative mb-4"><CalendarClock className="h-10 w-10 text-slate-300 md:h-12 md:w-12" /><RefreshCw className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-white text-sky-500" /></div><p className="mb-3 text-[10px] font-bold uppercase tracking-wide text-slate-400">O Algoritmo recalcula:</p><div className="methodology-algo-badge flex w-full items-center justify-center gap-2 rounded-xl border-2 px-2 py-2.5 text-[10px] font-bold shadow-sm md:px-4 md:text-xs"><History className="h-4 w-4" /><span className="methodology-algo-text whitespace-nowrap" /></div></div></div></>;
}

export default function MethodologyShowcase() {
  const { reduceMotion } = useSettings();
  const [slide, setSlide] = useState(0);
  useEffect(() => { if (reduceMotion) return; const timer = window.setInterval(() => setSlide(current => (current + 1) % 3), SLIDE_TIME); return () => window.clearInterval(timer); }, [reduceMotion]);
  const slides = [<ModesSlide key="modes" />, <TipsSlide key="tips" />, <AlgorithmSlide key="algorithm" />];
  return <div className="methodology-showcase relative mx-auto w-full max-w-5xl overflow-hidden rounded-[2rem] bg-white shadow-[0_24px_50px_-12px_rgba(15,23,42,0.08)]" data-reduce-motion={reduceMotion ? "1" : "0"}><style>{styles}</style><div className="methodology-grid pointer-events-none absolute inset-0 opacity-50" /><div className="absolute left-0 right-0 top-0 z-20 h-1.5 bg-slate-100"><div className="methodology-progress h-full rounded-r-full bg-sky-500" style={reduceMotion ? { width: "100%" } : { animation: `methodology-progress ${SLIDE_TIME}ms linear infinite` }} /></div><div key={slide} className="relative z-10 flex min-h-[580px] flex-col justify-center p-6 md:p-10">{slides[slide]}</div><div className="relative z-20 flex items-center justify-center gap-4 border-t border-slate-100 bg-white/80 p-6 backdrop-blur-md">{[0, 1, 2].map(index => <button key={index} type="button" onClick={() => setSlide(index)} aria-label={`Ir para slide ${index + 1}`} className={cn("h-2.5 rounded-full transition-all duration-300", slide === index ? "w-12 bg-sky-500 shadow-sm" : "w-3 bg-slate-200 hover:bg-slate-300")} />)}</div></div>;
}

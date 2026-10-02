import { useEffect, useState } from "react";
import { Bot, CheckCircle2, ChevronRight, Crosshair, FileText, Flame, Headphones, LayoutList, Map, PenTool, RefreshCw, Settings, Sparkles, Target, X, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

type Slide = { badge: string; title: string; subtitle: string; tone: "sky" | "rose" | "indigo" };

const slides: Slide[] = [
  { badge: "O Fluxo Perfeito", title: "O dia a dia da aprovação", subtitle: "Deixe o algoritmo guiar sua rotina. Você só precisa sentar e estudar.", tone: "sky" },
  { badge: "1 Erro = 3 Acertos", title: "Transforme erros em aprovação", subtitle: "O simulado só tem valor se você consertar suas falhas cirurgicamente.", tone: "rose" },
  { badge: "Inteligência Artificial", title: "O Hack do Cursinho", subtitle: "Extraia o suco das suas aulas transformando-as em estudo ativo na hora.", tone: "indigo" },
];

const toneClasses = {
  sky: { badge: "bg-sky-50 text-sky-600 border-sky-100", accent: "text-sky-600", soft: "bg-sky-50 border-sky-100", fill: "bg-sky-500" },
  rose: { badge: "bg-rose-50 text-rose-600 border-rose-100", accent: "text-rose-600", soft: "bg-rose-50 border-rose-100", fill: "bg-rose-500" },
  indigo: { badge: "bg-indigo-50 text-indigo-600 border-indigo-100", accent: "text-indigo-600", soft: "bg-indigo-50 border-indigo-100", fill: "bg-indigo-500" },
};

function TimelineSlide() {
  const items = [
    [Map, "1. Trilha Estratégica", "O seu mapa diário moldado para o ENARE e PSU."],
    [Headphones, "2. Resumos & Áudio-aulas", "Teoria nativa em texto ou áudio, focada na alta incidência."],
    [Target, "3. OQs de Fixação", "Sua vez. Você lembra a resposta exata, ou você erra."],
    [RefreshCw, "4. Revisão Automática", "O algoritmo agenda suas pendências para o momento perfeito."],
  ] as const;
  return <div className="relative mx-auto flex w-full max-w-2xl flex-col gap-3">
    <div className="absolute bottom-4 left-6 top-4 w-0.5 rounded-full bg-slate-200" />
    {items.map(([Icon, title, text], index) => <div key={title} className={cn("relative z-10 flex items-center gap-4 rounded-2xl border bg-white/85 p-3.5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-md", index === 2 ? "border-sky-200" : "border-slate-100")}>
      <div className={cn("rounded-xl border p-3", index === 2 ? "border-sky-200 bg-sky-500 text-white" : "border-slate-100 bg-slate-50 text-slate-700")}><Icon className="h-5 w-5" /></div>
      <div><h3 className={cn("text-[15px] font-bold", index === 2 ? "text-sky-600" : "text-slate-800")}>{title}</h3><p className="mt-0.5 text-xs font-medium text-slate-500">{text}</p></div>
    </div>)}
  </div>;
}

function FunnelSlide() {
  return <div className="space-y-8">
    <div className="flex h-48 items-center justify-center gap-8">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-lg"><LayoutList className="h-8 w-8 text-slate-800" /></div>
      <div className="flex flex-col items-center gap-3"><div className="flex h-24 w-24 items-center justify-center rounded-3xl border-2 border-rose-400 bg-white shadow-xl shadow-rose-100"><Settings className="h-10 w-10 animate-spin text-rose-500 [animation-duration:4s]" /></div><span className="rounded-full bg-rose-500 px-3 py-1 text-[10px] font-bold text-white"><Flame className="mr-1 inline h-3 w-3" /> CASTIGO</span></div>
      <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-2xl border border-emerald-200 bg-emerald-50 shadow-lg shadow-emerald-100"><CheckCircle2 className="h-7 w-7 text-emerald-500" /><span className="text-[10px] font-bold text-emerald-600">3x OQs</span></div>
    </div>
    <div className="grid gap-4 text-center md:grid-cols-3">{[["1. O Raio-X", "Faça simulados focados no ENARE/PSU para diagnosticar onde você perde pontos."], ["2. O Castigo", "O app rastreia cada questão errada e gera 3 novas questões de fixação."], ["3. A Cura", "Você preenche a lacuna do conhecimento e sua pontuação sobe."]].map(([title, text], index) => <div key={title} className="rounded-2xl border border-slate-100 bg-white/85 p-5 shadow-sm"><h3 className={cn("mb-1.5 text-sm font-bold", index === 1 ? "text-rose-600" : index === 2 ? "text-emerald-600" : "text-slate-800")}>{title}</h3><p className="text-xs font-medium leading-relaxed text-slate-500">{text}</p></div>)}</div>
  </div>;
}

function AiSlide() {
  return <div className="space-y-8">
    <div className="flex h-48 items-center justify-center gap-6 md:gap-12"><div className="relative h-40 w-28 rounded-xl border border-slate-200 bg-white p-5 shadow-lg"><FileText className="absolute right-3 top-3 h-4 w-4 text-slate-300" /><div className="mt-7 space-y-3">{["w-full", "w-3/4", "w-5/6", "w-full"].map(width => <div key={width} className={cn("h-2.5 rounded-full bg-slate-100", width)} />)}</div><div className="absolute left-0 right-0 top-1/2 h-0.5 bg-sky-400 shadow-[0_0_14px_3px_rgba(14,165,233,0.35)]" /></div><div className="flex flex-col items-center text-sky-500"><Sparkles className="mb-2 h-8 w-8 animate-pulse" /><div className="flex"><ChevronRight /><ChevronRight className="opacity-60" /><ChevronRight className="opacity-30" /></div></div><div className="relative flex h-36 w-36 items-center justify-center rounded-full border-2 border-dashed border-slate-200"><div className="flex h-14 w-14 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white shadow-lg">OQ</div><div className="absolute -top-5 rounded-lg border-2 border-sky-400 bg-white px-3 py-4 text-xs font-bold text-sky-500 shadow-md">OQ</div><div className="absolute -bottom-5 rounded-lg bg-slate-900 px-3 py-4 text-xs font-bold text-white shadow-md">?</div></div></div>
    <div className="grid gap-4 text-center md:grid-cols-3">{[["1. Estudo Passivo", "Alimente a plataforma com suas anotações ou resumo em PDF."], ["2. Magia da IA", "Nossa IA lê o material e constrói dezenas de OQs cirúrgicos."], ["3. Domínio Absoluto", "As questões entram no algoritmo e retornam nos dias de revisão."]].map(([title, text], index) => <div key={title} className="rounded-2xl border border-slate-100 bg-white/85 p-5 shadow-sm"><h3 className={cn("mb-1.5 text-sm font-bold", index === 1 ? "text-sky-600" : "text-slate-800")}>{title}</h3><p className="text-xs font-medium leading-relaxed text-slate-500">{text}</p></div>)}</div>
  </div>;
}

export default function AttachedBanner() {
  const [current, setCurrent] = useState(0);
  const [closed, setClosed] = useState(false);
  const slide = slides[current];
  const tone = toneClasses[slide.tone];

  useEffect(() => { if (closed) return; const timer = window.setInterval(() => setCurrent(value => (value + 1) % slides.length), 9000); return () => window.clearInterval(timer); }, [closed]);
  if (closed) return null;

  return <section className="relative w-full py-4 md:py-8">
    <div className="relative mx-auto min-h-[580px] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_50px_-12px_rgba(15,23,42,0.12)]">
      <div className="pointer-events-none absolute inset-0 opacity-70 [background-image:linear-gradient(to_right,rgba(226,232,240,0.6)_1px,transparent_1px),linear-gradient(to_bottom,rgba(226,232,240,0.6)_1px,transparent_1px)] [background-size:24px_24px]" />
      <button aria-label="Fechar banner" onClick={() => setClosed(true)} className="absolute right-4 top-4 z-30 rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"><X className="h-4 w-4" /></button>
      <div className="absolute left-0 right-0 top-0 z-20 h-1.5 bg-slate-100"><div className={cn("h-full rounded-r-full transition-all duration-[9000ms] ease-linear", tone.fill)} style={{ width: `${((current + 1) / slides.length) * 100}%` }} /></div>
      <div className="relative z-10 flex min-h-[520px] flex-col justify-center p-6 pt-14 md:p-10 md:pt-16"><div className="mb-8 text-center"><span className={cn("mb-4 inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wider", tone.badge)}>{current === 0 ? <Zap className="h-3.5 w-3.5" /> : current === 1 ? <Crosshair className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}{slide.badge}</span><h2 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-4xl">{slide.title}</h2><p className="mt-2 text-sm font-medium text-slate-500">{slide.subtitle}</p></div>{current === 0 ? <TimelineSlide /> : current === 1 ? <FunnelSlide /> : <AiSlide />}</div>
      <div className="relative z-20 flex items-center justify-center gap-2 border-t border-slate-100 bg-white/85 p-5 backdrop-blur-md">{slides.map((item, index) => <button key={item.title} aria-label={`Ir para slide ${index + 1}`} onClick={() => setCurrent(index)} className={cn("h-2.5 rounded-full transition-all duration-300", index === current ? "w-12 bg-sky-500" : "w-3 bg-slate-200 hover:bg-slate-300")} />)}</div>
    </div>
  </section>;
}

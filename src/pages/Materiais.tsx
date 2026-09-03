import { useEffect, useState, useMemo, useRef, useCallback, lazy, Suspense, memo } from "react";
const SimuladoPlayer = lazy(() => import("@/components/simulados/SimuladoPlayer"));


import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUp,
  Baby,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Crown,
  FileText,
  FileEdit,
  Filter,
  Flame,
  Headphones,
  ListFilter,
  Lock,
  MessageSquareText,
  Pause,
  Play,
  RotateCcw,
  RotateCw,
  Save,
  Search,
  Zap,
  Loader2,
  Volume2,
  FastForward,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ESPECIALIDADE_LABEL } from "@/lib/oq";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";
import { feedback } from "@/lib/sensory";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import MaterialPdfViewer from "@/components/MaterialPdfViewer";


const MATERIAL_ESPECIALIDADE_LABEL: Record<string, string> = {
  ...ESPECIALIDADE_LABEL,
  saude_mental: "Saúde Mental",
};
const labelEsp = (k: string) => MATERIAL_ESPECIALIDADE_LABEL[k] || k;

interface Material {
  id: string;
  nome: string;
  tipo_1: string;
  link_1: string;
  tipo_2: string | null;
  link_2: string | null;
  especialidade: string;
  tier: 1 | 2 | 3;
  key_words: string | null;
}

const SimuladoCard = memo(({ 
  sim, 
  simuladoResultados, 
  setSimuladoInReportMode, 
  setActiveSimulado 
}: { 
  sim: any; 
  simuladoResultados: any[]; 
  setSimuladoInReportMode: (v: boolean) => void; 
  setActiveSimulado: (v: string) => void; 
}) => {
  const lastAttempt = simuladoResultados
    .filter(r => r.simulado_id === sim.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
  const isDone = !!lastAttempt;
  const score = isDone ? Math.round((lastAttempt.acertos / lastAttempt.total_questoes) * 100) : 0;
  
  return (
    <div 
      onClick={() => {
        setSimuladoInReportMode(isDone);
        setActiveSimulado(sim.id);
      }}
      className="paper-card p-6 cursor-pointer hover:bg-slate-900/5 transition-all duration-300 flex flex-col gap-4 border-l-4 border-l-accent"
    >
      <div className="flex justify-between items-start">
        <Badge className={cn("text-[10px] font-black uppercase tracking-widest px-2", isDone ? "bg-emerald-500/10 text-emerald-600" : "bg-accent/10 text-accent")}>
          {isDone ? `Realizado (${score}%)` : "Não realizado"}
        </Badge>
        <FileText className="h-4 w-4 text-muted-foreground" />
      </div>
      <h3 className="font-bold leading-tight">{sim.nome}</h3>
      
      {isDone && (
        <div className="mt-auto flex gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-slate-100 hover:bg-slate-200 h-9"
            onClick={(e) => {
              e.stopPropagation();
              setSimuladoInReportMode(true);
              setActiveSimulado(sim.id);
            }}
          >
            Relatório
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex-1 rounded-xl font-bold text-[10px] uppercase tracking-wider bg-accent/10 text-accent hover:bg-accent/20 h-9"
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm("Ao refazer o simulado, os dados da última tentativa serão todos reiniciados para uma nova tentativa. Deseja continuar?")) {
                setSimuladoInReportMode(false);
                setActiveSimulado(sim.id);
              }
            }}
          >
            Refazer
          </Button>
        </div>
      )}
    </div>
  );
});

const MaterialCard = memo(({ 
  m, 
  isOuro, 
  isAdmin, 
  handleOpenPreview, 
  openReportForMaterial, 
  getTierInfo, 
  labelEsp 
}: { 
  m: Material; 
  isOuro: boolean; 
  isAdmin: boolean; 
  handleOpenPreview: (m: Material) => void; 
  openReportForMaterial: (m: Material, e: React.MouseEvent) => void;
  getTierInfo: (tier: number) => any;
  labelEsp: (k: string) => string;
}) => {
  const tierInfo = getTierInfo(m.tier);
  
  return (
    <div 
      onClick={() => handleOpenPreview(m)}
      className={`paper-card group relative p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer flex flex-col gap-3 border-l-4 ${m.tier === 1 ? 'border-l-red-500' : m.tier === 2 ? 'border-l-amber-500' : 'border-l-blue-500'} ${(!isOuro && !isAdmin) ? 'opacity-80' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-1">
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] flex items-center gap-1.5 ${tierInfo.color}`}>
            {tierInfo.icon}
            {tierInfo.label}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-widest">
            {labelEsp(m.especialidade)}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-red-500/10 text-muted-foreground/40 hover:text-red-500 transition-colors"
            onClick={(e) => openReportForMaterial(m, e)}
            title="Reportar Problema"
          >
            <AlertCircle className="h-4 w-4" />
          </Button>
          {(!isOuro && !isAdmin) && (
            <div className="bg-amber-500/10 p-1.5 rounded-xl">
              <Lock className="h-3.5 w-3.5 text-amber-500" />
            </div>
          )}
        </div>
      </div>

      <h3 className="font-display font-bold text-base leading-[1.2] group-hover:text-primary transition-colors pr-2">
        {m.nome}
      </h3>

      <div className="mt-auto pt-2 flex items-center justify-between">
        <div className="flex items-center text-[10px] font-black text-primary uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
          Estudar agora
          <ChevronRight className="h-3 w-3 ml-0.5" />
        </div>
        {m.tier === 1 && (
          <Flame className="h-4 w-4 text-red-500 animate-pulse ml-auto" />
        )}
      </div>
    </div>
  );
});

export default function Materiais() {
  const { user, isAdmin } = useAuth();
  const { canUse } = useUserPlan();
  const [mats, setMats] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>(searchParams.get("esp") || "all");

  useEffect(() => {
    const esp = searchParams.get("esp");
    if (esp) setSelectedSpecialty(esp);
  }, [searchParams]);
  const [selectedTier, setSelectedTier] = useState<string>("all");
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  const [visibleCount, setVisibleCount] = useState(24);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  // Notes state
  const [noteContent, setNoteContent] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportType, setReportType] = useState("erro");
  const [reportComment, setReportComment] = useState("");
  const [isSendingReport, setIsSendingReport] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [audioStatus, setAudioStatus] = useState<"idle" | "loading" | "error" | "ready">("idle");
  const [audioSource, setAudioSource] = useState<"direct" | "proxy">("direct");
  const [countdown, setCountdown] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Simulado state
  const [simulados, setSimulados] = useState<any[]>([]);
  const [simuladoResultados, setSimuladoResultados] = useState<any[]>([]);
  const [activeSimulado, setActiveSimulado] = useState<string | null>(null);
  const [simuladoInReportMode, setSimuladoInReportMode] = useState(false);
  const [loadingSimulados, setLoadingSimulados] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<"all" | "materiais" | "simulados">("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");


  const fetchNote = useCallback(async (materialId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("material_notes")
        .select("content")
        .eq("user_id", user.id)
        .eq("material_id", materialId)
        .maybeSingle();

      if (error) throw error;
      setNoteContent(data?.content || "");
    } catch (error) {
      console.error("Erro ao buscar nota:", error);
    }
  }, [user]);

  const saveNote = async (silent = false) => {
    if (!user || !previewMaterial) return;
    if (!silent) setIsSavingNote(true);
    try {
      const { error } = await supabase
        .from("material_notes")
        .upsert({
          user_id: user.id,
          material_id: previewMaterial.id,
          content: noteContent,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id,material_id' });

      if (error) throw error;
      if (!silent) toast.success("Nota salva!");
    } catch (error) {
      console.error("Erro ao salvar nota:", error);
      if (!silent) toast.error("Erro ao salvar nota");
    } finally {
      if (!silent) setIsSavingNote(false);
    }
  };

  const startCountdownThenPlay = () => {
    if (!audioRef.current) return;
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    setCountdown(3);
    countdownTimerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) {
          if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
          countdownTimerRef.current = null;
          audioRef.current?.play().catch((err) => {
            console.error("Erro ao reproduzir áudio:", err);
            setAudioStatus("error");
          });
          return null;
        }
        return prev - 1;
      });
    }, 700);
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current);
        countdownTimerRef.current = null;
      }
      setCountdown(null);
      return;
    }
    if (audioStatus === "error") return;
    if (audioStatus === "ready") {
      startCountdownThenPlay();
    } else {
      setAudioStatus("loading");
      audioRef.current.play().catch((err) => {
        console.error("Erro ao reproduzir áudio:", err);
        setAudioStatus("error");
      });
    }
  };

  const retryAudio = () => {
    if (!audioRef.current || !previewMaterial?.link_2) return;
    setAudioStatus("loading");
    setAudioSource("direct");
    const target = audioRef.current;
    delete target.dataset.triedProxy;
    target.src = getDirectDownloadUrl(previewMaterial.link_2);
    target.load();
    toast.info("Tentando carregar o áudio novamente…");
  };

  const skip = (seconds: number) => {
    if (audioRef.current) {
      const newTime = audioRef.current.currentTime + seconds;
      audioRef.current.currentTime = Math.max(0, Math.min(newTime, duration));
    }
  };

  const handleSpeedChange = () => {
    const speeds = [1, 1.25, 1.5, 2];
    const currentIndex = speeds.indexOf(playbackSpeed);
    const nextIndex = (currentIndex + 1) % speeds.length;
    const nextSpeed = speeds[nextIndex];
    setPlaybackSpeed(nextSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextSpeed;
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSendReport = async () => {
    if (!previewMaterial || !reportComment.trim()) return;

    try {
      setIsSendingReport(true);
      const { error } = await supabase.from("problemas_admin").insert({
        titulo: `Erro em Material: ${previewMaterial.nome}`,
        descricao: `Tipo: ${reportType}\nMaterial ID: ${previewMaterial.id}\nComentário: ${reportComment}`,
        prioridade: "media",
        status: "aberto",
        origem: "material_report"
      });

      if (error) throw error;
      toast.success("Report enviado com sucesso!");
      setShowReportDialog(false);
      setReportComment("");
    } catch (error) {
      console.error("Erro ao enviar report:", error);
      toast.error("Erro ao enviar report");
    } finally {
      setIsSendingReport(false);
    }
  };

  const openReportForMaterial = (m: Material, e: React.MouseEvent) => {
    e.stopPropagation();
    setPreviewMaterial(m);
    setShowReportDialog(true);
  };

  useEffect(() => {
    document.title = "Materiais — OQ Falta?";
    fetchMaterials();
    fetchSimulados();


    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-open material if ID is in URL
  useEffect(() => {
    const materialId = searchParams.get("id");
    if (materialId && mats.length > 0 && !previewMaterial) {
      const material = mats.find(m => m.id === materialId);
      if (material) {
        // Se houver um ID, limpa os filtros para garantir que o material não seja escondido pela lista (embora o preview abra por cima)
        setSearchTerm("");
        setSelectedSpecialty("all");
        setSelectedTier("all");
        
        handleOpenPreview(material);
        // Clear the ID from URL to avoid re-opening on manual closes
        const newParams = new URLSearchParams(searchParams);
        newParams.delete("id");
        navigate(`/materiais?${newParams.toString()}`, { replace: true });
      }
    }
  }, [searchParams, mats, previewMaterial, navigate]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("materiais")
        .select("*")
        .order("tier", { ascending: true })
        .order("nome", { ascending: true });

      if (error) throw error;
      setMats((data as Material[]) || []);
    } catch (error) {
      console.error("Erro ao buscar materiais:", error);
      toast.error("Erro ao carregar materiais");
    } finally {
      setLoading(false);
    }
  };

  const fetchSimulados = async () => {
    if (!user) return;
    try {
      setLoadingSimulados(true);
      const { data: sims, error: sErr } = await supabase
        .from("simulados")
        .select("*")
        .order("created_at", { ascending: false });

      if (sErr) throw sErr;

      const { data: results, error: rErr } = await supabase
        .from("simulado_tentativas")
        .select("*")
        .eq("usuario_id", user.id);

      if (rErr) throw rErr;

      setSimulados(sims || []);
      setSimuladoResultados(results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSimulados(false);
    }
  };


  const isOuro = canUse("materiais") || isAdmin;

  const filteredMats = useMemo(() => {
    return mats.filter((m) => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = 
        m.nome.toLowerCase().includes(searchStr) || 
        (m.key_words || "").toLowerCase().includes(searchStr);
      
      const matchesSpecialty = selectedSpecialty === "all" || m.especialidade === selectedSpecialty;
      const matchesTier = selectedTier === "all" || m.tier.toString() === selectedTier;
      const matchesCategory = selectedCategory === "all" || selectedCategory === "materiais";

      return matchesSearch && matchesSpecialty && matchesTier && matchesCategory;
    });
  }, [mats, searchTerm, selectedSpecialty, selectedTier, selectedCategory]);

  const filteredSimulados = useMemo(() => {
    if (selectedCategory === "materiais") return [];
    return simulados.filter((sim) => {
      const searchStr = searchTerm.toLowerCase();
      const matchesSearch = sim.nome.toLowerCase().includes(searchStr);
      const matchesSpecialty = selectedSpecialty === "all" || sim.especialidade === selectedSpecialty;
      
      const lastAttempt = simuladoResultados
        .filter(r => r.simulado_id === sim.id)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const isDone = !!lastAttempt;
      
      const matchesStatus = selectedStatus === "all" || 
        (selectedStatus === "completed" && isDone) || 
        (selectedStatus === "pending" && !isDone);

      return matchesSearch && matchesSpecialty && matchesStatus;
    });
  }, [simulados, searchTerm, selectedSpecialty, selectedCategory, selectedStatus, simuladoResultados]);

  const displayedMats = useMemo(() => {
    return filteredMats.slice(0, visibleCount);
  }, [filteredMats, visibleCount]);

  const loadMore = useCallback(() => {
    setVisibleCount(prev => prev + 24);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const suggestions = [
    "Trombólise", "AVC", "IAM", "TEP", "Insuficiência Cardíaca", 
    "Diabetes", "Hipertensão", "Sepse", "Antibióticos", "Eletrocardiograma"
  ];

  const getGoogleDriveId = (url: string) => {
    if (!url) return null;
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
  };

  const getEmbedUrl = (url: string) => {
    const id = getGoogleDriveId(url);
    if (!id) return url;
    return `https://drive.google.com/file/d/${id}/preview`;
  };

  const getDirectDownloadUrl = (url: string) => {
    const id = getGoogleDriveId(url);
    if (!id) return url;
    // Usar o link UC do Google Drive como principal para evitar dependência do proxy que pode falhar com 502/CORS
    return `https://docs.google.com/uc?export=download&id=${id}`;
  };

  const getProxyUrl = (url: string) => {
    const id = getGoogleDriveId(url);
    if (!id) return url;
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-proxy?id=${id}`;
  };

  const getAlternativeAudioUrl = (url: string) => {
    const id = getGoogleDriveId(url);
    if (!id) return url;
    return `https://docs.google.com/uc?export=download&id=${id}`;
  };

  const getPdfFallbackUrl = (url: string) => {
    const id = getGoogleDriveId(url);
    if (!id) return url;
    return `https://docs.google.com/document/d/${id}/export?format=pdf`;
  };

  const handleOpenPreview = (material: Material) => {
    if (!isOuro && !isAdmin) {
      toast.error("Acesso exclusivo para assinantes Ouro", {
        description: "Faça upgrade para desbloquear a biblioteca completa.",
        action: { label: "Upgrade para Ouro", onClick: () => (window.location.href = "/meu-plano?upgrade=ouro") },
      });
      return;
    }
    setPreviewMaterial(material);
    fetchNote(material.id);
    setIsPlaying(false);
    setAudioStatus("idle");
    setAudioSource("direct");
    setCountdown(null);
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    setCurrentTime(0);
    setPlaybackSpeed(1);
    setShowNotes(false);
  };

  const getTierInfo = (tier: number) => {
    switch (tier) {
      case 1:
        return { label: "Alta Incidência", color: "text-red-500", bg: "bg-red-500/10", icon: <Flame className="h-3 w-3" />, border: "border-red-500/50" };
      case 2:
        return { label: "Média", color: "text-amber-500", bg: "bg-amber-500/10", icon: <Zap className="h-3 w-3" />, border: "border-amber-500/30" };
      case 3:
      default:
        return { label: "Baixa", color: "text-blue-500", bg: "bg-blue-500/10", icon: <Clock className="h-3 w-3" />, border: "border-blue-500/20" };
    }
  };

  const specialties = useMemo(() => {
    const set = new Set(mats.map(m => m.especialidade));
    return Array.from(set).sort();
  }, [mats]);

  return (
    <div className="min-h-full px-4 md:px-8 py-8 md:py-12 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      <header className="mb-8">
        <p className="text-xs uppercase tracking-[0.3em] text-[hsl(var(--accent))] font-black mb-2">Plano Ouro</p>
        <h1 className="font-display text-4xl md:text-5xl font-black tracking-tighter text-[hsl(var(--foreground))]">
          Biblioteca & Simulados
        </h1>
        <p className="text-muted-foreground mt-2 text-sm md:text-base max-w-2xl">
          Resumos, áudio aulas e simulados exclusivos. Conteúdo otimizado para sua aprovação com foco em incidência.
        </p>
      </header>

      {!isOuro && !isAdmin && (
        <div className="paper-card p-6 flex flex-col sm:flex-row items-center gap-6 border-amber-500/20">
          <div className="shrink-0 grid place-items-center rounded-2xl w-[52px] h-[52px] bg-[hsl(var(--background))] shadow-neu-out-sm">
            <Crown className="h-6 w-6 text-amber-500" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display font-bold text-lg text-[hsl(var(--foreground))]">Acesso Restrito</h3>
            <p className="text-sm text-muted-foreground">Os materiais são exclusivos para assinantes do plano Estudante de Ouro.</p>
          </div>
          <Button asChild className="bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-bold hover:opacity-90 px-8 rounded-xl h-12 shadow-lg">
            <Link to="/meu-plano?upgrade=ouro">Upgrade para Ouro</Link>
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="flex p-1 bg-card/30 backdrop-blur-sm border border-white/5 rounded-2xl w-fit">
          <button
            onClick={() => setSelectedCategory("all")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              selectedCategory === "all" 
                ? "bg-accent text-accent-foreground shadow-lg" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Tudo
          </button>
          <button
            onClick={() => setSelectedCategory("materiais")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              selectedCategory === "materiais" 
                ? "bg-accent text-accent-foreground shadow-lg" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Materiais
          </button>
          <button
            onClick={() => setSelectedCategory("simulados")}
            className={cn(
              "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
              selectedCategory === "simulados" 
                ? "bg-accent text-accent-foreground shadow-lg" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            Simulados
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center p-2 rounded-3xl bg-card/30 backdrop-blur-sm border border-white/5 relative z-30">
        <div className="relative md:col-span-3">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Buscar tema ou palavra-chave..." 
            className="pl-11 h-12 bg-[hsl(var(--background))] border-none shadow-neu-in rounded-2xl font-medium focus-visible:ring-accent/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
          />
          
          {isSearchFocused && (
            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-[hsl(var(--background))] rounded-2xl shadow-2xl border border-white/5 z-50 animate-in fade-in slide-in-from-top-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/60 px-3 py-2">Sugestões</p>
              <div className="grid grid-cols-2 gap-1">
                {suggestions.map(s => (
                  <button
                    key={s}
                    className="text-left px-3 py-2 text-xs font-bold rounded-xl hover:bg-accent/10 hover:text-accent transition-colors"
                    onClick={() => setSearchTerm(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="h-12 md:col-span-2 bg-[hsl(var(--background))] border-none shadow-neu-out-sm rounded-2xl font-bold text-xs uppercase tracking-wider flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {(selectedSpecialty !== "all" || selectedTier !== "all") && (
                <Badge className="ml-2 bg-accent text-accent-foreground rounded-full px-1.5 h-4 min-w-[1rem] flex items-center justify-center text-[10px]">
                  { (selectedSpecialty !== "all" ? 1 : 0) + (selectedTier !== "all" ? 1 : 0) }
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 rounded-[2rem] border-none shadow-2xl p-6 bg-card/95 backdrop-blur-xl space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Categoria</label>
              <Select value={selectedCategory} onValueChange={(v: any) => setSelectedCategory(v)}>
                <SelectTrigger className="bg-[hsl(var(--background))] border-none shadow-neu-in rounded-xl font-bold text-[10px] uppercase tracking-wider h-10">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all" className="font-bold text-[10px] uppercase">Todas</SelectItem>
                  <SelectItem value="materiais" className="font-bold text-[10px] uppercase">Materiais (Resumos)</SelectItem>
                  <SelectItem value="simulados" className="font-bold text-[10px] uppercase">Simulados</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Especialidade</label>
              <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
                <SelectTrigger className="bg-[hsl(var(--background))] border-none shadow-neu-in rounded-xl font-bold text-[10px] uppercase tracking-wider h-10">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all">Todas</SelectItem>
                  {specialties.map(s => (
                    <SelectItem key={s} value={s} className="font-bold text-[10px] uppercase">{labelEsp(s)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Incidência</label>
              <Select value={selectedTier} onValueChange={setSelectedTier}>
                <SelectTrigger className="bg-[hsl(var(--background))] border-none shadow-neu-in rounded-xl font-bold text-[10px] uppercase tracking-wider h-10">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="1">Alta Incidência</SelectItem>
                  <SelectItem value="2">Média Incidência</SelectItem>
                  <SelectItem value="3">Baixa Incidência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {(selectedCategory === "all" || selectedCategory === "simulados") && (
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Status do Simulado</label>
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="bg-[hsl(var(--background))] border-none shadow-neu-in rounded-xl font-bold text-[10px] uppercase tracking-wider h-10">
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl border-none shadow-2xl">
                    <SelectItem value="all" className="font-bold text-[10px] uppercase">Todos</SelectItem>
                    <SelectItem value="completed" className="font-bold text-[10px] uppercase">Realizados</SelectItem>
                    <SelectItem value="pending" className="font-bold text-[10px] uppercase">Não realizados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}


            <Button 
              variant="ghost" 
              className="w-full text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-red-500"
              onClick={() => {setSelectedSpecialty("all"); setSelectedTier("all"); setSelectedCategory("all"); setSelectedStatus("all");}}
            >
              Limpar Filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>
    </div>

    {(loading || loadingSimulados) ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-32 rounded-3xl bg-card/50 animate-pulse border border-white/5" />
          ))}
        </div>
      ) : (filteredMats.length === 0 && filteredSimulados.length === 0) ? (
        <div className="paper-card p-20 text-center flex flex-col items-center gap-4">
          <div className="bg-[hsl(var(--background))] p-6 rounded-3xl shadow-neu-out-sm">
            <Search className="h-10 w-10 text-muted-foreground" />
          </div>
          <div className="space-y-1">
            <h3 className="font-display text-2xl font-bold">Nada por aqui</h3>
            <p className="text-muted-foreground">Tente outros termos ou filtros.</p>
          </div>
          <Button 
            variant="outline" 
            className="mt-4 rounded-xl font-bold border-none shadow-neu-out-sm hover:shadow-neu-in transition-all bg-[hsl(var(--background))]"
            onClick={() => {setSearchTerm(""); setSelectedSpecialty("all"); setSelectedTier("all"); setSelectedCategory("all"); setSelectedStatus("all");}}
          >
            Limpar Filtros
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {filteredMats.length > 0 && (selectedCategory === "all" || selectedCategory === "materiais") && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-primary rounded-full" />
                  <h2 className="text-2xl font-black tracking-tight uppercase">Resumos & Biblioteca</h2>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1 font-bold text-[10px] border-primary/20 text-primary">
                  {filteredMats.length} {filteredMats.length === 1 ? 'Material' : 'Materiais'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayedMats.map((m) => (
                  <MaterialCard 
                    key={m.id}
                    m={m} 
                    isOuro={isOuro} 
                    isAdmin={isAdmin} 
                    handleOpenPreview={handleOpenPreview}
                    openReportForMaterial={openReportForMaterial}
                    getTierInfo={getTierInfo}
                    labelEsp={labelEsp}
                  />
                ))}
              </div>

              {filteredMats.length > visibleCount && (
                <div className="flex justify-center pt-4 pb-4">
                  <Button 
                    onClick={loadMore}
                    variant="outline"
                    className="h-14 px-10 rounded-2xl bg-card border-none shadow-neu-out-sm hover:shadow-neu-in transition-all font-black text-xs uppercase tracking-[0.2em] gap-3 group"
                  >
                    <ListFilter className="h-4 w-4 text-accent group-hover:rotate-180 transition-transform duration-500" />
                    Carregar mais conteúdo
                  </Button>
                </div>
              )}
            </section>
          )}

          {filteredSimulados.length > 0 && (selectedCategory === "all" || selectedCategory === "simulados") && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-1 bg-accent rounded-full" />
                  <h2 className="text-2xl font-black tracking-tight uppercase">Simulados Disponíveis</h2>
                </div>
                <Badge variant="outline" className="rounded-full px-3 py-1 font-bold text-[10px] border-accent/20 text-accent">
                  {filteredSimulados.length} {filteredSimulados.length === 1 ? 'Simulado' : 'Simulados'}
                </Badge>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSimulados.map((sim) => (
                  <SimuladoCard 
                    key={sim.id}
                    sim={sim} 
                    simuladoResultados={simuladoResultados}
                    setSimuladoInReportMode={setSimuladoInReportMode}
                    setActiveSimulado={setActiveSimulado}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
    )}



      {showBackToTop && (
        <Button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 h-12 w-12 rounded-2xl bg-accent text-accent-foreground shadow-2xl hover:scale-110 transition-all z-40 p-0 animate-in fade-in slide-in-from-bottom-4"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* Visualizador Dual */}
      <Dialog open={!!previewMaterial} onOpenChange={(open) => {
        if (!open) {
          saveNote(true);
          setPreviewMaterial(null);
        }
      }}>
        <DialogContent className="max-w-none w-screen h-[100dvh] sm:h-[95vh] sm:w-[95vw] sm:max-w-[1400px] flex flex-col p-0 overflow-hidden border-none sm:rounded-[2.5rem] bg-[hsl(var(--background))] shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>{previewMaterial?.nome || "Material de estudo"}</DialogTitle>
            <DialogDescription>Leitor nativo de PDF com áudio, zoom, grifos e anotações.</DialogDescription>
          </DialogHeader>
          {/* Header Minimalista */}
          <header className="relative flex flex-col bg-card/40 backdrop-blur-xl shrink-0 z-20">
            <div className="px-3 py-2 md:px-8 flex items-center justify-between border-b border-white/5 h-14 sm:h-16 relative">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Botão de Voltar */}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-9 w-9 rounded-xl hover:bg-white/10 transition-colors shrink-0" 
                  onClick={() => {
                    saveNote(true);
                    setPreviewMaterial(null);
                  }}
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>

                {/* Título logo após o botão */}
                <div className="flex flex-col min-w-0">
                  <span className="text-[10px] sm:text-[11px] font-black text-muted-foreground/60 uppercase tracking-[0.2em] truncate">
                    {previewMaterial?.nome}
                  </span>
                </div>
              </div>
              
              {/* Player Customizado (Direita) */}
              <div className="flex items-center justify-end min-w-[40px]">
                {previewMaterial?.link_2 && previewMaterial.link_2 !== "SEM AUDIO" && (
                  <div className="flex items-center gap-1 sm:gap-3">
                    <audio 
                      ref={audioRef}
                      src={getDirectDownloadUrl(previewMaterial.link_2)}
                      onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
                      onLoadedMetadata={(e) => {
                        setDuration(e.currentTarget.duration);
                        e.currentTarget.playbackRate = playbackSpeed;
                        setAudioStatus("ready");
                      }}
                      onPlay={() => {
                        setIsPlaying(true);
                        setAudioStatus("ready");
                      }}
                      onPause={() => setIsPlaying(false)}
                      onEnded={() => setIsPlaying(false)}
                      onWaiting={() => setAudioStatus("loading")}
                      onPlaying={() => setAudioStatus("ready")}
                      onCanPlay={() => {
                        if (audioStatus === "loading") setAudioStatus("ready");
                      }}
                      controlsList="nodownload"
                      onError={(e) => {
                        const target = e.currentTarget;
                        const error = target.error;
                        console.error("Erro no áudio:", error?.code, error?.message);
                        
                        // Tentativa de fallback se a primeira URL falhar
                        if (previewMaterial?.link_2 && !target.dataset.triedProxy) {
                          console.log("Tentando proxy como fallback...");
                          target.dataset.triedProxy = "true";
                          setAudioSource("proxy");
                          setAudioStatus("loading");
                          target.src = getProxyUrl(previewMaterial.link_2);
                          target.load();
                          if (isPlaying) target.play().catch(() => {});
                        } else {
                          setCountdown(null);
                          if (countdownTimerRef.current) {
                            clearInterval(countdownTimerRef.current);
                            countdownTimerRef.current = null;
                          }
                          setAudioStatus("error");
                          setIsPlaying(false);
                        }
                      }}
                    />
                    
                    <div className="flex items-center gap-1 bg-black/20 rounded-full px-1.5 py-0.5 border border-white/5 shadow-inner">
                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white/10" onClick={() => skip(-10)}>
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className={cn(
                          "h-9 w-9 rounded-full hover:scale-105 transition-transform shadow-lg relative overflow-visible",
                          audioStatus === "error"
                            ? "bg-red-500 text-white animate-pulse-slow"
                            : "bg-accent text-accent-foreground",
                        )}
                        onClick={audioStatus === "error" ? retryAudio : togglePlay}
                        title={audioStatus === "error" ? "Tentar novamente" : isPlaying ? "Pausar" : "Tocar"}
                      >
                        {audioStatus === "error" ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : countdown !== null ? (
                          <span
                            key={countdown}
                            className="text-sm font-black tabular-nums animate-scale-in"
                          >
                            {countdown}
                          </span>
                        ) : audioStatus === "loading" && !isPlaying ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isPlaying ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4 fill-current ml-0.5" />
                        )}
                      </Button>

                      <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full hover:bg-white/10" onClick={() => skip(10)}>
                        <RotateCw className="h-3.5 w-3.5" />
                      </Button>

                      <div className="hidden xs:flex flex-col items-center justify-center min-w-[55px] ml-1">
                        <span className="text-[9px] font-bold text-white/70 tabular-nums">
                          {formatTime(currentTime)}
                        </span>
                      </div>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-7 px-1.5 text-[10px] font-black hover:bg-white/10 text-accent transition-colors"
                        onClick={handleSpeedChange}
                      >
                        {playbackSpeed}x
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Barra de Progresso Horizontal (Enchimento) */}
            {previewMaterial?.link_2 && previewMaterial.link_2 !== "SEM AUDIO" && (
              <div className={cn(
                "h-2.5 w-full bg-white/5 relative overflow-hidden transition-colors duration-500",
                audioStatus === "error" && "bg-red-500/10"
              )}>
                {/* Efeito Neon Vermelho Piscante para Erro */}
                {audioStatus === "error" && (
                  <div className="absolute inset-0 bg-red-500/40 animate-pulse-slow shadow-[inset_0_0_15px_rgba(239,68,68,0.5)]" />
                )}

                {/* Efeito de Carregamento Rápido (Scanning) */}
                {audioStatus === "loading" && (
                  <div className="absolute inset-0 overflow-hidden">
                    <motion.div 
                      initial={{ x: "-100%" }}
                      animate={{ x: "100%" }}
                      transition={{ duration: 0.8, repeat: Infinity, ease: "linear" }}
                      className="h-full w-1/3 bg-gradient-to-r from-transparent via-accent/50 to-transparent"
                    />
                  </div>
                )}

                <div 
                  className={cn(
                    "absolute top-0 left-0 h-full transition-all duration-300 ease-linear rounded-r-full",
                    audioStatus === "error" ? "bg-red-500" : "bg-gradient-to-r from-accent via-blue-400 to-accent"
                  )}
                  style={{ 
                    width: `${duration > 0 ? (currentTime / duration) * 100 : (audioStatus === "loading" ? 5 : 0)}%`,
                    boxShadow: audioStatus === "error" ? '0 0 15px rgba(239, 68, 68, 0.5)' : '0 0 15px rgba(0, 163, 255, 0.5)'
                  }}
                >
                  {/* Efeito de brilho intenso na ponta (bolha/líquido) */}
                  <div className={cn(
                    "absolute right-0 top-1/2 -translate-y-1/2 h-full w-4 blur-md rounded-full animate-pulse",
                    audioStatus === "error" ? "bg-red-400/40" : "bg-white/40"
                  )} />
                  <div className={cn(
                    "absolute right-0 top-0 h-full w-2 blur-sm rounded-full",
                    audioStatus === "error" ? "bg-red-200/20" : "bg-white/20"
                  )} />
                </div>
              </div>
            )}

            {/* Mensagem de erro + botão de tentar novamente */}
            {previewMaterial?.link_2 && previewMaterial.link_2 !== "SEM AUDIO" && audioStatus === "error" && (
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-red-500/5 border-t border-red-500/30">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-red-400 animate-pulse-slow flex items-center gap-1.5">
                  <AlertCircle className="h-3 w-3" /> Falha ao carregar o áudio
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-[10px] font-black uppercase tracking-wider text-red-200 hover:bg-red-500/20 rounded-full"
                  onClick={retryAudio}
                >
                  <RotateCcw className="h-3 w-3 mr-1" /> Tentar de novo
                </Button>
              </div>
            )}

            {/* Indicador discreto de carregamento (loading) */}
            {previewMaterial?.link_2 && previewMaterial.link_2 !== "SEM AUDIO" && audioStatus === "loading" && (
              <div className="flex items-center justify-center gap-2 px-3 py-1 bg-accent/5 border-t border-accent/20">
                <Loader2 className="h-3 w-3 animate-spin text-accent" />
                <span className="text-[9px] font-bold uppercase tracking-wider text-accent/80">
                  Carregando áudio{audioSource === "proxy" ? " (via proxy)" : ""}…
                </span>
              </div>
            )}
          </header>

          <div 
            className="relative flex-1 w-full h-full bg-neutral-900 overflow-hidden"
            onPointerDown={(e) => {
              if (e.pointerType === 'touch' && e.clientX < 40) {
                const startX = e.clientX;
                const element = e.currentTarget;
                let hasVibrated = false;
                const threshold = 150;
                
                element.style.transition = 'none';
                
                const handlePointerMove = (moveEvent: PointerEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  if (deltaX > 0) {
                    const progress = Math.min(deltaX / threshold, 1.2);
                    element.style.transform = `translateX(${deltaX * 0.4}px)`;
                    element.style.opacity = `${1 - (deltaX / 400)}`;
                    
                    if (deltaX > threshold && !hasVibrated) {
                      feedback("success");
                      hasVibrated = true;
                    } else if (deltaX <= threshold && hasVibrated) {
                      hasVibrated = false;
                    }
                  }
                };
                
                const handlePointerUp = (upEvent: PointerEvent) => {
                  const deltaX = upEvent.clientX - startX;
                  window.removeEventListener('pointermove', handlePointerMove);
                  window.removeEventListener('pointerup', handlePointerUp);
                  
                  element.style.transition = 'all 0.3s cubic-bezier(0.2, 0, 0, 1)';
                  
                  if (deltaX > threshold) {
                    element.style.transform = 'translateX(100%)';
                    element.style.opacity = '0';
                    setTimeout(() => {
                      saveNote(true);
                      setPreviewMaterial(null);
                      element.style.transform = '';
                      element.style.opacity = '';
                    }, 200);
                  } else {
                    element.style.transform = '';
                    element.style.opacity = '';
                  }
                };
                
                window.addEventListener('pointermove', handlePointerMove);
                window.addEventListener('pointerup', handlePointerUp);
              }
            }}
          >
            {previewMaterial && (
              <MaterialPdfViewer
                fileUrl={getDirectDownloadUrl(previewMaterial.link_1)}
                fallbackUrl={getPdfFallbackUrl(previewMaterial.link_1)}
                materialId={previewMaterial.id}
              />
            )}

            {/* Ícones Flutuantes no Canto Inferior */}
            <div className="absolute bottom-8 right-8 z-30 flex flex-col items-end gap-3">
              <Drawer open={showNotes} onOpenChange={(open) => {
                if (!open) saveNote(true);
                setShowNotes(open);
              }}>
                <DrawerTrigger asChild>
                  <Button 
                    variant="outline"
                    className="h-12 w-12 rounded-2xl shadow-neu-out-sm hover:shadow-neu-in transition-all bg-[hsl(var(--background))] border-none flex items-center justify-center group"
                  >
                    <FileEdit className="h-7 w-7 text-accent group-hover:rotate-12 transition-transform" />
                  </Button>
                </DrawerTrigger>
                <DrawerContent 
                  className="h-[85vh] sm:h-[75vh] rounded-t-[3rem] bg-[hsl(var(--background))] border-none shadow-2xl p-4 sm:p-8 flex flex-col gap-3 sm:gap-4 z-[200]"
                >
                  <div className="mx-auto w-12 h-1.5 rounded-full bg-muted/30 mb-2 shrink-0" />
                  <DrawerHeader className="flex flex-row items-center justify-between space-y-0 shrink-0 p-0">
                    <div className="min-w-0">
                      <DrawerTitle className="text-[10px] sm:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground/60 flex items-center gap-2">
                        <MessageSquareText className="h-4 w-4" />
                        Minhas Anotações
                      </DrawerTitle>
                      <h2 className="text-base sm:text-2xl font-display font-black tracking-tight mt-1 truncate">
                        {previewMaterial?.nome}
                      </h2>
                    </div>
                  </DrawerHeader>
                  <div className="flex-1 min-h-0 overflow-y-auto bg-card/30 shadow-neu-in rounded-[2rem] p-2 mt-2">
                    <Textarea 
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Digite suas anotações aqui..."
                      className="w-full min-h-[60vh] pb-32 bg-transparent border-none shadow-none rounded-[1.5rem] p-6 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 font-medium leading-loose text-base"
                    />
                  </div>
                </DrawerContent>
              </Drawer>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de Report */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog} modal={false}>
        <DialogContent className="sm:max-w-[425px] bg-[hsl(var(--background))] border-none shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[2rem] p-8">
          <DialogHeader className="mb-4">
            <DialogTitle className="flex items-center gap-2 text-xl font-display font-black tracking-tight">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Reportar Problema
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">O que está acontecendo?</label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger className="bg-card/50 border-none shadow-neu-in rounded-xl h-12 font-bold text-xs uppercase tracking-wider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-none shadow-2xl">
                  <SelectItem value="erro" className="text-xs font-bold uppercase">Erro no conteúdo</SelectItem>
                  <SelectItem value="desatualizado" className="text-xs font-bold uppercase">Conteúdo desatualizado</SelectItem>
                  <SelectItem value="audio" className="text-xs font-bold uppercase">Problema no áudio</SelectItem>
                  <SelectItem value="pdf" className="text-xs font-bold uppercase">Problema no PDF</SelectItem>
                  <SelectItem value="bug" className="text-xs font-bold uppercase">Bug no sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Descrição detalhada</label>
              <Textarea 
                value={reportComment}
                onChange={(e) => setReportComment(e.target.value)}
                placeholder="Explique o erro para que possamos corrigir..."
                className="min-h-[120px] bg-card/30 border-none shadow-neu-in rounded-2xl p-4 resize-none focus-visible:ring-accent/10 font-medium text-sm"
              />
            </div>

            <div className="flex gap-3">
              <Button 
                variant="ghost" 
                className="flex-1 rounded-xl font-bold uppercase tracking-widest text-xs h-12"
                onClick={() => setShowReportDialog(false)}
              >
                Cancelar
              </Button>
              <Button 
                className="flex-1 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold uppercase tracking-widest text-xs h-12 shadow-lg"
                onClick={handleSendReport}
                disabled={isSendingReport || !reportComment.trim()}
              >
                {isSendingReport ? "Enviando..." : "Enviar Report"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {activeSimulado && (
        <div className="fixed inset-0 z-[200] bg-[hsl(var(--background))] p-4 md:p-8 overflow-y-auto overscroll-none touch-none">
          <Suspense fallback={<div className="flex flex-col items-center justify-center h-full"><Loader2 className="h-12 w-12 animate-spin text-accent" /><p className="text-lg font-bold text-muted-foreground mt-4">Iniciando Simulado...</p></div>}>
            <SimuladoPlayer 
              simuladoId={activeSimulado} 
              initialReportMode={simuladoInReportMode}
              onClose={() => {
                setActiveSimulado(null);
                fetchSimulados();
              }} 
            />
          </Suspense>
        </div>
      )}

    </div>
  );
}



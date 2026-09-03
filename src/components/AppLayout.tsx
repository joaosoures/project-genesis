import { useEffect, useState, lazy, Suspense } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen, LayoutDashboard, Database, Sparkles, Files,
  Heart, Shield, LogOut, Stethoscope, Baby, Activity,
  Clock, AlertTriangle, Settings, CreditCard, Map,
  Loader2,
} from "lucide-react";
import { UteroIcon, BisturiIcon } from "@/components/icons/MedIcons";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/console/Logo";
import BlurEdges from "@/components/console/BlurEdges";
import { feedback } from "@/lib/sensory";
import { useSettings } from "@/contexts/SettingsContext";

// Lazy load non-critical components
const LoginAlerts = lazy(() => import("@/components/LoginAlerts"));
const PaymentTestModeBanner = lazy(() => import("@/components/PaymentTestModeBanner"));
const TrialUrgencyBanner = lazy(() => import("@/components/TrialUrgencyBanner"));
const ErrorBoundary = lazy(() => import("@/components/ErrorBoundary"));

const FallbackLoader = () => (
  <div className="flex p-4 items-center justify-center">
    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
  </div>
);

function AppSidebar() {
  const { state, isMobile, setOpen, setOpenMobile, openMobile } = useSidebar();
  const collapsed = isMobile ? false : state === "collapsed";
  const { pathname } = useLocation();
  const { isAdmin: isAuthAdmin, signOut, user } = useAuth();
  const isAdmin = isAuthAdmin || user?.email === 'joaoresende2603@gmail.com';
  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");
  const handleNav = () => {
    feedback("flip");
    if (isMobile) setOpenMobile(false);
  };

  const main = [
    { title: "Estudar", url: "/estudo", icon: BookOpen },
    { title: "Área do aluno", url: "/dashboard", icon: LayoutDashboard },
    { title: "Trilha Estratégica", url: "/trilha", icon: Map },
    { title: "Materiais", url: "/materiais", icon: Files },
  ];
  const especialidades = [
    { title: "Clínica Médica", url: "/estudo?esp=clinica_medica", icon: Stethoscope },
    { title: "Cirurgia Geral", url: "/estudo?esp=cirurgia_geral", icon: BisturiIcon },
    { title: "Pediatria", url: "/estudo?esp=pediatria", icon: Baby },
    { title: "Ginecologia/Obs", url: "/estudo?esp=ginecologia_obstetricia", icon: UteroIcon },
    { title: "Med. Preventiva", url: "/estudo?esp=medicina_preventiva", icon: Activity },
  ];
  const extras = [
    { title: "Favoritos", url: "/favoritos", icon: Heart },
    { title: "Banco de OQs", url: "/banco-cards", icon: Database },
    { title: "Gerar OQs", url: "/gerar-oqs", icon: Sparkles },
    { title: "Meu plano", url: "/meu-plano", icon: CreditCard },
    { title: "Configurações", url: "/configuracoes", icon: Settings },
  ];

  return (
    <Sidebar collapsible="icon" className="border-r border-border/60">
      <SidebarContent className="bg-sidebar">
        <div className="px-4 py-8 flex items-center justify-center">
          {!collapsed ? (
            <div className="flex flex-col items-center">
              <Logo size={180} shadow="lg" />
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-accent mt-2 animate-pulse">Code Splitting</span>
            </div>
          ) : (
            <Logo size={42} shadow="md" />
          )}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em]">Estudo</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {main.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url)} onClick={handleNav}>
                    <NavLink to={i.url}><i.icon className="h-4 w-4" />{!collapsed && <span>{i.title}</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em]">Especialidades</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {especialidades.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild onClick={handleNav}>
                    <NavLink to={i.url}><i.icon className="h-4 w-4" />{!collapsed && <span>{i.title}</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.18em]">Mais</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {extras.map((i) => (
                <SidebarMenuItem key={i.url}>
                  <SidebarMenuButton asChild isActive={isActive(i.url.split("?")[0])} onClick={handleNav}>
                    <NavLink to={i.url}><i.icon className="h-4 w-4" />{!collapsed && <span>{i.title}</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {isAdmin && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={isActive("/admin")} onClick={handleNav}>
                    <NavLink to="/admin"><Shield className="h-4 w-4" />{!collapsed && <span>Painel do Administrador</span>}</NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <div className="mt-auto p-3">
          <button onClick={signOut} className="w-full flex items-center gap-2 text-sm px-3 py-2 rounded-xl hover:bg-[hsl(var(--muted))] transition">
            <LogOut className="h-4 w-4" />{!collapsed && "Sair"}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

// DelinquencyBanner and TrialBanner were replaced by TrialUrgencyBanner
// and are kept here only if needed for specific legacy overlays.
function DelinquencyBanner() {
  const { user } = useAuth();
  const [info, setInfo] = useState<{ excluirEm: string | null } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase.from("assinaturas").select("status, excluir_dados_em").eq("usuario_id", user.id).maybeSingle().then(({ data }) => {
      if (data?.status === "inadimplente") {
        setInfo({ excluirEm: data.excluir_dados_em });
      } else {
        setInfo(null);
      }
    });
  }, [user]);

  if (!info) return null;

  const restantes = info.excluirEm 
    ? Math.max(0, Math.ceil((new Date(info.excluirEm).getTime() - Date.now()) / 86400000))
    : 60;

  return (
    <div 
      onClick={() => navigate("/meu-plano")}
      className="w-full bg-red-600 hover:bg-red-700 text-white py-2.5 px-4 text-sm font-medium flex items-center justify-center gap-2 cursor-pointer transition-colors animate-pulse z-[60] shadow-lg"
    >
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span className="text-center">
        Sua conta está congelada - reative em até {restantes} {restantes === 1 ? "dia" : "dias"} para não perder os seus dados de progresso e materiais de estudo
      </span>
      <button className="bg-white text-red-600 px-3 py-0.5 rounded-full text-xs font-bold whitespace-nowrap hidden sm:block">
        Reativar agora
      </button>
    </div>
  );
}

function TrialBanner() {
  const { user } = useAuth();
  const [info, setInfo] = useState<{ status: string; plano: string; diasRestantes?: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("assinaturas").select("*").eq("usuario_id", user.id).maybeSingle().then(({ data }) => {
      if (!data) return;
      if (data.status === "trial" && data.data_fim_trial) {
        const dias = Math.ceil((new Date(data.data_fim_trial).getTime() - Date.now()) / 86400000);
        setInfo({ status: "trial", plano: data.plano, diasRestantes: Math.max(0, dias) });
      } else if (data.status === "ativo") {
        setInfo({ status: "ativo", plano: data.plano });
      } else {
        setInfo(null);
      }
    });
  }, [user]);

  if (!info || info.status === "ativo") return null;

  return (
    <div className="px-4 py-2 text-sm flex items-center">
      {info.status === "trial" && (
        <Badge 
          variant="secondary" 
          className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors rounded-full px-3 py-1 flex items-center gap-1.5 font-semibold"
        >
          <Clock className="h-3.5 w-3.5" />
          {info.diasRestantes} {info.diasRestantes === 1 ? "dia de teste" : "dias de teste"} restantes
        </Badge>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { theme } = useSettings();
  const location = useLocation();
  useEffect(() => {
    // Sugere a instalação do PWA após o login/carregamento inicial
    const timer = setTimeout(() => {
      import("@/components/InstallPrompt").then(mod => {
        mod.triggerInstallPrompt();
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SidebarProvider defaultOpen={false}>
      <Suspense fallback={null}>
        <LoginAlerts />
      </Suspense>
      {location.pathname !== "/estudo" && (
        <div className="[data-reduce-motion='1']_&:hidden">
          <BlurEdges />
        </div>
      )}
      <div translate="no" className="notranslate min-h-screen flex w-full overflow-x-hidden">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 max-w-full">
          <Suspense fallback={null}>
            <TrialUrgencyBanner />
            <PaymentTestModeBanner />
          </Suspense>
          <SidebarTrigger
            className="fixed top-24 left-3 z-50 h-16 w-11 rounded-full bg-background/90 backdrop-blur-md border border-border/80 shadow-xl hover:bg-background transition-all active:scale-95"
            aria-label="Abrir menu"
          />
          <main className="flex-1 min-w-0 w-full overflow-x-hidden">
            <Suspense fallback={<FallbackLoader />}>
              <ErrorBoundary key={location.pathname}>
                <Outlet />
              </ErrorBoundary>
            </Suspense>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, AlertCircle, BarChart3, ShieldCheck, Search, 
  ChevronRight, ChevronDown, CheckCircle2, Clock, XCircle,
  MoreVertical, ShieldAlert, Award, Star, TrendingUp, 
  DollarSign, UserPlus, UserMinus, MessageSquare, Phone,
  Calendar, ArrowUpRight, ArrowDownRight, CreditCard,
  Info, ListFilter
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, AreaChart, Area, Legend 
} from 'recharts';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from "@/components/ui/collapsible";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import ReportsDialog from "@/components/admin/ReportsDialog";
import PlanosDialog from "@/components/admin/PlanosDialog";
import WaitlistDialog from "@/components/admin/WaitlistDialog";
import ApiKeysPool from "@/components/admin/ApiKeysPool";


type Report = {
  id: string;
  tipo: string;
  comentario?: string; 
  status: 'pendente' | 'em_analise' | 'resolvido' | 'arquivado' | 'aberto';
  criado_em: string;
  titulo?: string;
  descricao?: string;
  origem?: string;
  card_id?: string; // Adicionado card_id
  cards?: { id: string; comando: string }; // Ajustado cards para incluir id
  profiles?: { nome: string; email: string };
};

type UserAdmin = {
  id: string;
  nome: string;
  email: string;
  foto_url: string;
  whatsapp: string;
  criado_em: string;
  is_banned: boolean;
  role: string;
  plano_status: string;
  plano_tipo: string;
  data_fim_trial?: string;
  proxima_renovacao?: string;
};

type FaturamentoData = {
  id: string;
  mes: string;
  lucro_total: number;
  novas_captacoes: number;
  desistencias: number;
  inadimplencias: number;
  is_projecao: boolean;
};

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const [stats, setStats] = useState({ users: 0, cards: 0, reports: 0, activeSubs: 0, waitlist: 0 });
  const [reports, setReports] = useState<Report[]>([]);
  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [faturamento, setFaturamento] = useState<FaturamentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [version] = useState(() => `v${Date.now()}`);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifBody, setNotifBody] = useState("");
  const [flags, setFlags] = useState({ manutencao: false, cadastros: true, geracaoIA: true });
  const [selectedUserLogs, setSelectedUserLogs] = useState<any[]>([]);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");
  const [reportsDialogOpen, setReportsDialogOpen] = useState(false);
  const [planosDialogOpen, setPlanosDialogOpen] = useState(false);
  const [waitlistDialogOpen, setWaitlistDialogOpen] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uCount, cCount, rCount, sCount, wCount, rData, paData, uData, fData] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("cards").select("id", { count: "exact", head: true }),
        supabase.from("reports_erro").select("id", { count: "exact", head: true }).eq("status", "pendente"),
        supabase.from("assinaturas").select("id", { count: "exact", head: true }).eq("status", "ativo"),
        supabase.from("lista_espera").select("id", { count: "exact", head: true }).eq("contatado", false),
        supabase.from("reports_erro").select(`
          *,
          cards(id, comando),
          profiles:usuario_id(nome, email)
        `).order("criado_em", { ascending: false }).limit(30),
        supabase.from("problemas_admin").select("*").order("criado_em", { ascending: false }).limit(30),
        supabase.from("admin_users_view").select("*"),
        supabase.from("faturamento").select("*").order("mes", { ascending: true })
      ]);

      setStats({ 
        users: uCount.count ?? 0, 
        cards: cCount.count ?? 0, 
        reports: (rCount.count ?? 0) + (paData.data?.filter(p => p.status === 'aberto').length || 0),
        activeSubs: sCount.count ?? 0,
        waitlist: wCount.count ?? 0
      });

      // Mesclar os dois tipos de reports para visualização uniforme
      const mergedReports: Report[] = [
        ...(rData.data as any[] ?? []).map(r => ({ 
          ...r,
          tipo: r.tipo || 'card_report' 
        })),
        ...(paData.data as any[] ?? []).map(p => ({
          id: p.id,
          tipo: p.origem || 'problema_admin',
          card_id: p.card_id,
          comentario: p.descricao,
          titulo: p.titulo,
          status: p.status,
          criado_em: p.criado_em
        }))
      ].sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());

      setReports(mergedReports);
      setUsers(uData.data as UserAdmin[] ?? []);
      setFaturamento(fData.data as FaturamentoData[] ?? []);
    } catch (error) {
      console.error("Erro ao carregar dados admin:", error);
      toast.error("Erro ao carregar dados do painel");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Painel do Administrador — OQ Falta?";
    fetchData();
    // Carregar flags persistidas
    (async () => {
      const { data } = await (supabase as any).from("system_flags").select("key,value");
      if (data) {
        const get = (k: string, def: boolean) => {
          const r = data.find((x: any) => x.key === k);
          return r ? r.value === true || r.value === "true" : def;
        };
        setFlags({
          manutencao: get("manutencao", false),
          cadastros: get("cadastros_abertos", true),
          geracaoIA: get("geracao_ia", true),
        });
      }
    })();
  }, []);

  const persistFlag = async (key: string, value: boolean) => {
    const { error } = await (supabase as any)
      .from("system_flags")
      .upsert({ key, value, atualizado_em: new Date().toISOString() }, { onConflict: "key" });
    if (error) toast.error("Falha ao salvar flag");
  };

  const handleUpdateRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.rpc('admin_set_role', {
      target_user_id: userId,
      new_role: newRole as any,
    });
    
    if (error) {
      toast.error("Erro ao atualizar função: " + error.message);
    } else {
      toast.success("Função atualizada com sucesso");
      fetchData();
    }
  };

  const handleUpdateReportStatus = async (report: Report, newStatus: string) => {
    const isProblemaAdmin = report.tipo === 'material_report' || report.tipo === 'manual' || report.tipo === 'problema_admin' || !report.profiles;
    const table = isProblemaAdmin ? "problemas_admin" : "reports_erro";
    
    const { error } = await supabase
      .from(table as any)
      .update({ status: newStatus as any })
      .eq("id", report.id);
    
    if (error) {
      toast.error("Erro ao atualizar report");
    } else {
      toast.success("Status do report atualizado");
      fetchData();
    }
  };

  const handleUpdateSubscription = async (userId: string, newStatus: string, newPlano: string) => {
    const { error } = await supabase.rpc('admin_set_subscription', {
      target_user_id: userId,
      new_status: newStatus,
      new_plano: newPlano,
    });
    
    if (error) {
      toast.error("Erro ao atualizar assinatura: " + error.message);
    } else {
      toast.success("Assinatura atualizada");
      fetchData();
    }
  };


  const handleToggleBan = async (userId: string, currentStatus: boolean) => {
    const { error } = await supabase.rpc('toggle_user_ban', { target_user_id: userId });
    
    if (error) {
      toast.error("Erro ao atualizar status de banimento: " + error.message);
    } else {
      toast.success(currentStatus ? "Usuário desbanido" : "Usuário banido com sucesso");
      fetchData();
    }
  };

  const handleResetUserData = async (userId: string) => {
    if (!confirm("TEM CERTEZA? Isso excluirá TODO o progresso de estudo, configurações e histórico do usuário. Esta ação é irreversível.")) {
      return;
    }

    const { error } = await supabase.rpc('reset_user_data', { target_user_id: userId });
    
    if (error) {
      toast.error("Erro ao resetar dados: " + error.message);
    } else {
      toast.success("Dados do usuário resetados com sucesso! (Cache limpo)");
      fetchData();
    }
  };

  const handleExtendTrial = async (userId: string) => {
    const { error } = await supabase.rpc('extend_trial', { target_user_id: userId, days_to_add: 7 });
    
    if (error) {
      toast.error("Erro ao estender trial: " + error.message);
    } else {
      toast.success("Trial estendido em +7 dias!");
      fetchData();
    }
  };

  const handleVerLogs = async (userId: string, userEmail: string) => {
    setSelectedUserEmail(userEmail);
    const { data, error } = await supabase
      .from("historico_estudo")
      .select("*")
      .eq("usuario_id", userId)
      .order("timestamp", { ascending: false })
      .limit(10);
    
    if (error) {
      toast.error("Erro ao carregar logs");
      return;
    }

    if (!data || data.length === 0) {
      toast.info("Nenhum log de atividade recente encontrado.");
      return;
    }

    setSelectedUserLogs(data);
    setIsLogModalOpen(true);
  };

  const filteredUsers = users.filter(u => 

    u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1"><ShieldAlert size={12}/> Admin</Badge>;
      case 'editor': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 gap-1">Editor</Badge>;
      case 'estudante_ouro': return <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 gap-1"><Award size={12}/> Ouro</Badge>;
      case 'estudante_prata': return <Badge className="bg-slate-300/20 text-slate-300 border-slate-300/30 gap-1"><Star size={12}/> Prata</Badge>;
      default: return <Badge variant="outline" className="text-muted-foreground">Bronze</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pendente': 
      case 'aberto': return <Clock className="text-yellow-500" size={16} />;
      case 'em_analise': return <Search className="text-blue-500" size={16} />;
      case 'resolvido': return <CheckCircle2 className="text-green-500" size={16} />;
      case 'arquivado': return <XCircle className="text-muted-foreground" size={16} />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Painel do Administrador
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Gerenciamento centralizado de usuários, permissões e reports. <span className="text-[10px] opacity-30">Build: {version}</span></p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Card className="glass px-3 py-1.5 flex items-center gap-2 border-primary/20">
            <Info size={14} className="text-primary" />
            <div className="flex flex-col">
              <span className="text-[10px] text-muted-foreground uppercase leading-none">Seu Perfil</span>
              <span className="text-xs font-mono font-bold leading-tight">{user?.email}</span>
            </div>
            <Badge variant={isAdmin ? "default" : "secondary"} className="text-[10px] h-5">
              {isAdmin ? "ADMIN" : "USER"}
            </Badge>
          </Card>
          <Button variant="outline" size="sm" onClick={fetchData} className="glass">
            <Clock className="mr-2 h-4 w-4" /> Atualizar
          </Button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: "Usuários Totais", value: stats.users, icon: Users, color: "text-blue-400", onClick: undefined as undefined | (() => void) },
          { label: "OQs no Banco", value: stats.cards, icon: BarChart3, color: "text-purple-400", onClick: undefined },
          { label: "Reports Pendentes", value: stats.reports, icon: AlertCircle, color: "text-red-400", onClick: () => setReportsDialogOpen(true) },
          { label: "Planos Ativos", value: stats.activeSubs, icon: ShieldCheck, color: "text-green-400", onClick: () => setPlanosDialogOpen(true) },
          { label: "Lista de Espera", value: stats.waitlist, icon: ListFilter, color: "text-amber-400", onClick: () => setWaitlistDialogOpen(true) },
        ].map((item, i) => (
          <Card
            key={i}
            onClick={item.onClick}
            className={cn(
              "p-6 bg-card/40 border-border/50 backdrop-blur-md group transition-all duration-300",
              item.onClick && "cursor-pointer hover:border-primary/50 hover:scale-[1.02] active:scale-100",
              !item.onClick && "hover:border-primary/30",
            )}
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                  {item.label}
                  {item.onClick && <span className="ml-1 text-primary/60 text-[10px]">›</span>}
                </p>
                <p className="text-3xl font-bold neon-text">{item.value}</p>
              </div>
              <div className={`p-2 rounded-xl bg-background/50 border border-border/50 ${item.color}`}>
                <item.icon size={20} />
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="w-full">
        <ScrollArea className="w-full mb-6">
          <TabsList className="bg-muted/30 border border-border/50 p-1 inline-flex w-max">
            <TabsTrigger value="users" className="gap-2 data-[state=active]:bg-primary/20 whitespace-nowrap">
              <Users size={16} /> Usuários
            </TabsTrigger>
            <TabsTrigger value="finance" className="gap-2 data-[state=active]:bg-primary/20 whitespace-nowrap">
              <DollarSign size={16} /> Financeiro
            </TabsTrigger>
            <TabsTrigger value="reports" className="gap-2 data-[state=active]:bg-primary/20 whitespace-nowrap">
              <AlertCircle size={16} /> Reports {stats.reports > 0 && <Badge variant="destructive" className="ml-1 h-5 min-w-5 p-0 flex items-center justify-center text-[10px]">{stats.reports}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="permissions" className="gap-2 data-[state=active]:bg-primary/20 whitespace-nowrap">
              <ShieldCheck size={16} /> Permissões
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2 data-[state=active]:bg-primary/20 whitespace-nowrap">
              <ShieldAlert size={16} /> Sistema
            </TabsTrigger>
          </TabsList>
        </ScrollArea>


        <TabsContent value="users" className="space-y-6">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
              <Input 
                placeholder="Buscar por nome ou e-mail..." 
                className="pl-10 glass focus:ring-primary/30"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="text-center py-12 text-muted-foreground">Nenhum usuário encontrado.</p>
            ) : (
              filteredUsers.map((u) => (
                <Collapsible key={u.id} className="group">
                  <Card className="overflow-hidden bg-card/30 border-border/40 hover:border-primary/20 transition-all">
                    <div className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center overflow-hidden">
                          {u.foto_url ? <img src={u.foto_url} alt="" className="w-full h-full object-cover" /> : <Users className="text-primary/40" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-lg">{u.nome || "Usuário sem nome"}</h3>
                            {getRoleBadge(u.role)}
                          </div>
                          <p className="text-xs text-muted-foreground font-mono">{u.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        <div className="text-right hidden sm:block">
                          <p className="text-[10px] uppercase text-muted-foreground mb-0.5">Plano & Status</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="border-primary/30 capitalize">
                              {u.plano_tipo || 'Bronze'}
                            </Badge>
                            <Badge variant={u.plano_status === 'ativo' ? 'default' : 'secondary'} className={u.plano_status === 'ativo' ? 'bg-green-500/20 text-green-400' : ''}>
                              {u.plano_status || 'sem plano'}
                            </Badge>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                             <DropdownMenuContent align="end" className="glass w-56">
                              <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ações Rápidas</div>
                              <DropdownMenuItem onClick={() => handleExtendTrial(u.id)} className="gap-2 text-green-400">
                                <Clock size={14}/> Dar +7 Dias Trial
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleResetUserData(u.id)} className="gap-2 text-orange-400">
                                <XCircle size={14}/> Limpar Cache (Reset)
                              </DropdownMenuItem>
                              
                              <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border/20">Permissões</div>
                              <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'admin')} className="gap-2"><ShieldAlert size={14}/> Tornar Admin</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'editor')} className="gap-2">Tornar Editor</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateRole(u.id, 'estudante_bronze')} className="gap-2">Resetar p/ Bronze</DropdownMenuItem>
                              
                              <div className="px-2 py-1.5 mt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider border-t border-border/20">Plano & Status</div>
                              <DropdownMenuItem onClick={() => handleUpdateSubscription(u.id, 'ativo', 'ouro')} className="gap-2 text-yellow-500"><Award size={14}/> Ativar Ouro (Ativo)</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateSubscription(u.id, 'ativo', 'prata')} className="gap-2 text-slate-300"><Star size={14}/> Ativar Prata (Ativo)</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateSubscription(u.id, 'cancelado', u.plano_tipo || 'bronze')} className="gap-2 text-red-400"><XCircle size={14}/> Cancelar Plano</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ChevronDown className="group-data-[state=open]:rotate-180 transition-transform" size={16} />
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="p-6 pt-0 border-t border-border/20 bg-muted/5">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-6">
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Estatísticas de Estudo</h4>
                            <div className="space-y-3">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total de Revisões</span>
                                <span className="font-mono font-bold">1,240</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Taxa de Acerto</span>
                                <span className="text-green-400 font-bold">84%</span>
                              </div>
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">OQs Criados</span>
                                <span className="font-mono">12</span>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Informações de Contato</h4>
                            <div className="space-y-4">
                              <div className="space-y-1">
                                <p className="text-[10px] text-muted-foreground uppercase">WhatsApp</p>
                                <div className="flex items-center gap-2">
                                  <Phone size={14} className="text-green-500" />
                                  <Input 
                                    className="h-8 glass text-sm bg-muted/20" 
                                    value={u.whatsapp || "Não informado"} 
                                    readOnly
                                  />
                                </div>
                              </div>
                              <div className="flex flex-col gap-2">
                                <Button 
                                  size="sm" 
                                  variant="secondary" 
                                  className="w-full gap-2 text-xs h-8"
                                  onClick={() => window.open(`https://wa.me/${u.whatsapp?.replace(/\D/g, '')}`, '_blank')}
                                  disabled={!u.whatsapp}
                                >
                                  <MessageSquare size={14} /> Abrir Conversa
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="w-full gap-2 text-xs h-8"
                                  onClick={() => {
                                    const msg = encodeURIComponent("Olá! Estamos sentindo sua falta nos estudos - tome um cupom de desconto para retornar: VOLTA20");
                                    window.open(`https://wa.me/${u.whatsapp?.replace(/\D/g, '')}?text=${msg}`, '_blank');
                                  }}
                                  disabled={!u.whatsapp}
                                >
                                  <TrendingUp size={14} /> Enviar Promoção
                                </Button>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Informações da Conta</h4>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Membro desde</span>
                                <span>{new Date(u.criado_em).toLocaleDateString("pt-BR")}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Plano atual</span>
                                <span className="capitalize">{u.plano_tipo || 'Grátis'}</span>
                              </div>
                              {u.data_fim_trial && u.plano_status === 'trial' && (
                                <div className="flex justify-between text-yellow-500/80">
                                  <span className="">Fim do Trial</span>
                                  <span className="font-bold">{new Date(u.data_fim_trial).toLocaleDateString("pt-BR")}</span>
                                </div>
                              )}
                              {u.proxima_renovacao && u.plano_status === 'ativo' && (
                                <div className="flex justify-between text-green-400/80">
                                  <span className="">Próxima Renovação</span>
                                  <span className="font-bold">{new Date(u.proxima_renovacao).toLocaleDateString("pt-BR")}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Status</span>
                                <Badge variant="outline" className={cn("text-[10px] h-4", u.plano_status === 'trial' && "border-yellow-500/50 text-yellow-500")}>
                                  {u.plano_status || 'ativo'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <div>
                            <h4 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">Ações Avançadas</h4>
                            <div className="flex flex-wrap gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-[10px] h-7"
                                onClick={() => handleVerLogs(u.id, u.email)}
                              >
                                Ver Logs
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="text-[10px] h-7 border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
                                onClick={() => handleResetUserData(u.id)}
                              >
                                Limpar Cache
                              </Button>
                              <Button 
                                size="sm" 
                                variant={u.is_banned ? "outline" : "destructive"} 
                                className={cn("text-[10px] h-7", !u.is_banned && "opacity-80 hover:opacity-100")}
                                onClick={() => handleToggleBan(u.id, u.is_banned)}
                              >
                                {u.is_banned ? "Desbanir" : "Banir / Excluir"}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="finance" className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="p-6 bg-card/40 border-border/50 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-green-500/10 text-green-500">
                  <TrendingUp size={20} />
                </div>
                <Badge variant="outline" className="bg-green-500/5 text-green-400 border-green-500/20">
                  +12% vs anterior
                </Badge>
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Novas Captações (Mês)</p>
              <h3 className="text-3xl font-bold mt-1 neon-text">
                {faturamento.find(f => !f.is_projecao && new Date(f.mes).getMonth() === new Date().getMonth())?.novas_captacoes || 0}
              </h3>
            </Card>

            <Card className="p-6 bg-card/40 border-border/50 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                  <UserMinus size={20} />
                </div>
                <Badge variant="outline" className="bg-red-500/5 text-red-400 border-red-500/20">
                  Taxa: 2.4%
                </Badge>
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Desistências (Mês)</p>
              <h3 className="text-3xl font-bold mt-1 neon-text">
                {faturamento.find(f => !f.is_projecao && new Date(f.mes).getMonth() === new Date().getMonth())?.desistencias || 0}
              </h3>
            </Card>

            <Card className="p-6 bg-card/40 border-border/50 backdrop-blur-md">
              <div className="flex items-center justify-between mb-4">
                <div className="p-2 rounded-lg bg-orange-500/10 text-orange-500">
                  <CreditCard size={20} />
                </div>
                <Badge variant="outline" className="bg-orange-500/5 text-orange-400 border-orange-500/20">
                  R$ 4.200,00 pendente
                </Badge>
              </div>
              <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Inadimplências (Mês)</p>
              <h3 className="text-3xl font-bold mt-1 neon-text">
                {faturamento.find(f => !f.is_projecao && new Date(f.mes).getMonth() === new Date().getMonth())?.inadimplencias || 0}
              </h3>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6 bg-card/40 border-border/50 backdrop-blur-md">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <DollarSign size={18} className="text-primary" /> Evolução de Faturamento
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={faturamento}>
                    <defs>
                      <linearGradient id="colorLucro" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#888' }}
                      tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { month: 'short' })}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#888' }}
                      tickFormatter={(val) => `R$ ${val/1000}k`}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1A1F2C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                      itemStyle={{ color: '#fff' }}
                      formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Lucro']}
                    />
                    <Area type="monotone" dataKey="lucro_total" stroke="var(--primary)" fillOpacity={1} fill="url(#colorLucro)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6 bg-card/40 border-border/50 backdrop-blur-md">
              <h3 className="font-bold mb-6 flex items-center gap-2">
                <Users size={18} className="text-primary" /> Atividade de Usuários
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={faturamento}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                      dataKey="mes" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#888' }}
                      tickFormatter={(val) => new Date(val).toLocaleDateString('pt-BR', { month: 'short' })}
                    />
                    <YAxis 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: '#888' }}
                    />
                    <RechartsTooltip 
                      contentStyle={{ backgroundColor: '#1A1F2C', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px' }} />
                    <Bar dataKey="novas_captacoes" name="Novas Captações" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="desistencias" name="Desistências" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={20} />
                    <Bar dataKey="inadimplencias" name="Inadimplências" fill="#f97316" radius={[4, 4, 0, 0]} barSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <Card className="bg-card/40 border-border/50 overflow-hidden">
            <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
              <h3 className="font-bold flex items-center gap-2 text-sm">
                <Calendar size={16} /> Detalhes Mensais (3 meses ant. / atual / próx.)
              </h3>
              <Button size="sm" variant="outline" className="text-[10px] h-7">Exportar Relatório</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/10 text-muted-foreground text-[10px] uppercase tracking-wider">
                    <th className="px-4 py-3 text-left font-medium">Mês</th>
                    <th className="px-4 py-3 text-right font-medium">Lucro Total</th>
                    <th className="px-4 py-3 text-right font-medium">Captações</th>
                    <th className="px-4 py-3 text-right font-medium">Churn</th>
                    <th className="px-4 py-3 text-right font-medium">Inadimp.</th>
                    <th className="px-4 py-3 text-center font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {faturamento.map((item) => (
                    <tr key={item.id} className={`hover:bg-primary/5 transition-colors ${item.is_projecao ? 'bg-primary/5 italic' : ''}`}>
                      <td className="px-4 py-3 font-medium capitalize">
                        {new Date(item.mes).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-green-400">
                        R$ {item.lucro_total.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-400">+{item.novas_captacoes}</td>
                      <td className="px-4 py-3 text-right text-red-400">-{item.desistencias}</td>
                      <td className="px-4 py-3 text-right text-orange-400">{item.inadimplencias}</td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={item.is_projecao ? "outline" : "default"} className={item.is_projecao ? "border-primary/50 text-primary" : "bg-green-500/20 text-green-400"}>
                          {item.is_projecao ? 'Projeção' : 'Confirmado'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="p-6 bg-card/40 border-border/50 backdrop-blur-md space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <BarChart3 className="text-primary" size={18} /> Manutenção de Dados
              </h3>
              <p className="text-xs text-muted-foreground">Otimize o banco de dados e recalcule estatísticas de usuários.</p>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    const tid = toast.loading("Limpando cache local...");
                    try {
                      const keys = Object.keys(localStorage);
                      let removed = 0;
                      keys.forEach(k => {
                        if (!k.includes('sb-') && !k.includes('supabase.auth')) {
                          localStorage.removeItem(k);
                          removed++;
                        }
                      });
                      sessionStorage.clear();
                      toast.success(`Cache local limpo (${removed} chaves removidas).`, { id: tid });
                    } catch (e: any) {
                      toast.error("Erro ao limpar cache: " + e.message, { id: tid });
                    }
                  }}
                >
                  <CheckCircle2 size={14} className="text-green-500" /> Limpar Cache Global
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={async () => {
                    const tid = toast.loading("Verificando scores SRS...");
                    try {
                      const { count, error } = await supabase
                        .from("desempenho_cards")
                        .select("id", { count: "exact", head: true });
                      if (error) throw error;
                      toast.success(`${count ?? 0} registros SRS analisados. Recomputação ocorre automaticamente a cada estudo.`, { id: tid, duration: 5000 });
                    } catch (e: any) {
                      toast.error("Erro: " + e.message, { id: tid });
                    }
                  }}
                >
                  <TrendingUp size={14} className="text-blue-500" /> Recalcular Scores SRS
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start gap-2"
                  onClick={async () => {
                    const tid = toast.loading("Verificando integridade do banco...");
                    try {
                      const [c, u, s, r] = await Promise.all([
                        supabase.from("cards").select("id", { count: "exact", head: true }),
                        supabase.from("profiles").select("id", { count: "exact", head: true }),
                        supabase.from("assinaturas").select("id", { count: "exact", head: true }),
                        supabase.from("reports_erro").select("id", { count: "exact", head: true }),
                      ]);
                      const errs = [c.error, u.error, s.error, r.error].filter(Boolean);
                      if (errs.length > 0) {
                        toast.error(`Falhas: ${errs.map(e => e!.message).join("; ")}`, { id: tid });
                      } else {
                        toast.success(
                          `Integridade OK • Cards: ${c.count} • Usuários: ${u.count} • Assinaturas: ${s.count} • Reports: ${r.count}`,
                          { id: tid, duration: 6000 }
                        );
                      }
                    } catch (e: any) {
                      toast.error("Erro na verificação: " + e.message, { id: tid });
                    }
                  }}
                >
                  <ShieldAlert size={14} className="text-red-500" /> Verificar Integridade
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-card/40 border-border/50 backdrop-blur-md space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <MessageSquare className="text-primary" size={18} /> Comunicação em Massa
              </h3>
              <p className="text-xs text-muted-foreground">Registra um aviso interno na fila de problemas administrativos.</p>
              <div className="space-y-3">
                <Input 
                  placeholder="Título do aviso..." 
                  className="h-8 glass text-xs"
                  value={notifTitle}
                  onChange={(e) => setNotifTitle(e.target.value)}
                />
                <textarea 
                  placeholder="Conteúdo da mensagem..." 
                  className="w-full h-20 glass bg-transparent rounded-md p-2 text-xs focus:ring-1 focus:ring-primary outline-none"
                  value={notifBody}
                  onChange={(e) => setNotifBody(e.target.value)}
                />
                <Button 
                  size="sm" 
                  className="w-full gap-2"
                  disabled={!notifTitle.trim() || !notifBody.trim()}
                  onClick={async () => {
                    const tid = toast.loading("Registrando aviso...");
                    const { error } = await supabase.from("problemas_admin").insert({
                      titulo: notifTitle.trim(),
                      descricao: notifBody.trim(),
                      origem: "aviso_admin",
                      status: "aberto",
                      prioridade: "media"
                    });
                    if (error) {
                      toast.error("Erro: " + error.message, { id: tid });
                    } else {
                      toast.success("Aviso registrado na aba de Reports.", { id: tid });
                      setNotifTitle("");
                      setNotifBody("");
                      fetchData();
                    }
                  }}
                >
                  <CheckCircle2 size={14} /> Disparar Notificação
                </Button>
              </div>
            </Card>

            <Card className="p-6 bg-card/40 border-border/50 backdrop-blur-md space-y-4">
              <h3 className="font-bold flex items-center gap-2">
                <ShieldCheck className="text-primary" size={18} /> Configurações Globais
              </h3>
              <p className="text-xs text-muted-foreground">Flags globais, persistidas no banco e aplicadas para todos os usuários.</p>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs">Manutenção Ativa</span>
                  <Switch
                    checked={flags.manutencao}
                    onCheckedChange={(v) => {
                      setFlags(f => ({ ...f, manutencao: v }));
                      persistFlag("manutencao", v);
                      toast.success(v ? "Modo manutenção ATIVO" : "Modo manutenção desativado");
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs block">Novos Cadastros</span>
                    <span className="text-[10px] text-muted-foreground">Quando desligado, novos usuários entram na lista de espera.</span>
                  </div>
                  <Switch
                    checked={flags.cadastros}
                    onCheckedChange={(v) => {
                      setFlags(f => ({ ...f, cadastros: v }));
                      persistFlag("cadastros_abertos", v);
                      toast.success(v ? "Cadastros liberados globalmente" : "Cadastros BLOQUEADOS — usuários verão a lista de espera");
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs">Geração IA (OQs)</span>
                  <Switch
                    checked={flags.geracaoIA}
                    onCheckedChange={(v) => {
                      setFlags(f => ({ ...f, geracaoIA: v }));
                      persistFlag("geracao_ia", v);
                      toast.success(v ? "Geração IA ativada" : "Geração IA desativada");
                    }}
                  />
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-6 bg-card/40 border-border/50">
            <ApiKeysPool />
          </Card>
        </TabsContent>


        <TabsContent value="reports" className="space-y-4">
          <Card className="bg-card/40 border-border/50">
            <div className="p-4 border-b border-border/50 flex justify-between items-center">
              <h2 className="font-bold flex items-center gap-2">
                <AlertCircle className="text-red-400" size={18} /> Reports Recentes
              </h2>
              <Badge variant="outline">{reports.length} reports</Badge>
            </div>
            <ScrollArea className="h-[600px]">
              {reports.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground">Nenhum report encontrado.</div>
              ) : (
                <div className="divide-y divide-border/30">
                  {reports.map((r) => (
                    <div key={r.id} className="p-4 hover:bg-primary/5 transition-colors group">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-tighter", r.tipo === 'material_report' && "bg-red-500/10 text-red-400 border-red-500/20")}>
                              {r.tipo.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">•</span>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <Clock size={10} /> {new Date(r.criado_em).toLocaleDateString("pt-BR")} {new Date(r.criado_em).toLocaleTimeString("pt-BR", { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          {r.titulo && <p className="text-xs font-bold text-primary mt-1">{r.titulo}</p>}
                          <p className="text-sm font-medium mt-1">"{r.comentario || "Sem descrição"}"</p>
                          {r.cards && (
                            <div className="mt-2 p-2 bg-muted/40 rounded border border-border/30 text-xs">
                              <span className="text-primary font-bold">CARD:</span> {r.cards.comando}
                            </div>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                             <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px]">
                               {r.profiles?.nome?.[0] || 'U'}
                             </div>
                             <span className="text-[10px] text-muted-foreground">{r.profiles?.nome || r.profiles?.email || "Relato de Material"}</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-7 text-[10px] gap-1 px-2">
                                {getStatusIcon(r.status)}
                                <span className="capitalize">{r.status.replace('_', ' ')}</span>
                                <ChevronDown size={12} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="glass">
                              <DropdownMenuItem onClick={() => handleUpdateReportStatus(r, 'pendente')}>Pendente / Aberto</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateReportStatus(r, 'em_analise')}>Em Análise</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateReportStatus(r, 'resolvido')}>Resolvido</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleUpdateReportStatus(r, 'arquivado')}>Arquivado</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                          {(r.cards || r.card_id || r.tipo === 'material_report' || r.tipo === 'oq_temporario_report' || r.tipo === 'conteudo_incorreto' || r.tipo === 'erro_digitacao' || r.tipo === 'ambiguidade' || r.tipo === 'card_report') && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] text-primary hover:underline"
                              onClick={() => {
                                if (r.tipo === 'material_report') {
                                  const materialId = r.comentario?.match(/Material ID: ([a-f0-9-]{36})/)?.[1];
                                  if (materialId) {
                                    window.open(`/materiais?id=${materialId}`, '_blank');
                                  } else {
                                    window.open(`/materiais`, '_blank');
                                  }
                                } else if (r.tipo === 'oq_temporario_report') {
                                  window.open('/gerar-oqs', '_blank');
                                } else {
                                  const cid = r.cards?.id || r.card_id;
                                  if (cid) {
                                    window.open(`/estudo?id=${cid}`, '_blank');
                                  }
                                }
                              }}
                            >
                              {r.tipo === 'material_report' ? 'Ir para Material' : (r.tipo === 'oq_temporario_report' ? 'Ir para Gerador' : 'Ir para Card')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>
        </TabsContent>

        <TabsContent value="permissions">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="p-6 bg-card/40 border-border/50">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                <ShieldCheck className="text-primary" /> Matriz de Acesso
              </h2>
              <div className="space-y-4">
                {[
                  { label: "Estudante Ouro", desc: "Acesso total a materiais, áudios e geradores IA ilimitados.", active: true },
                  { label: "Estudante Prata", desc: "Acesso total a materiais, limite diário de IA.", active: true },
                  { label: "Estudante Bronze", desc: "Acesso a materiais básicos e banco de OQs.", active: true },
                  { label: "Admin/Editor", desc: "Acesso administrativo total ao sistema.", active: true },
                ].map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-background/40 border border-border/30">
                    <div className="max-w-[80%]">
                      <p className="text-sm font-bold">{p.label}</p>
                      <p className="text-[10px] text-muted-foreground">{p.desc}</p>
                    </div>
                    <Switch checked={p.active} disabled />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-6 bg-card/40 border-border/50">
              <h2 className="font-bold text-xl mb-6 flex items-center gap-2">
                <ShieldAlert className="text-red-400" /> Logs de Segurança
              </h2>
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground italic">Integração com logs de auditoria em desenvolvimento.</p>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <DialogContent className="glass border-primary/20 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Clock className="text-primary" size={20} />
              Logs de Atividade — {selectedUserEmail}
            </DialogTitle>
            <DialogDescription>
              Últimas 10 interações de estudo do usuário no sistema.
            </DialogDescription>
          </DialogHeader>
          
          <ScrollArea className="h-[400px] mt-4 pr-4">
            <div className="space-y-4">
              {selectedUserLogs.map((log, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-muted/20 border border-border/50 flex justify-between items-center text-sm">
                  <div>
                    <p className="font-bold">Respondeu OQ: <span className="text-primary font-mono ml-2 text-xs opacity-60">{log.card_id}</span></p>
                    <p className="text-xs text-muted-foreground">
                      Resultado: <span className={cn(log.acertou ? "text-green-400" : "text-red-400")}>
                        {log.acertou ? "Acerto" : "Erro"}
                      </span> • Nota: {log.nota}
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <ReportsDialog open={reportsDialogOpen} onOpenChange={setReportsDialogOpen} />
      <PlanosDialog open={planosDialogOpen} onOpenChange={setPlanosDialogOpen} />
      <WaitlistDialog open={waitlistDialogOpen} onOpenChange={setWaitlistDialogOpen} />
    </div>
  );
}


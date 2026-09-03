import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Clock, 
  Mail, 
  Phone, 
  User, 
  CheckCircle2, 
  XCircle,
  MessageSquare
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface WaitlistEntry {
  id: string;
  nome: string | null;
  email: string;
  whatsapp: string | null;
  mensagem: string | null;
  contatado: boolean;
  criado_em: string;
}

interface WaitlistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function WaitlistDialog({ open, onOpenChange }: WaitlistDialogProps) {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchWaitlist = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("lista_espera")
        .select("*")
        .order("criado_em", { ascending: false });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error("Erro ao buscar lista de espera:", error);
      toast.error("Erro ao carregar lista de espera");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchWaitlist();
    }
  }, [open]);

  const toggleContacted = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("lista_espera")
        .update({ contatado: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      
      setEntries(prev => prev.map(e => e.id === id ? { ...e, contatado: !currentStatus } : e));
      toast.success(currentStatus ? "Marcado como não contatado" : "Marcado como contatado");
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-primary/20 max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Clock className="text-primary" size={24} />
            Lista de Espera
          </DialogTitle>
          <DialogDescription>
            Usuários que tentaram se cadastrar enquanto o sistema estava fechado.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="h-[60vh] mt-4 pr-4">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : entries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground italic">
              Ninguém na lista de espera no momento.
            </div>
          ) : (
            <div className="space-y-4">
              {entries.map((entry) => (
                <div 
                  key={entry.id} 
                  className={`p-4 rounded-2xl border transition-all ${
                    entry.contatado 
                      ? 'bg-muted/10 border-border/30 opacity-70' 
                      : 'bg-card/40 border-primary/20 shadow-lg shadow-primary/5'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <User size={16} className="text-primary" />
                        <span className="font-bold">{entry.nome || "Anônimo"}</span>
                        {entry.contatado && (
                          <Badge variant="outline" className="text-[10px] bg-green-500/10 text-green-400 border-green-500/20">
                            Contatado
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail size={14} />
                          <span>{entry.email}</span>
                        </div>
                        {entry.whatsapp && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone size={14} />
                            <span>{entry.whatsapp}</span>
                          </div>
                        )}
                        <div className="text-[10px] text-muted-foreground/60 flex items-center gap-1 mt-1">
                          <Clock size={10} />
                          {format(new Date(entry.criado_em), "PPP 'às' p", { locale: ptBR })}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {entry.whatsapp && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-9 gap-2 glass border-green-500/20 text-green-400 hover:bg-green-500/10"
                          onClick={() => window.open(`https://wa.me/${entry.whatsapp?.replace(/\D/g, '')}`, '_blank')}
                        >
                          <MessageSquare size={14} />
                          WhatsApp
                        </Button>
                      )}
                      <Button 
                        variant={entry.contatado ? "ghost" : "outline"} 
                        size="sm" 
                        className={`h-9 gap-2 ${!entry.contatado ? 'border-primary/30 text-primary hover:bg-primary/10' : ''}`}
                        onClick={() => toggleContacted(entry.id, entry.contatado)}
                      >
                        {entry.contatado ? (
                          <><XCircle size={14} /> Desmarcar</>
                        ) : (
                          <><CheckCircle2 size={14} /> Marcar Contato</>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

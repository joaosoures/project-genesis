import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Trash2, Key, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, Layers, Activity, Loader2
} from "lucide-react";
import { toast } from "sonner";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface ApiKey {
  id: string;
  provider: string;
  key_value: string;
  label: string;
  is_active: boolean;
  priority: number;
  last_used_at: string | null;
  error_count: number;
  last_error: string | null;
}

type TestStatus = {
  state: "idle" | "testing" | "ok" | "fail";
  message?: string;
  elapsedMs?: number;
  testedAt?: string;
};

export default function ApiKeysPool() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [statuses, setStatuses] = useState<Record<string, TestStatus>>({});

  const [newLabel, setNewLabel] = useState("");
  const [newKey, setNewKey] = useState("");
  const [newProvider, setNewProvider] = useState("lovable_gateway");
  const [newPriority, setNewPriority] = useState("0");

  const fetchKeys = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("api_keys_pool")
        .select("*")
        .order("priority", { ascending: true });
      if (error) throw error;
      setKeys(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar pool de chaves");
    } finally {
      setLoading(false);
    }
  };

  const testKey = async (id: string, silent = false) => {
    setStatuses(prev => ({ ...prev, [id]: { state: "testing" } }));
    try {
      const { data, error } = await supabase.functions.invoke("test-api-key", {
        body: { keyId: id },
      });
      if (error) throw error;

      if (data?.ok) {
        setStatuses(prev => ({
          ...prev,
          [id]: {
            state: "ok",
            message: data.message,
            elapsedMs: data.elapsedMs,
            testedAt: new Date().toISOString(),
          },
        }));
        if (!silent) toast.success(`Chave funcional (${data.elapsedMs}ms)`);
      } else {
        setStatuses(prev => ({
          ...prev,
          [id]: {
            state: "fail",
            message: data?.error || "Falha desconhecida",
            testedAt: new Date().toISOString(),
          },
        }));
        if (!silent) toast.error(`Falha: ${data?.error}`);
      }
    } catch (e: any) {
      setStatuses(prev => ({
        ...prev,
        [id]: { state: "fail", message: e.message, testedAt: new Date().toISOString() },
      }));
      if (!silent) toast.error("Erro ao testar chave");
    }
  };

  const testAll = async () => {
    toast.info("Testando todas as chaves...");
    await testKey("default_lovable", true);
    for (const k of keys) {
      await testKey(k.id, true);
    }
    toast.success("Teste de todas as chaves concluído");
  };

  useEffect(() => {
    fetchKeys();
  }, []);

  // Auto-testa ao carregar a lista
  useEffect(() => {
    if (!loading && keys.length >= 0) {
      testKey("default_lovable", true);
      keys.filter(k => k.is_active).forEach(k => testKey(k.id, true));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const handleAddKey = async () => {
    if (!newKey || !newLabel) {
      toast.error("Preencha todos os campos");
      return;
    }
    try {
      const { error } = await supabase.from("api_keys_pool").insert({
        label: newLabel,
        key_value: newKey,
        provider: newProvider,
        priority: parseInt(newPriority) || 0,
      });
      if (error) throw error;
      toast.success("Chave adicionada com sucesso");
      setIsAdding(false);
      setNewLabel("");
      setNewKey("");
      fetchKeys();
    } catch (error: any) {
      toast.error("Erro ao adicionar chave: " + error.message);
    }
  };

  const handleToggleActive = async (id: string, current: boolean) => {
    try {
      const { error } = await supabase
        .from("api_keys_pool")
        .update({ is_active: !current, error_count: 0 })
        .eq("id", id);
      if (error) throw error;
      toast.success(current ? "Chave desativada" : "Chave ativada");
      fetchKeys();
    } catch (error: any) {
      toast.error("Erro ao atualizar status: " + error.message);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta chave?")) return;
    try {
      const { error } = await supabase.from("api_keys_pool").delete().eq("id", id);
      if (error) throw error;
      toast.success("Chave removida");
      fetchKeys();
    } catch {
      toast.error("Erro ao excluir chave");
    }
  };

  const StatusBadge = ({ id }: { id: string }) => {
    const s = statuses[id];
    if (!s || s.state === "idle") {
      return <Badge variant="outline" className="text-[10px]">Não testada</Badge>;
    }
    if (s.state === "testing") {
      return (
        <Badge variant="outline" className="text-[10px] gap-1">
          <Loader2 size={10} className="animate-spin" /> Testando…
        </Badge>
      );
    }
    if (s.state === "ok") {
      return (
        <Badge className="text-[10px] gap-1 bg-green-500/15 text-green-400 border-green-500/30 hover:bg-green-500/20">
          <CheckCircle2 size={10} /> Funcional p/ OQs {s.elapsedMs ? `· ${s.elapsedMs}ms` : ""}
        </Badge>
      );
    }
    return (
      <Badge className="text-[10px] gap-1 bg-red-500/15 text-red-400 border-red-500/30 hover:bg-red-500/20">
        <XCircle size={10} /> Falha · {s.message?.slice(0, 40)}
      </Badge>
    );
  };

  // Render de uma "linha" genérica (usada para chave padrão e do pool)
  const KeyRow = ({
    id, label, provider, keyValueMasked, priority, isActive, errorCount, lastError, lastUsedAt, isDefault,
  }: {
    id: string; label: string; provider: string; keyValueMasked: string;
    priority?: number; isActive: boolean; errorCount?: number; lastError?: string | null;
    lastUsedAt?: string | null; isDefault?: boolean;
  }) => (
    <Card className={`p-4 glass transition-all ${isActive ? 'border-border/40' : 'border-red-500/20 opacity-70'}`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className={`p-2 rounded-lg ${isActive ? 'bg-primary/10' : 'bg-red-500/10'}`}>
            <Key size={20} className={isActive ? 'text-primary' : 'text-red-400'} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{label}</span>
              <Badge variant="outline" className="text-[10px]">{provider}</Badge>
              {isDefault && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
              {typeof priority === "number" && (
                <Badge variant="secondary" className="text-[10px]">Prioridade: {priority}</Badge>
              )}
              <StatusBadge id={id} />
            </div>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-xs font-mono text-muted-foreground">{keyValueMasked}</p>
              {lastUsedAt && (
                <span className="text-[10px] text-muted-foreground">
                  Último uso: {new Date(lastUsedAt).toLocaleString()}
                </span>
              )}
              {statuses[id]?.testedAt && (
                <span className="text-[10px] text-muted-foreground">
                  Testada: {new Date(statuses[id].testedAt!).toLocaleTimeString()}
                </span>
              )}
            </div>
            {statuses[id]?.state === "fail" && statuses[id]?.message && (
              <p className="text-[11px] text-red-400 mt-1">⚠ {statuses[id].message}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {!!errorCount && errorCount > 0 && (
            <div className="flex items-center gap-1 mr-2">
              <AlertTriangle size={14} className="text-amber-500" />
              <span className="text-xs text-amber-500 font-bold">{errorCount} erros</span>
            </div>
          )}

          <Button size="sm" variant="outline" onClick={() => testKey(id)}>
            <Activity size={14} className="mr-1" /> Testar
          </Button>

          {!isDefault && (
            <>
              <Button
                size="sm" variant="ghost"
                className={isActive ? "text-red-400 hover:text-red-300 hover:bg-red-500/10" : "text-green-400 hover:text-green-300 hover:bg-green-500/10"}
                onClick={() => handleToggleActive(id, isActive)}
              >
                {isActive ? <><XCircle size={14} className="mr-1" /> Desativar</> : <><CheckCircle2 size={14} className="mr-1" /> Ativar</>}
              </Button>
              <Button size="sm" variant="ghost" className="text-muted-foreground hover:text-white" onClick={() => handleDeleteKey(id)}>
                <Trash2 size={14} />
              </Button>
            </>
          )}
        </div>
      </div>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Layers size={18} className="text-primary" /> Pool de Chaves de IA
          </h3>
          <p className="text-sm text-muted-foreground">
            Status de cada chave para geração de OQs. Use "Testar" para verificar agora.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={testAll}>
            <Activity size={14} className="mr-1" /> Testar todas
          </Button>
          <Button onClick={() => setIsAdding(!isAdding)} size="sm" variant={isAdding ? "outline" : "default"}>
            {isAdding ? "Cancelar" : <><Plus size={16} className="mr-1" /> Adicionar Chave</>}
          </Button>
        </div>
      </div>

      {isAdding && (
        <Card className="p-4 glass border-primary/20 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Nome Identificador</label>
              <Input placeholder="Ex: OpenAI Reserva 1" value={newLabel} onChange={e => setNewLabel(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Provedor</label>
              <Select value={newProvider} onValueChange={setNewProvider}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="lovable_gateway">Lovable Gateway</SelectItem>
                  <SelectItem value="openai">OpenAI (Direto)</SelectItem>
                  <SelectItem value="google">Google Gemini</SelectItem>
                  <SelectItem value="anthropic">Anthropic Claude</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Chave de API</label>
              <Input type="password" placeholder="Cole a chave do provedor escolhido" value={newKey} onChange={e => setNewKey(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold text-muted-foreground">Prioridade (0 = Maior)</label>
              <div className="flex gap-2">
                <Input type="number" value={newPriority} onChange={e => setNewPriority(e.target.value)} />
                <Button onClick={handleAddKey}>Salvar</Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4">
        {/* Chave padrão Lovable - sempre exibida */}
        <KeyRow
          id="default_lovable"
          label="Padrão Lovable (LOVABLE_API_KEY)"
          provider="lovable_gateway"
          keyValueMasked="••••••••••••"
          isActive={true}
          isDefault
        />

        {loading ? (
          <div className="flex justify-center p-8"><RefreshCw className="animate-spin text-primary" /></div>
        ) : keys.length === 0 ? (
          <Card className="p-8 text-center bg-card/20 border-dashed border-border/50">
            <Key size={32} className="mx-auto mb-2 text-muted-foreground/30" />
            <p className="text-muted-foreground">Nenhuma chave reserva configurada.</p>
          </Card>
        ) : (
          keys.map(key => (
            <KeyRow
              key={key.id}
              id={key.id}
              label={key.label}
              provider={key.provider}
              keyValueMasked={`••••••••${key.key_value.slice(-4)}`}
              priority={key.priority}
              isActive={key.is_active}
              errorCount={key.error_count}
              lastError={key.last_error}
              lastUsedAt={key.last_used_at}
            />
          ))
        )}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Gift, Link2, UserPlus, Copy, Share2, Trophy, Sparkles, CheckCircle2, Clock } from "lucide-react";
import { toast } from "sonner";
import { getStripeEnvironment } from "@/lib/stripe";

interface HistItem {
  id: string;
  status: string;
  email: string;
  criado_em: string;
  recompensado_em: string | null;
}

interface BalanceData {
  saldo_brl: number;
  meses_gratis: number;
  saldo_proximo_mes_brl: number;
  valor_ouro_brl: number;
  total_convites: number;
  total_pagantes: number;
  total_creditado_brl: number;
  historico: HistItem[];
}

const fmt = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export default function IndiqueGanhe() {
  const { user } = useAuth();
  const [refCode, setRefCode] = useState<string | null>(null);
  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const link = refCode ? `${window.location.origin}/?ref=${refCode}` : "";

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("referral_code")
        .eq("id", user.id)
        .maybeSingle();
      setRefCode((p as any)?.referral_code ?? null);
    })();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    supabase.functions
      .invoke("get-referral-balance", { body: { environment: getStripeEnvironment() } })
      .then(({ data: d, error }) => {
        if (!error && d) setData(d as BalanceData);
      })
      .finally(() => setLoading(false));
  }, [user]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copiado!");
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const shareWhats = () => {
    const msg = encodeURIComponent(
      `Estou estudando para residência médica no OQ MED e te indico! Use meu link e ganhe 10% off no primeiro mês: ${link}`
    );
    window.open(`https://wa.me/?text=${msg}`, "_blank", "noopener,noreferrer");
  };

  const nativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "OQ MED", text: "Estuda comigo no OQ MED!", url: link });
      } catch {}
    } else {
      copyLink();
    }
  };

  const progressoProxMes = data
    ? Math.min(100, (data.saldo_proximo_mes_brl / data.valor_ouro_brl) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* HERO */}
      <Card className="overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-transparent to-yellow-500/5">
        <CardHeader>
          <div className="flex items-start gap-3">
            <div className="grid place-items-center w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-600 text-black shrink-0">
              <Gift className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-xl">Indique e Ganhe</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Cada amigo que assinar te dá <strong>1 mês grátis</strong> de Ouro.
                Sem limite. Acumulativo.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="text-xs uppercase tracking-wide text-muted-foreground font-bold">
            Seu link de indicação
          </label>
          <div className="flex gap-2">
            <Input value={link} readOnly className="font-mono text-xs sm:text-sm" />
            <Button onClick={copyLink} variant="secondary" size="icon" className="shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={shareWhats} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Share2 className="h-4 w-4 mr-2" /> WhatsApp
            </Button>
            <Button onClick={nativeShare} variant="outline">
              <Share2 className="h-4 w-4 mr-2" /> Compartilhar
            </Button>
          </div>
          {refCode && (
            <p className="text-[11px] text-muted-foreground text-center">
              Código: <span className="font-mono font-bold">{refCode}</span>
            </p>
          )}
        </CardContent>
      </Card>

      {/* GAMIFICAÇÃO — saldo */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-yellow-600" />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Trophy className="h-4 w-4" /> Seus créditos acumulados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : data ? (
            <>
              <div className="text-center py-2">
                <p className="text-5xl font-black bg-gradient-to-br from-amber-500 to-yellow-700 bg-clip-text text-transparent">
                  {data.meses_gratis}
                </p>
                <p className="text-sm font-bold uppercase tracking-wide text-muted-foreground mt-1">
                  {data.meses_gratis === 1 ? "mês grátis" : "meses grátis"} garantido{data.meses_gratis === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Saldo: <strong className="text-foreground">{fmt(data.saldo_brl)}</strong>
                </p>
              </div>

              {data.saldo_proximo_mes_brl > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Progresso até o próximo mês grátis</span>
                    <span className="font-bold">
                      {fmt(data.saldo_proximo_mes_brl)} / {fmt(data.valor_ouro_brl)}
                    </span>
                  </div>
                  <Progress value={progressoProxMes} className="h-2" />
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-2xl font-black">{data.total_convites}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Convites</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-emerald-600">{data.total_pagantes}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Pagantes</p>
                </div>
                <div>
                  <p className="text-2xl font-black text-amber-600">{fmt(data.total_creditado_brl)}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Creditado</p>
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Sem dados disponíveis.</p>
          )}
        </CardContent>
      </Card>

      {/* HISTÓRICO */}
      {data?.historico && data.historico.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Suas indicações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.historico.map((h) => (
              <div key={h.id} className="flex items-center justify-between py-1.5 text-sm">
                <span className="font-mono text-xs sm:text-sm">{h.email}</span>
                {h.status === "recompensado" ? (
                  <Badge className="bg-emerald-600 text-white">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Recompensado
                  </Badge>
                ) : h.status === "convertido" ? (
                  <Badge variant="secondary">Processando</Badge>
                ) : (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" /> Pendente
                  </Badge>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* COMO FUNCIONA */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4" /> Como funciona
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            <li className="flex gap-3">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-muted shrink-0">
                <Link2 className="h-3.5 w-3.5" />
              </span>
              <span><strong>Compartilhe seu link</strong> com colegas que estudam para residência.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-muted shrink-0">
                <UserPlus className="h-3.5 w-3.5" />
              </span>
              <span>Ele se cadastra pelo link e ganha <strong>10% off</strong> no primeiro pagamento.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid place-items-center w-7 h-7 rounded-full bg-muted shrink-0">
                <Gift className="h-3.5 w-3.5" />
              </span>
              <span>Quando ele assinar, você ganha <strong>{fmt(data?.valor_ouro_brl ?? 28.5)}</strong> em crédito — abatido automaticamente na sua próxima fatura.</span>
            </li>
          </ol>
          <p className="text-[11px] text-muted-foreground mt-4 text-center">
            Sem limite de indicações. Créditos acumulam e são aplicados automaticamente pelo Stripe.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

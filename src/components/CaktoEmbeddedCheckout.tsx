import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

interface Props { productId: string; onStarted?: () => void; }
export function CaktoEmbeddedCheckout({ productId, onStarted }: Props) {
  const [card, setCard] = useState({ holderName: "", number: "", expirationMonth: "", expirationYear: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const update = (key: keyof typeof card) => (event: React.ChangeEvent<HTMLInputElement>) => setCard((value) => ({ ...value, [key]: event.target.value }));
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    const { error: invokeError } = await supabase.functions.invoke("process-cakto-subscription", { body: { productId, card } });
    setLoading(false);
    if (invokeError) { setError("Não foi possível processar o pagamento. Confira os dados e tente novamente."); return; }
    setDone(true); onStarted?.();
  };
  if (done) return <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-600" /><h3 className="text-xl font-semibold">Pagamento enviado com sucesso</h3><p className="text-sm text-muted-foreground">Seu plano será atualizado assim que a Cakto confirmar a assinatura.</p></div>;
  return <form onSubmit={submit} className="space-y-4 px-6 pb-6">
    <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">Seus dados são enviados diretamente para processamento seguro. O cartão não é armazenado.</div>
    {error && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    <div className="space-y-2"><Label htmlFor="holderName">Nome no cartão</Label><Input id="holderName" autoComplete="cc-name" value={card.holderName} onChange={update("holderName")} required /></div>
    <div className="space-y-2"><Label htmlFor="cardNumber">Número do cartão</Label><Input id="cardNumber" inputMode="numeric" autoComplete="cc-number" value={card.number} onChange={update("number")} required /></div>
    <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label htmlFor="expirationMonth">Mês</Label><Input id="expirationMonth" inputMode="numeric" placeholder="MM" maxLength={2} autoComplete="cc-exp-month" value={card.expirationMonth} onChange={update("expirationMonth")} required /></div><div className="space-y-2"><Label htmlFor="expirationYear">Ano</Label><Input id="expirationYear" inputMode="numeric" placeholder="AAAA" maxLength={4} autoComplete="cc-exp-year" value={card.expirationYear} onChange={update("expirationYear")} required /></div><div className="space-y-2"><Label htmlFor="cvv">CVV</Label><Input id="cvv" inputMode="numeric" maxLength={4} autoComplete="cc-csc" value={card.cvv} onChange={update("cvv")} required /></div></div>
    <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {loading ? "Processando…" : "Assinar com cartão"}</Button>
  </form>;
}

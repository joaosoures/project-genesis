import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

type CardForm = { holderName: string; cardNumber: string; expMonth: string; expYear: string; cvv: string };
interface Props { productId: string; onStarted?: () => void; }

let sdkPromise: Promise<CaktoSdk> | null = null;
const loadSdk = () => {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>('script[src="https://cakto-sdk.pages.dev/cakto-sdk.min.js"]');
    const ready = () => {
      if (!window.Cakto) { reject(new Error("SDK Cakto indisponível")); return; }
      resolve(new window.Cakto.CaktoSDK({ client_id: "msJCgJZQxlLmSGCn1ktRutNYVFrImfwGDG4grMFh" }));
    };
    if (existing) { existing.addEventListener("load", ready, { once: true }); if (window.Cakto) ready(); return; }
    const script = document.createElement("script");
    script.src = "https://cakto-sdk.pages.dev/cakto-sdk.min.js";
    script.async = true;
    script.onload = ready;
    script.onerror = () => reject(new Error("Não foi possível carregar o SDK Cakto"));
    document.head.appendChild(script);
  });
  return sdkPromise;
};

export function CaktoEmbeddedCheckout({ productId, onStarted }: Props) {
  const [card, setCard] = useState<CardForm>({ holderName: "", cardNumber: "", expMonth: "", expYear: "", cvv: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const update = (key: keyof CardForm) => (event: React.ChangeEvent<HTMLInputElement>) => setCard((value) => ({ ...value, [key]: event.target.value }));

  useEffect(() => { void loadSdk().then((sdk) => sdk.initAntifraud()).catch(() => undefined); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      const sdk = await loadSdk();
      await sdk.completeAntifraudProfile();
      const { cardToken } = await sdk.createToken(card);
      const antifraudReference = sdk.getAntifraudReference();
      const { error: invokeError } = await supabase.functions.invoke("process-cakto-subscription", { body: { productId, cardToken, antifraudReference } });
      if (invokeError) throw invokeError;
      setDone(true); onStarted?.();
    } catch {
      setError("Não foi possível processar o pagamento. Confira os dados e tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (done) return <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-600" /><h3 className="text-xl font-semibold">Pagamento enviado com sucesso</h3><p className="text-sm text-muted-foreground">Seu plano será atualizado assim que a Cakto confirmar a assinatura.</p></div>;
  return <form onSubmit={submit} className="space-y-4 px-6 pb-6">
    <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">O cartão é tokenizado no seu navegador. Apenas o token de uso único é enviado para processamento.</div>
    {error && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    <div className="space-y-2"><Label htmlFor="holderName">Nome no cartão</Label><Input id="holderName" autoComplete="cc-name" value={card.holderName} onChange={update("holderName")} required /></div>
    <div className="space-y-2"><Label htmlFor="cardNumber">Número do cartão</Label><Input id="cardNumber" inputMode="numeric" autoComplete="cc-number" value={card.cardNumber} onChange={update("cardNumber")} required /></div>
    <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label htmlFor="expMonth">Mês</Label><Input id="expMonth" inputMode="numeric" placeholder="MM" maxLength={2} autoComplete="cc-exp-month" value={card.expMonth} onChange={update("expMonth")} required /></div><div className="space-y-2"><Label htmlFor="expYear">Ano</Label><Input id="expYear" inputMode="numeric" placeholder="AA" maxLength={4} autoComplete="cc-exp-year" value={card.expYear} onChange={update("expYear")} required /></div><div className="space-y-2"><Label htmlFor="cvv">CVV</Label><Input id="cvv" inputMode="numeric" maxLength={4} autoComplete="cc-csc" value={card.cvv} onChange={update("cvv")} required /></div></div>
    <Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {loading ? "Processando…" : "Assinar com cartão"}</Button>
  </form>;
}

type CaktoSdk = { createToken(card: CardForm): Promise<{ cardToken: string }>; initAntifraud(): Promise<void>; completeAntifraudProfile(): Promise<void>; getAntifraudReference(): string; };
declare global { interface Window { Cakto?: { CaktoSDK: new (options: { client_id: string }) => CaktoSdk } } }

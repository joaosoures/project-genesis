import { FormEvent, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, CreditCard, Fingerprint, Loader2, ShieldCheck, Sparkles } from "lucide-react";
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

const onlyDigits = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);
const formatCpf = (value: string) => {
  const digits = onlyDigits(value, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};
const formatCard = (value: string) => onlyDigits(value, 16).replace(/(.{4})/g, "$1 ").trim();

export function CaktoEmbeddedCheckout({ productId, onStarted }: Props) {
  const [card, setCard] = useState<CardForm>({ holderName: "", cardNumber: "", expMonth: "", expYear: "", cvv: "" });
  const [cpf, setCpf] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const update = (key: keyof CardForm, format?: (value: string) => string) => (event: React.ChangeEvent<HTMLInputElement>) => setCard((value) => ({ ...value, [key]: format ? format(event.target.value) : event.target.value }));

  useEffect(() => { void loadSdk().then((sdk) => sdk.initAntifraud()).catch(() => undefined); }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault(); setLoading(true); setError(null);
    try {
      if (onlyDigits(cpf, 11).length !== 11) throw new Error("CPF inválido");
      const sdk = await loadSdk();
      await sdk.completeAntifraudProfile();
      const { cardToken } = await sdk.createToken({ ...card, cardNumber: onlyDigits(card.cardNumber, 16) });
      const antifraudReference = sdk.getAntifraudReference();
      if (!antifraudReference) throw new Error("Não foi possível validar a sessão antifraude. Recarregue a página e tente novamente.");
      const { data, error: invokeError } = await supabase.functions.invoke("process-cakto-subscription", { body: { productId, cardToken, antifraudReference, cpf: onlyDigits(cpf, 11) } });
      if (invokeError) {
        const details = typeof invokeError.context?.json === "function" ? await invokeError.context.json().catch(() => null) : null;
        const backendMessage = typeof details?.error === "string" ? details.error : null;
        throw new Error(backendMessage ?? invokeError.message);
      }
      if (data?.error) throw new Error(String(data.error));
      setDone(true); onStarted?.();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Não foi possível processar o pagamento";
      setError(message === "Failed to fetch" ? "Não foi possível conectar ao processador de pagamentos. Tente novamente." : message);
    } finally { setLoading(false); }
  };

  if (done) return <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 px-6 text-center"><CheckCircle2 className="h-12 w-12 text-emerald-600" /><h3 className="text-xl font-semibold">Pagamento enviado com sucesso</h3><p className="text-sm text-muted-foreground">Seu plano será atualizado assim que a Cakto confirmar a assinatura.</p></div>;
  return <form onSubmit={submit} className="space-y-5 px-6 pb-6">
    <div className="-mx-6 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b">
      <div className="flex items-center gap-3"><div className="rounded-xl bg-primary p-2 text-primary-foreground"><Sparkles className="h-5 w-5" /></div><div><p className="font-semibold">Quase lá!</p><p className="text-xs text-muted-foreground">Preencha seus dados com segurança para ativar seu plano.</p></div></div>
    </div>
    <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /><span>Seus dados são protegidos. O cartão é tokenizado no navegador e nunca é armazenado pelo OQ MED.</span></div>
    {error && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"><AlertCircle className="h-4 w-4 shrink-0" />{error}</div>}
    <div className="space-y-2"><Label htmlFor="cpf">CPF</Label><Input id="cpf" inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={cpf} onChange={(event) => setCpf(formatCpf(event.target.value))} required /><p className="text-[11px] text-muted-foreground">Informe somente o CPF do titular da compra.</p></div>
    <div className="space-y-2"><Label htmlFor="holderName">Nome no cartão</Label><Input id="holderName" placeholder="Como aparece no cartão" autoComplete="cc-name" value={card.holderName} onChange={update("holderName")} required /></div>
    <div className="space-y-2"><Label htmlFor="cardNumber">Número do cartão</Label><div className="relative"><CreditCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" id="cardNumber" inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" value={card.cardNumber} onChange={update("cardNumber", (value) => formatCard(value))} required /></div></div>
    <div className="grid grid-cols-3 gap-3"><div className="space-y-2"><Label htmlFor="expMonth">Mês</Label><Input id="expMonth" inputMode="numeric" placeholder="MM" maxLength={2} autoComplete="cc-exp-month" value={card.expMonth} onChange={update("expMonth", (value) => onlyDigits(value, 2))} required /></div><div className="space-y-2"><Label htmlFor="expYear">Ano</Label><Input id="expYear" inputMode="numeric" placeholder="AAAA" maxLength={4} autoComplete="cc-exp-year" value={card.expYear} onChange={update("expYear", (value) => onlyDigits(value, 4))} required /></div><div className="space-y-2"><Label htmlFor="cvv">CVV</Label><Input id="cvv" inputMode="numeric" placeholder="000" maxLength={4} autoComplete="cc-csc" value={card.cvv} onChange={update("cvv", (value) => onlyDigits(value, 4))} required /></div></div>
    <Button type="submit" className="h-11 w-full font-semibold shadow-sm" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {loading ? "Processando…" : "Assinar com cartão"}</Button>
    <p className="flex items-center justify-center gap-1 text-center text-[11px] text-muted-foreground"><Fingerprint className="h-3.5 w-3.5" /> Pagamento protegido e antifraude ativo</p>
  </form>;
}

type CaktoSdk = { createToken(card: CardForm): Promise<{ cardToken: string }>; initAntifraud(): Promise<void>; completeAntifraudProfile(): Promise<void>; getAntifraudReference(): string; };
declare global { interface Window { Cakto?: { CaktoSDK: new (options: { client_id: string }) => CaktoSdk } } }

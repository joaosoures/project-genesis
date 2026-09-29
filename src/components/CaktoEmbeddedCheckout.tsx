import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  productId: string;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
  onStarted?: () => void;
}

export function CaktoEmbeddedCheckout({ productId, customerEmail, userId, returnUrl, onStarted }: Props) {
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const { data, error: invokeError } = await supabase.functions.invoke("create-cakto-checkout", {
        body: { productId, customerEmail, userId, returnUrl: returnUrl ?? `${window.location.origin}/meu-plano?checkout=success` },
      });
      if (!active) return;
      if (invokeError || !data?.checkoutUrl) {
        setError(invokeError?.message ?? data?.error ?? "Não foi possível abrir o checkout da Cakto.");
        return;
      }
      setCheckoutUrl(data.checkoutUrl);
      onStarted?.();
    };
    load();
    return () => { active = false; };
  }, [customerEmail, onStarted, productId, returnUrl, userId]);

  if (error) return (
    <div className="flex flex-col items-center justify-center gap-4 px-4 py-12 text-center">
      <AlertCircle className="h-10 w-10 text-destructive" />
      <h3 className="text-lg font-semibold">Não foi possível carregar o pagamento</h3>
      <p className="text-sm text-muted-foreground">{error}</p>
      <Button variant="outline" onClick={() => window.location.reload()}>Tentar novamente</Button>
    </div>
  );

  if (!checkoutUrl) return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-3">
      <Loader2 className="h-9 w-9 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Carregando pagamento seguro...</p>
    </div>
  );

  return (
    <div className="w-full space-y-3">
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Pagamento processado com segurança pela Cakto
      </div>
      <iframe title="Checkout Cakto" src={checkoutUrl} className="h-[620px] w-full rounded-lg border-0" allow="payment" />
    </div>
  );
}

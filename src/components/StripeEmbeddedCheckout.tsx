import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { getStripe, getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  priceId: string;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
  onUpgraded?: () => void;
}

export function StripeEmbeddedCheckout({ priceId, customerEmail, userId, returnUrl, onUpgraded }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [upgraded, setUpgraded] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchClientSecret = async (): Promise<string> => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          priceId,
          customerEmail,
          userId,
          returnUrl: returnUrl ?? `${window.location.origin}/meu-plano?checkout=success`,
          environment: getStripeEnvironment(),
        },
      });

      if (error) throw new Error(error.message || "Falha ao criar sessão de checkout");
      
      if (data?.upgraded) {
        setUpgraded(true);
        onUpgraded?.();
        setLoading(false);
        return ""; // O provider não será usado se upgraded for true
      }

      if (!data?.clientSecret) throw new Error("Resposta inválida do servidor");
      setLoading(false);
      return data.clientSecret;
    } catch (err: any) {
      console.error("Checkout error:", err);
      setError(err.message || "Ocorreu um erro ao carregar o checkout.");
      setLoading(false);
      throw err;
    }
  };

  if (upgraded) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
        <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold">Plano atualizado!</h3>
        <p className="text-muted-foreground max-w-xs">
          Sua assinatura foi atualizada com sucesso. Você já pode aproveitar as novas funcionalidades.
        </p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Continuar
        </Button>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 px-4 text-center space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive" />
        <h3 className="text-lg font-semibold">Erro no Checkout</h3>
        <p className="text-sm text-muted-foreground">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div id="checkout" className="w-full min-h-[500px] flex flex-col bg-white rounded-lg overflow-hidden">
      {loading && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm">
          <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
          <p className="text-sm font-medium text-muted-foreground animate-pulse">
            Carregando ambiente seguro de pagamento...
          </p>
        </div>
      )}
      <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
        <div className="flex-1 min-h-[550px] transition-opacity duration-300">
          <EmbeddedCheckout className="w-full h-full" />
        </div>
      </EmbeddedCheckoutProvider>
    </div>
  );
}

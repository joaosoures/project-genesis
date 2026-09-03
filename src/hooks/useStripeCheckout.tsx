import { useState, useCallback } from "react";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface CheckoutOptions {
  priceId: string;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
}

export function useStripeCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);

  const openCheckout = useCallback((opts: CheckoutOptions) => {
    setOptions(opts);
    setIsOpen(true);
  }, []);

  const closeCheckout = useCallback(() => {
    setIsOpen(false);
    setOptions(null);
  }, []);

  const handleUpgraded = useCallback(() => {
    toast.success("Upgrade aplicado!", {
      description: "Cobrança proporcional realizada. Seu plano será atualizado em instantes.",
    });
    closeCheckout();
  }, [closeCheckout]);

  const checkoutDialog = (
    <Dialog open={isOpen} onOpenChange={(o) => !o && closeCheckout()}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Finalizar assinatura</DialogTitle>
        </DialogHeader>
        <div className="px-2 sm:px-4 pb-4">
          {options && (
            <StripeEmbeddedCheckout
              priceId={options.priceId}
              customerEmail={options.customerEmail}
              userId={options.userId}
              returnUrl={options.returnUrl}
              onUpgraded={handleUpgraded}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  return { openCheckout, closeCheckout, isOpen, checkoutDialog };
}

import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { CaktoEmbeddedCheckout } from "@/components/CaktoEmbeddedCheckout";

interface CheckoutOptions {
  productId: string;
  customerEmail?: string;
  userId?: string;
  returnUrl?: string;
}

export function useCaktoCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const openCheckout = useCallback((value: CheckoutOptions) => { setOptions(value); setIsOpen(true); }, []);
  const closeCheckout = useCallback(() => { setIsOpen(false); setOptions(null); }, []);
  const checkoutDialog = (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeCheckout()}>
      <DialogContent className="w-[95vw] max-h-[95vh] overflow-y-auto p-0 sm:max-w-2xl">
        <DialogHeader className="px-6 pt-6"><DialogTitle>Finalizar assinatura pela Cakto</DialogTitle></DialogHeader>
        <div className="px-2 pb-4 sm:px-4">
          {options && <CaktoEmbeddedCheckout {...options} onStarted={() => toast.info("Checkout Cakto carregado")} />}
        </div>
      </DialogContent>
    </Dialog>
  );
  return { openCheckout, closeCheckout, isOpen, checkoutDialog };
}

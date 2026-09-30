import { useCallback, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CaktoEmbeddedCheckout } from "@/components/CaktoEmbeddedCheckout";

interface CheckoutOptions { productId: string; }
export function useCaktoCheckout() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<CheckoutOptions | null>(null);
  const openCheckout = useCallback((value: CheckoutOptions) => { setOptions(value); setIsOpen(true); }, []);
  const closeCheckout = useCallback(() => { setIsOpen(false); setOptions(null); }, []);
  const checkoutDialog = <Dialog open={isOpen} onOpenChange={(open) => !open && closeCheckout()}><DialogContent className="w-[95vw] max-h-[95vh] overflow-y-auto overflow-x-hidden rounded-2xl border-primary/10 p-0 shadow-2xl sm:max-w-lg"><DialogHeader className="sr-only"><DialogTitle>Finalizar assinatura pela Cakto</DialogTitle></DialogHeader>{options && <CaktoEmbeddedCheckout productId={options.productId} onStarted={() => setIsOpen(false)} />}</DialogContent></Dialog>;
  return { openCheckout, closeCheckout, isOpen, checkoutDialog };
}

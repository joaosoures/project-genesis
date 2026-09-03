import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Download, Share, Plus } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa-install-dismissed-at";
const SHOW_KEY = "pwa-install-show";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}
function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
}

/** Dispara o prompt de instalação. Use após o onboarding ou em botões manuais. */
export function triggerInstallPrompt(force = false) {
  try { localStorage.setItem(SHOW_KEY, "1"); } catch {}
  window.dispatchEvent(new CustomEvent("pwa:show-install", { detail: { force } }));
}

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    setIos(isIOS());

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      if (localStorage.getItem(SHOW_KEY) === "1") setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    const showHandler = (e: any) => {
      const force = e.detail?.force;
      const dismissed = localStorage.getItem(DISMISS_KEY);
      if (!force && dismissed && Date.now() - Number(dismissed) < 7 * 24 * 60 * 60 * 1000) return;
      setOpen(true);
    };
    window.addEventListener("pwa:show-install", showHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("pwa:show-install", showHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    setOpen(false);
    localStorage.removeItem(SHOW_KEY);
  };

  const handleClose = () => {
    setOpen(false);
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    localStorage.removeItem(SHOW_KEY);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? setOpen(true) : handleClose())}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <img src="/icons/icon-192.png" alt="OQ MED" className="h-12 w-12 rounded-xl" />
          </div>
          <DialogTitle className="text-center">Instalar o OQ.Med</DialogTitle>
          <DialogDescription className="text-center">
            Acesso rápido direto da tela inicial do seu celular ou tablet, com experiência de app nativo.
          </DialogDescription>
        </DialogHeader>

        {ios ? (
          <div className="space-y-3 py-2">
            <div className="flex items-start gap-3 bg-muted/50 p-2.5 rounded-xl border border-border/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <span className="font-bold text-lg">...</span>
              </div>
              <p className="text-sm leading-snug">
                1. Clique nos <strong>três pontinhos (...)</strong> no canto inferior direito.
              </p>
            </div>
            
            <div className="flex items-start gap-3 bg-muted/50 p-2.5 rounded-xl border border-border/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <Share className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-sm leading-snug">
                2. Selecione <strong>Compartilhar</strong> (o primeiro da lista).
              </p>
            </div>

            <div className="flex items-start gap-3 bg-muted/50 p-2.5 rounded-xl border border-border/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <span className="text-xs font-medium">VER</span>
              </div>
              <p className="text-sm leading-snug">
                3. Toque em <strong>"ver mais"</strong> no canto inferior esquerdo.
              </p>
            </div>

            <div className="flex items-start gap-3 bg-muted/50 p-2.5 rounded-xl border border-border/50">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm">
                <Plus className="h-4 w-4" />
              </div>
              <p className="text-sm leading-snug">
                4. Toque em <strong>"+ adicionar à tela de início"</strong>.
              </p>
            </div>
          </div>
        ) : deferred ? (
          <p className="text-center text-sm text-muted-foreground">
            Toque em "Instalar" e confirme para adicionar o app à sua tela inicial.
          </p>
        ) : (
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>No Chrome (Android): toque no menu ⋮ e escolha <strong>"Instalar app"</strong> ou <strong>"Adicionar à tela inicial"</strong>.</p>
          </div>
        )}

        <DialogFooter className="flex-row gap-2 sm:flex-row">
          <Button variant="outline" className="flex-1" onClick={handleClose}>Agora não</Button>
          {ios ? (
            <Button className="flex-1" onClick={handleClose}>Entendi</Button>
          ) : deferred ? (
            <Button className="flex-1" onClick={handleInstall}>
              <Download className="mr-2 h-4 w-4" /> Instalar
            </Button>
          ) : (
            <Button className="flex-1" onClick={handleClose}>Entendi</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

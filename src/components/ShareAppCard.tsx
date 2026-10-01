import { useState } from "react";
import { Check, Copy, ExternalLink, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const APP_URL = "http://oqfalta.vercel.app";
const SHARE_MESSAGE = "Ajude outros estudantes a encontrar OQ falta para a preparação na residência médica";

export default function ShareAppCard() {
  const [copied, setCopied] = useState(false);

  const copyLink = async () => {
    await navigator.clipboard.writeText(APP_URL);
    setCopied(true);
    toast.success("Link copiado!");
    window.setTimeout(() => setCopied(false), 2000);
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(`${SHARE_MESSAGE}: ${APP_URL}`);
    window.open(`https://wa.me/?text=${text}`, "_blank", "noopener,noreferrer");
  };

  const shareApp = async () => {
    if (!navigator.share) {
      await copyLink();
      return;
    }

    try {
      await navigator.share({ title: "OQ falta", text: SHARE_MESSAGE, url: APP_URL });
    } catch {
      // O usuário pode fechar o diálogo de compartilhamento sem concluir.
    }
  };

  return (
    <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/5 via-transparent to-emerald-500/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Share2 className="h-4 w-4 text-primary" />
          Compartilhe o OQ falta
        </CardTitle>
        <p className="text-sm text-muted-foreground">{SHARE_MESSAGE}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 rounded-md border bg-background/70 p-2">
          <a href={APP_URL} target="_blank" rel="noreferrer" className="min-w-0 flex-1 truncate text-sm font-medium text-primary hover:underline">
            {APP_URL}
          </a>
          <Button type="button" variant="ghost" size="icon" onClick={copyLink} aria-label="Copiar link do aplicativo">
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </Button>
          <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button type="button" onClick={shareWhatsApp} className="bg-emerald-600 text-white hover:bg-emerald-700">
            <MessageCircle className="mr-2 h-4 w-4" /> WhatsApp
          </Button>
          <Button type="button" variant="outline" onClick={shareApp}>
            <Share2 className="mr-2 h-4 w-4" /> Compartilhar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

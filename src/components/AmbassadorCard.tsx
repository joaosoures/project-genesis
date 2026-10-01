import { MessageCircle, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const WHATSAPP_URL = "https://wa.me/5532999457569";

export default function AmbassadorCard() {
  return (
    <Card className="overflow-hidden border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-transparent to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-4 w-4 text-emerald-600" />
          Torne-se um embaixador
        </CardTitle>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Torne-se o representante oficial do nosso aplicativo na sua faculdade. Traga a sua turma e garanta benefícios exclusivos, como acesso Ouro vitalício para você e cupons de desconto agressivos para os seus colegas.
        </p>
      </CardHeader>
      <CardContent>
        <Button asChild className="w-full bg-emerald-600 text-white hover:bg-emerald-700 sm:w-auto">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <MessageCircle className="mr-2 h-4 w-4" />
            Falar com um dos diretores disponivel
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}

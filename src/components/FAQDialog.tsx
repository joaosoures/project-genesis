import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MessageCircle, Mail, HelpCircle } from "lucide-react";
import { feedback } from "@/lib/sensory";

interface FAQDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const faqData = [
  {
    question: "Como o algoritmo funciona?",
    answer: "O algoritmo do OQ MED utiliza inteligência artificial para analisar seu desempenho em tempo real. Ele identifica quais matérias você domina e quais precisam de mais atenção, ajustando a frequência de revisão (Repetição Espaçada) para garantir que o conhecimento seja consolidado na sua memória de longo prazo antes da prova."
  },
  {
    question: "Como é distribuído o conteúdo até a prova?",
    answer: "A distribuição é feita de forma linear e estratégica entre o dia do seu primeiro acesso e a data da sua prova. O sistema calcula a carga horária necessária para cobrir todos os tópicos importantes, priorizando os temas com maior peso e recorrência estatística nos exames."
  },
  {
    question: "Por que os OQs são eficientes?",
    answer: "OQs (Objetivos de Questões) focam no aprendizado ativo. Em vez de apenas ler ou assistir aulas passivamente, você é desafiado a aplicar o conhecimento. Isso gera 'dificuldade desejável', um conceito da ciência da aprendizagem que prova que quanto mais esforço o cérebro faz para recuperar uma informação, mais forte essa conexão se torna."
  },
  {
    question: "Como mudar a minha Trilha?",
    answer: "Você pode reconfigurar sua trilha a qualquer momento acessando a aba 'Trilha Estratégica' e clicando no botão de configurações. Lá você pode ajustar sua data de prova, carga horária semanal e foco de especialidade."
  },
  {
    question: "Como cadastrar novos OQs?",
    answer: "Na seção 'Gerar OQs', você pode fazer upload de seus materiais (PDFs ou resumos). Nossa IA processará o conteúdo e criará questões personalizadas e flashcards baseados exatamente no que você enviou, integrando-os automaticamente ao seu plano de estudos."
  },
  {
    question: "Como mudar de plano?",
    answer: "Para alterar seu plano (Prata para Ouro, por exemplo), vá até a aba 'Meu Plano'. Lá você encontrará as opções de upgrade disponíveis. Se precisar de uma alteração personalizada ou cancelamento, nossa equipe de suporte está pronta para ajudar via WhatsApp."
  },
  {
    question: "O que acontece se eu atrasar matérias?",
    answer: "O sistema detecta automaticamente o atraso e oferece a opção de 'Redistribuir'. Você pode escolher mover o conteúdo acumulado para as semanas seguintes (com um limite para não sobrecarregar) ou priorizar o estudo imediato do que ficou para trás."
  },
  {
    question: "O app está lento no PC ou Preview, o que fazer?",
    answer: "OQ pode ser feito para melhorar a velocidade do app em  PC/Preview sem alterar a boa funcionalidade ja presente nos mobile e tablet\né possivel ter uma etapa de reconhecimento em qual plataforma / dispositivo está sendo rodado o app e então atribuir automaticamente o desligamento de alguns recursos n"
  }
];

export function FAQDialog({ open, onOpenChange }: FAQDialogProps) {
  const handleWhatsApp = () => {
    feedback("tap");
    window.open("https://wa.me/551532999457569", "_blank");
  };

  const handleEmail = () => {
    feedback("tap");
    window.open("mailto:joaoresende2603@gmail.com", "_blank");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 border-none bg-[hsl(var(--background))] shadow-2xl">
        <div className="p-6 md:p-8">
          <DialogHeader className="mb-6">
            <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center mb-4">
              <HelpCircle className="w-6 h-6 text-orange-500" />
            </div>
            <DialogTitle className="font-display text-3xl font-black tracking-tight text-[hsl(var(--foreground))]">
              Como podemos ajudar?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-base">
              Encontre respostas para as dúvidas mais comuns sobre o OQ MED e sua jornada de estudos.
            </DialogDescription>
          </DialogHeader>

          <Accordion type="single" collapsible className="w-full space-y-3">
            {faqData.map((item, i) => (
              <AccordionItem 
                key={i} 
                value={`item-${i}`}
                className="border-none rounded-2xl px-5 bg-[hsl(var(--background))] shadow-neu-out-sm data-[state=open]:shadow-neu-in transition-all overflow-hidden"
              >
                <AccordionTrigger className="hover:no-underline py-4 text-left font-bold text-[hsl(var(--foreground))]">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5 pt-1">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="mt-10 p-6 rounded-3xl bg-orange-500/5 border border-orange-500/10 space-y-4">
            <div className="space-y-1">
              <h4 className="font-bold text-[hsl(var(--foreground))]">Restou alguma dúvida?</h4>
              <p className="text-sm text-muted-foreground">Nossa equipe de suporte está pronta para te atender agora mesmo.</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={handleWhatsApp}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[#25D366] text-white font-black text-sm uppercase tracking-wider hover:opacity-90 transition-all active:scale-95"
              >
                <MessageCircle className="w-5 h-5" />
                WhatsApp
              </button>
              <button
                onClick={handleEmail}
                className="flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-[hsl(var(--foreground))] text-[hsl(var(--background))] font-black text-sm uppercase tracking-wider hover:opacity-90 transition-all active:scale-95"
              >
                <Mail className="w-5 h-5" />
                E-mail
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

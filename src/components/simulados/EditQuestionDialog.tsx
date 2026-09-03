
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Save, X, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  comando: string;
  opcao_a: string;
  opcao_b: string;
  opcao_c: string;
  opcao_d: string;
  opcao_e: string;
  gabarito: string;
  explicacao_1: string;
  explicacao_2: string;
  explicacao_3: string;
  image_url?: string;
}

export default function EditQuestionDialog({ 
  question, 
  onClose, 
  onSave 
}: { 
  question: Question; 
  onClose: () => void;
  onSave: (updated: Question) => void;
}) {
  const [formData, setFormData] = useState<Question>({ ...question });
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSave = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("simulado_questoes")
        .update({
          comando: formData.comando,
          opcao_a: formData.opcao_a,
          opcao_b: formData.opcao_b,
          opcao_c: formData.opcao_c,
          opcao_d: formData.opcao_d,
          opcao_e: formData.opcao_e,
          gabarito: formData.gabarito,
          explicacao_1: formData.explicacao_1,
          explicacao_2: formData.explicacao_2,
          explicacao_3: formData.explicacao_3,
          image_url: formData.image_url
        } as any)
        .eq("id", question.id);

      if (error) throw error;
      toast.success("Questão atualizada com sucesso!");
      onSave(formData);
      onClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const compressImage = async (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (blob) resolve(blob);
              else reject(new Error("Falha na compressão"));
            },
            'image/jpeg',
            0.7
          );
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleUploadImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      // 1. Check/Create bucket (assuming 'simulados' bucket exists or we handle error)
      const compressedBlob = await compressImage(file);
      const fileExt = 'jpg';
      const fileName = `${question.id}-${Math.random()}.${fileExt}`;
      const filePath = `questions/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('simulados')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('simulados')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, image_url: publicUrl }));
      toast.success("Imagem enviada!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro no upload: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black tracking-tight">Editar Questão</h3>
          <Button variant="ghost" size="icon" onClick={onClose} disabled={loading}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Comando da Questão</Label>
            <Textarea 
              value={formData.comando}
              onChange={(e) => setFormData(prev => ({ ...prev, comando: e.target.value }))}
              className="min-h-[100px]"
            />
          </div>

          <div className="space-y-2">
            <Label>Imagem da Questão</Label>
            <div className="flex items-center gap-4">
              {formData.image_url ? (
                <div className="relative group w-32 h-32 rounded-lg overflow-hidden border bg-slate-50">
                  <img src={formData.image_url} alt="Questão" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => setFormData(prev => ({ ...prev, image_url: undefined }))}
                      className="bg-rose-500 text-white p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="Remover imagem"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-white text-slate-900 p-1.5 rounded-full shadow-lg hover:scale-110 transition-transform"
                      title="Trocar imagem"
                    >
                      <Upload className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-32 h-32 rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 transition-colors group"
                >
                  <Upload className="h-6 w-6 text-muted-foreground group-hover:text-accent transition-colors" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground group-hover:text-accent transition-colors">Upload</span>
                </div>
              )}
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleUploadImage} 
                className="hidden" 
                accept="image/*" 
              />
              {uploading && <Loader2 className="animate-spin h-5 w-5 text-accent" />}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {['a', 'b', 'c', 'd', 'e'].map((l) => (
              <div key={l} className="space-y-2">
                <Label className="uppercase">Opção {l}</Label>
                <Input 
                  value={(formData as any)[`opcao_${l}`] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [`opcao_${l}`]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-2">
              <Label>Gabarito (A-E)</Label>
              <Input 
                value={formData.gabarito}
                onChange={(e) => setFormData(prev => ({ ...prev, gabarito: e.target.value.toUpperCase() }))}
                maxLength={1}
              />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <Label className="text-[10px] font-black uppercase tracking-widest opacity-50">Explicações / Dicas</Label>
            {[1, 2, 3].map((num) => (
              <div key={num} className="space-y-2">
                <Label>Explicação {num}</Label>
                <Textarea 
                  value={(formData as any)[`explicacao_${num}`] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [`explicacao_${num}`]: e.target.value }))}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-4">
          <Button 
            variant="outline" 
            className="flex-1 rounded-xl font-bold"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </Button>
          <Button 
            className="flex-1 rounded-xl font-bold bg-slate-900 text-white hover:bg-slate-800"
            onClick={handleSave}
            disabled={loading || uploading}
          >
            {loading ? <Loader2 className="animate-spin h-4 w-4" /> : <><Save className="mr-2 h-4 w-4" /> Salvar Alterações</>}
          </Button>
        </div>
      </Card>
    </div>
  );
}

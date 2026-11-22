import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ExternalLink, FileUp, Loader2, Pencil, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ResumoHtmlViewer from "@/components/ResumoHtmlViewer";

type MaterialCuradoria = {
  id: string;
  nome: string;
  especialidade: string;
  tier: number;
  resumo_html_url: string | null;
};

const pageSize = 500;

export default function ResumoHtmlCuradoria() {
  const queryClient = useQueryClient();
  const [materials, setMaterials] = useState<MaterialCuradoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [specialty, setSpecialty] = useState("all");
  const [status, setStatus] = useState("all");
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [deletingMaterial, setDeletingMaterial] = useState<MaterialCuradoria | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<MaterialCuradoria | null>(null);
  const [editedName, setEditedName] = useState("");
  const [savingNameId, setSavingNameId] = useState<string | null>(null);
  const [previewMaterial, setPreviewMaterial] = useState<MaterialCuradoria | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const loadMaterials = async () => {
    setLoading(true);
    try {
      const all: MaterialCuradoria[] = [];
      for (let from = 0; ; from += pageSize) {
        const { data, error } = await supabase
          .from("materiais")
          .select("id,nome,especialidade,tier,resumo_html_url")
          .order("nome", { ascending: true })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        all.push(...((data ?? []) as MaterialCuradoria[]));
        if (!data || data.length < pageSize) break;
      }
      setMaterials(all);
    } catch (error) {
      toast.error(`Não foi possível carregar os materiais: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadMaterials();
  }, []);

  const specialties = useMemo(() => Array.from(new Set(materials.map((item) => item.especialidade))).sort(), [materials]);
  const linkedCount = materials.filter((item) => !!item.resumo_html_url).length;
  const pendingCount = materials.length - linkedCount;
  const filtered = materials.filter((item) => {
    const matchesTitle = item.nome.toLocaleLowerCase().includes(search.toLocaleLowerCase());
    const matchesSpecialty = specialty === "all" || item.especialidade === specialty;
    const matchesStatus = status === "all" || (status === "html" ? !!item.resumo_html_url : !item.resumo_html_url);
    return matchesTitle && matchesSpecialty && matchesStatus;
  });

  const uploadHtml = async (material: MaterialCuradoria, file?: File) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".html")) {
      toast.error("Selecione um arquivo com extensão .html");
      return;
    }
    setUploadingId(material.id);
    const path = `material-${material.id}.html`;
    try {
      const { error: uploadError } = await supabase.storage.from("resumos-html").upload(path, file, {
        upsert: true,
        contentType: "text/html; charset=utf-8",
      });
      if (uploadError) throw new Error(`Falha no upload: ${uploadError.message}`);

      const { data } = supabase.storage.from("resumos-html").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      const { error: updateError } = await supabase.from("materiais").update({ resumo_html_url: publicUrl }).eq("id", material.id);
      if (updateError) throw new Error(`Upload concluído, mas não foi possível salvar a URL no material: ${updateError.message}`);
      setPreviewMaterial((current) => current?.id === material.id ? { ...current, resumo_html_url: publicUrl } : current);
      setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, resumo_html_url: publicUrl } : item));
      toast.success("Resumo HTML atualizado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar o HTML");
    } finally {
      setUploadingId(null);
      const input = inputRefs.current[material.id];
      if (input) input.value = "";
    }
  };

  const deleteHtml = async () => {
    if (!deletingMaterial) return;
    const material = deletingMaterial;
    setDeletingId(material.id);
    const path = `material-${material.id}.html`;
    try {
      const { error: storageError } = await supabase.storage.from("resumos-html").remove([path]);
      if (storageError) throw new Error(`Não foi possível excluir o arquivo HTML: ${storageError.message}`);

      const { error: updateError } = await supabase.from("materiais").update({ resumo_html_url: null }).eq("id", material.id);
      if (updateError) throw new Error(`O arquivo foi removido, mas não foi possível desvincular o HTML: ${updateError.message}`);

      setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, resumo_html_url: null } : item));
      setPreviewMaterial((current) => current?.id === material.id ? null : current);
      setDeletingMaterial(null);
      toast.success("HTML excluído; o material voltou para Legado / Pendente.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível excluir o HTML");
    } finally {
      setDeletingId(null);
    }
  };

  const openRename = (material: MaterialCuradoria) => {
    setEditingMaterial(material);
    setEditedName(material.nome);
  };

  const saveName = async () => {
    if (!editingMaterial) return;
    const nextName = editedName.trim();
    if (!nextName) {
      toast.error("O nome do material não pode ficar vazio.");
      return;
    }
    if (nextName === editingMaterial.nome) {
      setEditingMaterial(null);
      return;
    }

    setSavingNameId(editingMaterial.id);
    const material = editingMaterial;
    try {
      const { error } = await (supabase as any).rpc("admin_rename_material", {
        _material_id: material.id,
        _new_name: nextName,
      });
      if (error) throw error;

      setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, nome: nextName } : item));
      setPreviewMaterial((current) => current?.id === material.id ? { ...current, nome: nextName } : current);
      await queryClient.invalidateQueries();
      setEditingMaterial(null);
      toast.success("Nome atualizado e vínculos associados sincronizados.");
    } catch (error) {
      toast.error(`Não foi possível renomear o material: ${error instanceof Error ? error.message : "erro desconhecido"}`);
    } finally {
      setSavingNameId(null);
    }
  };

  const busy = (id: string) => uploadingId === id || deletingId === id || savingNameId === id;

  return (
    <div className="space-y-6">
      <Card className="space-y-4 border-border/50 bg-card/40 p-5">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold">Curadoria de Resumos HTML</h2>
            <p className="text-sm text-muted-foreground">Envie arquivos HTML associados aos UUIDs atuais dos materiais.</p>
          </div>
          <p className="text-sm font-semibold tabular-nums">{linkedCount} / {materials.length} HTML vinculados</p>
        </div>
        <Progress value={materials.length ? linkedCount / materials.length * 100 : 0} />
        <p className="text-xs text-muted-foreground">{pendingCount} materiais pendentes</p>
      </Card>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por título..." className="pl-9" />
        </div>
        <Select value={specialty} onValueChange={setSpecialty}>
          <SelectTrigger><SelectValue placeholder="Especialidade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as especialidades</SelectItem>
            {specialties.map((item) => <SelectItem key={item} value={item}>{item.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="html">HTML no Storage</SelectItem>
            <SelectItem value="legacy">Legado / Pendente</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> : filtered.length === 0 ? (
          <Card className="p-8 text-center text-sm text-muted-foreground">Nenhum material encontrado.</Card>
        ) : filtered.map((material) => {
          const uploading = uploadingId === material.id;
          const isBusy = busy(material.id);
          return (
            <Card key={material.id} className="flex flex-col gap-4 border-border/50 bg-card/40 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h3 className="font-semibold leading-snug">{material.nome}</h3>
                <p className="text-xs capitalize text-muted-foreground">{material.especialidade.replace(/_/g, " ")} · Tier {material.tier}</p>
                <Badge variant={material.resumo_html_url ? "default" : "secondary"} className={material.resumo_html_url ? "bg-emerald-500/15 text-emerald-400" : ""}>
                  {material.resumo_html_url ? "HTML Atualizado" : "Legado / Pendente"}
                </Badge>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <input
                  ref={(element) => { inputRefs.current[material.id] = element; }}
                  type="file"
                  accept=".html,text/html"
                  className="hidden"
                  disabled={isBusy}
                  onChange={(event) => void uploadHtml(material, event.target.files?.[0])}
                />
                <Button variant="outline" size="sm" disabled={isBusy} onClick={() => inputRefs.current[material.id]?.click()}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
                  {uploading ? "Enviando..." : material.resumo_html_url ? "Substituir" : "Enviar HTML"}
                </Button>
                {material.resumo_html_url && (
                  <>
                    <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => setPreviewMaterial(material)}><ExternalLink className="h-4 w-4" />Visualizar</Button>
                    <Button variant="ghost" size="sm" className="text-red-400 hover:bg-red-500/10 hover:text-red-300" disabled={isBusy} onClick={() => setDeletingMaterial(material)}>
                      {deletingId === material.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      Excluir HTML
                    </Button>
                  </>
                )}
                <Button variant="ghost" size="sm" disabled={isBusy} onClick={() => openRename(material)}><Pencil className="h-4 w-4" />Editar nome</Button>
              </div>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deletingMaterial} onOpenChange={(open) => !open && !deletingId && setDeletingMaterial(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir HTML deste material?</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja desvincular e excluir o arquivo HTML de “{deletingMaterial?.nome}”? O material voltará para o formato legado/PDF. O material e seus demais dados serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancelar</AlertDialogCancel>
            <AlertDialogAction disabled={!!deletingId} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void deleteHtml(); }}>
              {deletingId ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Excluir HTML
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingMaterial} onOpenChange={(open) => !open && !savingNameId && setEditingMaterial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar nome do material</DialogTitle>
            <DialogDescription>O título atualizado será propagado aos OQs vinculados e rascunhos associados, sem alterar o UUID do material.</DialogDescription>
          </DialogHeader>
          <Input autoFocus value={editedName} maxLength={200} onChange={(event) => setEditedName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !savingNameId) void saveName(); }} placeholder="Nome do material" />
          <DialogFooter>
            <Button variant="outline" disabled={!!savingNameId} onClick={() => setEditingMaterial(null)}>Cancelar</Button>
            <Button disabled={!!savingNameId || !editedName.trim()} onClick={() => void saveName()}>
              {savingNameId ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {savingNameId ? "Salvando..." : "Salvar nome"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {previewMaterial?.resumo_html_url && (
        <div className="fixed inset-0 z-[300] flex flex-col bg-background">
          <div className="flex items-center justify-between border-b p-3">
            <h2 className="truncate font-semibold">Preview: {previewMaterial.nome}</h2>
            <Button variant="outline" onClick={() => setPreviewMaterial(null)}>Fechar</Button>
          </div>
          <div className="min-h-0 flex-1">
            <ResumoHtmlViewer url={previewMaterial.resumo_html_url} title={`Preview ${previewMaterial.nome}`} />
          </div>
        </div>
      )}
    </div>
  );
}

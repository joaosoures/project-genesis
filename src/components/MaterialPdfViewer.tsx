import { useEffect, useRef, useState, useCallback } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";
import "react-pdf/dist/Page/AnnotationLayer.css";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ZoomIn, ZoomOut, Highlighter, Trash2, Eraser, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Configura worker do PDF.js via CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface HighlightRect {
  x: number; // %
  y: number; // %
  w: number; // %
  h: number; // %
}

interface Highlight {
  id: string;
  page_number: number;
  highlighted_text: string;
  color: string;
  position: { rects: HighlightRect[] };
}

interface MaterialPdfViewerProps {
  fileUrl: string;
  materialId: string;
  fallbackUrl?: string;
}

export default function MaterialPdfViewer({ fileUrl, materialId, fallbackUrl }: MaterialPdfViewerProps) {
  const { user } = useAuth();
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.2);
  const [isMobile, setIsMobile] = useState(false);
  const [tool, setTool] = useState<"none" | "highlight" | "eraser">("none");
  const [highlightColor, setHighlightColor] = useState<"yellow" | "green" | "pink">("yellow");
  const [showColorMenu, setShowColorMenu] = useState(false);
  const undoStackRef = useRef<string[]>([]);
  const [containerWidth, setContainerWidth] = useState(0);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeFileUrl, setActiveFileUrl] = useState(fileUrl);
  const [triedFallback, setTriedFallback] = useState(false);
  const [selectionTip, setSelectionTip] = useState<{
    x: number;
    y: number;
    pageNumber: number;
    text: string;
    rects: HighlightRect[];
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});

  useEffect(() => {
    setActiveFileUrl(fileUrl);
    setTriedFallback(false);
    setError(false);
    setLoading(true);
    setNumPages(0);
  }, [fileUrl]);

  const handleLoadError = useCallback((e: unknown) => {
    console.error("PDF load error:", e);
    if (fallbackUrl && !triedFallback) {
      setTriedFallback(true);
      setActiveFileUrl(fallbackUrl);
      setLoading(true);
      toast.warning("Tentando abrir o PDF por um caminho alternativo...");
      return;
    }
    setError(true);
    setLoading(false);
  }, [fallbackUrl, triedFallback]);

  // Medir container e detectar mobile
  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        setContainerWidth(width);
        const mobile = width < 768;
        setIsMobile(mobile);
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Carregar marcações existentes
  const loadHighlights = useCallback(async () => {
    if (!user || !materialId) return;
    const { data, error: err } = await supabase
      .from("material_highlights")
      .select("*")
      .eq("user_id", user.id)
      .eq("material_id", materialId);
    if (err) {
      console.error("Erro ao carregar marcações:", err);
      return;
    }
    setHighlights((data as any) || []);
  }, [user, materialId]);

  useEffect(() => {
    loadHighlights();
  }, [loadHighlights]);

  // Detecta seleção de texto
  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
        setSelectionTip(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        setSelectionTip(null);
        return;
      }

      // Descobre em qual página está a seleção
      const range = sel.getRangeAt(0);
      const node = range.startContainer.parentElement;
      const pageEl = node?.closest("[data-pdf-page]") as HTMLElement | null;
      if (!pageEl) return;
      const pageNumber = parseInt(pageEl.dataset.pdfPage || "0", 10);
      if (!pageNumber) return;

      const pageRect = pageEl.getBoundingClientRect();
      const clientRects = Array.from(range.getClientRects());
      if (clientRects.length === 0) return;

      // Normaliza posições como % da página
      const rects: HighlightRect[] = clientRects.map((r) => ({
        x: ((r.left - pageRect.left) / pageRect.width) * 100,
        y: ((r.top - pageRect.top) / pageRect.height) * 100,
        w: (r.width / pageRect.width) * 100,
        h: (r.height / pageRect.height) * 100,
      }));

      // Posição do tooltip
      const last = clientRects[clientRects.length - 1];
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (!containerRect) return;

      setSelectionTip({
        x: last.left + last.width / 2 - containerRect.left,
        y: last.bottom - containerRect.top + 8,
        pageNumber,
        text,
        rects,
      });
    };

    document.addEventListener("selectionchange", handleSelection);
    return () => document.removeEventListener("selectionchange", handleSelection);
  }, []);

  const saveHighlight = async (color: string = "yellow") => {
    if (!selectionTip || !user) return;
    const { data, error: err } = await supabase
      .from("material_highlights")
      .insert([{
        user_id: user.id,
        material_id: materialId,
        page_number: selectionTip.pageNumber,
        highlighted_text: selectionTip.text,
        color,
        position: { rects: selectionTip.rects } as any,
      }])
      .select()
      .single();

    if (err) {
      toast.error("Erro ao salvar marcação");
      return;
    }
    setHighlights((prev) => [...prev, data as any]);
    window.getSelection()?.removeAllRanges();
    setSelectionTip(null);
    toast.success("Marcação salva");
  };

  const deleteHighlight = async (id: string) => {
    const { error: err } = await supabase
      .from("material_highlights")
      .delete()
      .eq("id", id);
    if (err) {
      toast.error("Erro ao remover");
      return;
    }
    setHighlights((prev) => prev.filter((h) => h.id !== id));
  };

  // Salva grifo a partir de rects (sem depender de selectionTip)
  const saveHighlightFromRects = async (
    pageNumber: number,
    text: string,
    rects: HighlightRect[],
    color: string,
  ) => {
    if (!user) return;
    // Tenta extender o último grifo se for adjacente (mesma linha, mesma cor, página)
    const last = highlights[highlights.length - 1];
    if (
      last &&
      last.page_number === pageNumber &&
      last.color === color &&
      last.position?.rects?.length
    ) {
      const lastRect = last.position.rects[last.position.rects.length - 1];
      const newRect = rects[0];
      const sameLine = Math.abs(lastRect.y - newRect.y) < 1.2 && Math.abs(lastRect.h - newRect.h) < 1.2;
      const horizontallyClose = Math.abs((lastRect.x + lastRect.w) - newRect.x) < 4 || Math.abs(lastRect.x - (newRect.x + newRect.w)) < 4;
      if (sameLine && horizontallyClose) {
        const mergedRects = [...last.position.rects, ...rects];
        const mergedText = `${last.highlighted_text} ${text}`.trim();
        const { error: uerr } = await supabase
          .from("material_highlights")
          .update({ position: { rects: mergedRects } as any, highlighted_text: mergedText })
          .eq("id", last.id);
        if (!uerr) {
          setHighlights((prev) => prev.map((h) => (h.id === last.id ? { ...h, position: { rects: mergedRects }, highlighted_text: mergedText } : h)));
          return;
        }
      }
    }
    const { data, error: err } = await supabase
      .from("material_highlights")
      .insert([{ user_id: user.id, material_id: materialId, page_number: pageNumber, highlighted_text: text, color, position: { rects } as any }])
      .select()
      .single();
    if (err) return;
    setHighlights((prev) => [...prev, data as any]);
    undoStackRef.current.push((data as any).id);
  };

  const undoLastHighlight = async () => {
    const id = undoStackRef.current.pop() ?? highlights[highlights.length - 1]?.id;
    if (!id) {
      toast.info("Nada para desfazer");
      return;
    }
    await deleteHighlight(id);
  };

  // Tap em uma palavra: cria/extende um grifo (modo highlight) ou apaga (modo eraser)
  const handlePageTap = (e: React.MouseEvent, pageNumber: number) => {
    if (tool === "none") return;
    const pageEl = (e.currentTarget as HTMLElement);
    const pageRect = pageEl.getBoundingClientRect();
    const cx = e.clientX;
    const cy = e.clientY;

    if (tool === "eraser") {
      // Achar grifo sob o ponto
      const xPct = ((cx - pageRect.left) / pageRect.width) * 100;
      const yPct = ((cy - pageRect.top) / pageRect.height) * 100;
      const hit = highlights.find(
        (h) =>
          h.page_number === pageNumber &&
          h.position?.rects?.some(
            (r) => xPct >= r.x && xPct <= r.x + r.w && yPct >= r.y && yPct <= r.y + r.h,
          ),
      );
      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        deleteHighlight(hit.id);
      }
      return;
    }

    // highlight: pega palavra sob o ponto via caretRangeFromPoint
    const doc: any = document as any;
    let range: Range | null = null;
    if (doc.caretRangeFromPoint) range = doc.caretRangeFromPoint(cx, cy);
    else if (doc.caretPositionFromPoint) {
      const pos = doc.caretPositionFromPoint(cx, cy);
      if (pos) {
        range = document.createRange();
        range.setStart(pos.offsetNode, pos.offset);
        range.collapse(true);
      }
    }
    if (!range) return;
    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return;
    const text = node.textContent || "";
    let start = range.startOffset;
    let end = start;
    while (start > 0 && /\S/.test(text[start - 1])) start--;
    while (end < text.length && /\S/.test(text[end])) end++;
    if (start === end) return;
    const word = text.slice(start, end);
    const wordRange = document.createRange();
    wordRange.setStart(node, start);
    wordRange.setEnd(node, end);
    const clientRects = Array.from(wordRange.getClientRects());
    if (!clientRects.length) return;
    const rects: HighlightRect[] = clientRects.map((r) => ({
      x: ((r.left - pageRect.left) / pageRect.width) * 100,
      y: ((r.top - pageRect.top) / pageRect.height) * 100,
      w: (r.width / pageRect.width) * 100,
      h: (r.height / pageRect.height) * 100,
    }));
    e.preventDefault();
    e.stopPropagation();
    window.getSelection()?.removeAllRanges();
    saveHighlightFromRects(pageNumber, word, rects, highlightColor);
  };

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 4));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.4));

  // Pinch-to-zoom no mobile
  const pinchRef = useRef<{ dist: number; startScale: number } | null>(null);
  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), startScale: scale };
    }
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const newDist = Math.hypot(dx, dy);
      const ratio = newDist / pinchRef.current.dist;
      const newScale = Math.max(0.4, Math.min(4, pinchRef.current.startScale * ratio));
      setScale(newScale);
    }
  };
  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  const pageWidth = containerWidth > 0 ? (isMobile ? containerWidth - 4 : Math.min(containerWidth - 16, 900)) : 600;

  return (
    <div className="relative w-full h-full bg-neutral-900 overflow-hidden">
      {/* Controles de Zoom flutuantes */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-1 py-1 border border-white/10 shadow-xl">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-white/10 text-white"
          onClick={zoomOut}
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-[10px] font-black text-white/80 tabular-nums min-w-[34px] text-center">
          {Math.round(scale * 100)}%
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-white/10 text-white"
          onClick={zoomIn}
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
      </div>

      {/* Painel de ferramentas de grifo (canto inferior esquerdo) */}
      <div className="absolute bottom-4 left-4 z-30 flex flex-col items-center gap-2">
        {showColorMenu && tool === "highlight" && (
          <div className="flex flex-col gap-2 bg-black/70 backdrop-blur-md rounded-full p-1.5 border border-white/10 shadow-xl animate-in fade-in slide-in-from-bottom-2">
            {(["yellow", "green", "pink"] as const).map((c) => (
              <button
                key={c}
                onClick={() => { setHighlightColor(c); setShowColorMenu(false); }}
                className={cn(
                  "h-7 w-7 rounded-full transition-transform hover:scale-110 border-2",
                  highlightColor === c ? "border-white" : "border-transparent",
                  c === "yellow" && "bg-yellow-300",
                  c === "green" && "bg-green-400",
                  c === "pink" && "bg-pink-400",
                )}
                aria-label={`Cor ${c}`}
              />
            ))}
          </div>
        )}
        <button
          onClick={() => {
            if (tool === "highlight") setShowColorMenu((s) => !s);
            else { setTool("highlight"); setShowColorMenu(false); }
          }}
          className={cn(
            "h-12 w-12 rounded-2xl shadow-xl flex items-center justify-center transition-all border border-white/10 backdrop-blur-md",
            tool === "highlight" ? "scale-105 ring-2 ring-white/40" : "bg-black/60 hover:bg-black/70",
          )}
          style={tool === "highlight" ? {
            backgroundColor:
              highlightColor === "yellow" ? "rgb(253 224 71)" :
              highlightColor === "green" ? "rgb(74 222 128)" : "rgb(244 114 182)",
          } : undefined}
          aria-label="Modo grifar"
          title="Grifar (toque na palavra)"
        >
          <Highlighter className={cn("h-5 w-5", tool === "highlight" ? "text-black" : "text-white")} />
        </button>
        <button
          onClick={() => { setTool(tool === "eraser" ? "none" : "eraser"); setShowColorMenu(false); }}
          className={cn(
            "h-12 w-12 rounded-2xl shadow-xl flex items-center justify-center transition-all border border-white/10 backdrop-blur-md",
            tool === "eraser" ? "bg-red-500 scale-105 ring-2 ring-white/40" : "bg-black/60 hover:bg-black/70",
          )}
          aria-label="Borracha"
          title="Apagar marcação (toque na marcação)"
        >
          <Eraser className="h-5 w-5 text-white" />
        </button>
        <button
          onClick={undoLastHighlight}
          className="h-12 w-12 rounded-2xl bg-black/60 hover:bg-black/70 text-white shadow-xl flex items-center justify-center border border-white/10 backdrop-blur-md"
          aria-label="Desfazer"
          title="Desfazer última marcação"
        >
          <Undo2 className="h-5 w-5" />
        </button>
        {tool !== "none" && (
          <button
            onClick={() => { setTool("none"); setShowColorMenu(false); }}
            className="text-[9px] font-black uppercase tracking-wider text-white/70 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 border border-white/10"
          >
            Fechar
          </button>
        )}
      </div>

      <div
        ref={containerRef}
        className="w-full h-full overflow-auto py-3 px-2"
        style={{ touchAction: "pan-x pan-y" }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {error ? (
          <div className="flex flex-col items-center justify-center h-full text-white/70 gap-3 p-8 text-center">
            <p className="font-bold">Não foi possível carregar o PDF.</p>
            <p className="text-xs">Verifique o link do material ou tente novamente.</p>
          </div>
        ) : (
          <Document
            file={activeFileUrl}
            onLoadSuccess={({ numPages: n }) => {
              setNumPages(n);
              setLoading(false);
            }}
            onLoadError={handleLoadError}
            loading={
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-white/60" />
              </div>
            }
            className="flex flex-col items-center gap-4"
          >
            {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
              <div
                key={p}
                data-pdf-page={p}
                ref={(el) => (pageRefs.current[p] = el)}
                onClick={(e) => handlePageTap(e, p)}
                className={cn(
                  "relative shadow-2xl bg-white",
                  tool !== "none" && "select-none [&_*]:!cursor-crosshair",
                )}
                style={tool !== "none" ? { WebkitUserSelect: "none", userSelect: "none" } : undefined}
              >
                <Page
                  pageNumber={p}
                  width={pageWidth * scale}
                  renderTextLayer
                  renderAnnotationLayer={false}
                />
                {/* Marcações sobrepostas */}
                {highlights
                  .filter((h) => h.page_number === p)
                  .map((h) =>
                    h.position?.rects?.map((r, idx) => (
                      <div
                        key={`${h.id}-${idx}`}
                        className="absolute pointer-events-auto cursor-pointer group"
                        style={{
                          left: `${r.x}%`,
                          top: `${r.y}%`,
                          width: `${r.w}%`,
                          height: `${r.h}%`,
                          backgroundColor:
                            h.color === "yellow"
                              ? "rgba(253,224,71,0.45)"
                              : h.color === "green"
                              ? "rgba(74,222,128,0.4)"
                              : "rgba(244,114,182,0.4)",
                          mixBlendMode: "multiply",
                        }}
                        onDoubleClick={() => deleteHighlight(h.id)}
                        title="Duplo clique para remover"
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteHighlight(h.id);
                          }}
                          className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-500 text-white items-center justify-center hidden group-hover:flex shadow-lg"
                        >
                          <Trash2 className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    ))
                  )}
              </div>
            ))}
          </Document>
        )}

        {loading && !error && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
          </div>
        )}
      </div>

      {/* Tooltip de marcação ao selecionar texto */}
      {selectionTip && (
        <div
          className="absolute z-40 flex items-center gap-1 bg-black/90 backdrop-blur-md rounded-full p-1 shadow-2xl border border-white/10 animate-in fade-in zoom-in-95"
          style={{
            left: Math.max(8, Math.min(selectionTip.x - 90, (containerRef.current?.clientWidth || 300) - 200)),
            top: selectionTip.y,
          }}
        >
          <button
            onClick={() => saveHighlight("yellow")}
            className="h-7 w-7 rounded-full bg-yellow-300 hover:scale-110 transition-transform flex items-center justify-center"
            title="Grifar amarelo"
          >
            <Highlighter className="h-3.5 w-3.5 text-black" />
          </button>
          <button
            onClick={() => saveHighlight("green")}
            className="h-7 w-7 rounded-full bg-green-400 hover:scale-110 transition-transform"
            title="Grifar verde"
          />
          <button
            onClick={() => saveHighlight("pink")}
            className="h-7 w-7 rounded-full bg-pink-400 hover:scale-110 transition-transform"
            title="Grifar rosa"
          />
        </div>
      )}
    </div>
  );
}

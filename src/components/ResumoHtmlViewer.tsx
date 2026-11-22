import { useEffect, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

interface ResumoHtmlViewerProps {
  url: string;
  title: string;
  className?: string;
}

function prepareHtmlDocument(html: string) {
  let document = html.trim();
  const hasHtmlElement = /<html(?:\s|>)/i.test(document);
  const hasHeadElement = /<head(?:\s|>)/i.test(document);

  if (!hasHtmlElement) {
    document = document.replace(/^\s*<!doctype[^>]*>/i, "");
    document = hasHeadElement
      ? `<!DOCTYPE html><html>${document}</html>`
      : `<!DOCTYPE html><html><head></head><body>${document}</body></html>`;
  } else if (!/^\s*<!doctype/i.test(document)) {
    document = `<!DOCTYPE html>${document}`;
  }

  const metadata = [
    /<meta\s+[^>]*charset\s*=/i.test(document)
      ? ""
      : '<meta charset="UTF-8">',
    /<meta\s+[^>]*name\s*=\s*["']viewport["']/i.test(document)
      ? ""
      : '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
  ].filter(Boolean).join("");

  if (/<head(?:\s[^>]*)?>/i.test(document)) {
    return document.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}${metadata}`);
  }

  return document.replace(/<html(?:\s[^>]*)?>/i, (htmlTag) => `${htmlTag}<head>${metadata}</head>`);
}

export default function ResumoHtmlViewer({ url, title, className = "" }: ResumoHtmlViewerProps) {
  const [htmlDocument, setHtmlDocument] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const cacheBustedUrl = new URL(url);
    cacheBustedUrl.searchParams.set("v", String(Date.now()));
    setLoading(true);
    setError(false);
    setHtmlDocument("");

    fetch(cacheBustedUrl.href, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o resumo");
        return response.text();
      })
      .then((html) => setHtmlDocument(prepareHtmlDocument(html)))
      .catch((fetchError: unknown) => {
        if (fetchError instanceof DOMException && fetchError.name === "AbortError") return;
        setError(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [url]);

  return (
    <div className={`relative h-full min-h-0 w-full bg-white ${className}`}>
      {loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center gap-2 bg-background text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando resumo...
        </div>
      )}
      {error ? (
        <div className="flex h-full items-center justify-center gap-2 p-6 text-center text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Não foi possível carregar o resumo. Verifique sua conexão e tente novamente.
        </div>
      ) : (
        <iframe
          title={title}
          srcDoc={htmlDocument}
          sandbox="allow-scripts allow-forms allow-popups"
          referrerPolicy="no-referrer"
          className="block h-full min-h-0 w-full border-0 bg-white"
        />
      )}
    </div>
  );
}

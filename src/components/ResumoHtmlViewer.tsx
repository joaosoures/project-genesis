import { useMemo } from "react";

interface ResumoHtmlViewerProps {
  url: string;
  title: string;
  className?: string;
}

export default function ResumoHtmlViewer({ url, title, className = "" }: ResumoHtmlViewerProps) {
  const src = useMemo(() => {
    const parsed = new URL(url);
    parsed.searchParams.set("v", String(Date.now()));
    return parsed.href;
  }, [url]);

  return (
    <iframe
      title={title}
      src={src}
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      className={`block h-full min-h-0 w-full border-0 bg-white ${className}`}
    />
  );
}

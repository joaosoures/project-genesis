const blockTags = new Set(["ADDRESS", "ARTICLE", "BLOCKQUOTE", "DD", "DIV", "DL", "DT", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEADER", "HR", "LI", "MAIN", "NAV", "OL", "P", "PRE", "SECTION", "TABLE", "TR", "UL"]);
const discardedTags = new Set(["SCRIPT", "STYLE", "SVG", "NOSCRIPT", "TEMPLATE"]);

export function sanitizeHtmlToCleanText(html: string): string {
  const document = new DOMParser().parseFromString(html, "text/html");
  const render = (node: Node): string => {
    if (node.nodeType === Node.COMMENT_NODE) return "";
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
    if (!(node instanceof Element)) return "";
    if (discardedTags.has(node.tagName)) return "";

    const content = Array.from(node.childNodes).map(render).join("");
    const tag = node.tagName;
    if (/^H[1-6]$/.test(tag)) return `\n\n${"#".repeat(Number(tag[1]))} ${content.trim()}\n\n`;
    if (tag === "BR") return "\n";
    if (tag === "HR") return "\n\n---\n\n";
    if (tag === "LI") return `\n- ${content.trim()}`;
    if (tag === "TR") return `\n| ${Array.from(node.children).map(cell => render(cell).trim()).join(" | ")} |`;
    if (tag === "TH" || tag === "TD") return content;
    if (tag === "SUMMARY") return `\n${content.trim()}\n`;
    if (tag === "DETAILS") return `\n${content.trim()}\n`;
    if (tag === "OL" || tag === "UL") return `\n${content}\n`;
    if (tag === "P" || blockTags.has(tag)) return `\n\n${content.trim()}\n\n`;
    return content;
  };

  return render(document.body)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

import { describe, expect, it } from "vitest";
import { sanitizeHtmlToCleanText } from "@/lib/sanitizeHtmlToCleanText";

describe("sanitizeHtmlToCleanText", () => {
  it("descarta estilo/script/svg/comentários e preserva estrutura e conteúdo de details", () => {
    const html = `<style>no</style><script>secret()</script><svg><text>no</text></svg><!--no--><h2 style="color:red">Resumo</h2><p>Texto <span class="x">importante</span></p><details><summary>Mais</summary><p>Conteúdo escondido</p></details><ul><li>Item</li></ul><table><tr><td>A</td><td>B</td></tr></table>`;
    const result = sanitizeHtmlToCleanText(html);
    expect(result).toContain("## Resumo");
    expect(result).toContain("Texto importante");
    expect(result).toContain("Mais");
    expect(result).toContain("Conteúdo escondido");
    expect(result).toContain("- Item");
    expect(result).toContain("| A | B |");
    expect(result).not.toContain("secret");
    expect(result).not.toContain("no");
  });

  it("normaliza espaços e linhas em branco", () => {
    expect(sanitizeHtmlToCleanText("<p>  Um&nbsp; texto </p><p>Outro</p>")).toBe("Um texto\n\nOutro");
  });
});

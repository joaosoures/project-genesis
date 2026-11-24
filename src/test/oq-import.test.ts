import { describe, expect, it } from "vitest";
import { parseOqsJson, toCardImportPayload } from "@/lib/oq-import";

describe("parseOqsJson", () => {
  it("lê JSON direto com cercas, texto ao redor, aspas curvas e vírgula final", () => {
    const input = `Conteúdo extra:\n\`\`\`json\n[{“modo”: “ABCDE”, “comando”: “Qual item? {literal}”, “respostas”: {“A”: “um”, “B”: “dois”, “C”: “três”, “D”: “quatro”, “E”: “cinco”,}, “gabarito”: “B”,}]\n\`\`\`\nFim`;
    expect(parseOqsJson(input, "pediatria")[0]).toMatchObject({ modo: "abcde", comando: "Qual item? {literal}", gabarito: "B", especialidade: "pediatria" });
  });

  it("lê wrapper oqs e normaliza linha literal dentro de valor", () => {
    const input = `Resposta: {"oqs":[{"modo":"Lacuna","comando":"Complete ____\ne explique","resposta":"termo","variacoes":"sinônimo; variação"}]}`;
    expect(parseOqsJson(input, "clinica_medica")[0].comando).toBe("Complete ____\ne explique");
  });

  it("aceita aliases acentuados e mapeia OQ Falta aos campos usados no banco", () => {
    const oq = parseOqsJson(JSON.stringify([{ modo: "OQ Falta", comando: "Qual componente falta?", respostas: ["A", "B"], variações: ["varA", "varB"] }]), "pediatria")[0];
    const payload = toCardImportPayload(oq, "aula-1");
    expect(payload).toMatchObject({ modo: "oq_falta", info_1: "A", var_1: "varA", info_2: "B", var_2: "varB", aula_id: "aula-1", origem: "admin", verificado: true });
  });

  it("converte marcador ____ em [___] explicitamente no payload", () => {
    const oq = parseOqsJson(JSON.stringify([{ modo: "Lacuna", comando: "____ ocorre", resposta: "x", variacoes: ["y"] }]), "pediatria")[0];
    expect(toCardImportPayload(oq, "aula-1").comando).toBe("[___] ocorre");
  });

  it("higieniza colagem Markdown do ChatGPT com barra de continuação, entidade de espaço e underscores escapados", () => {
    const input = `[{\\\n&#x20;"modo":"Lacuna",&#x20;"comando":"Complete \\_\\_\\_\\_",&#x20;"resposta":"termo",&#x20;"variacoes":["sinônimo"]}]`;
    const oq = parseOqsJson(input, "pediatria")[0];

    expect(oq.comando).toBe("Complete ____");
    expect(toCardImportPayload(oq, "aula-1").comando).toBe("Complete [___]");
  });

  it("retorna erro com índice e campo quando um item é inválido", () => {
    expect(() => parseOqsJson(JSON.stringify([{ modo: "desconhecido", comando: "x" }]), "pediatria")).toThrow("Item 1: campo \"modo\"");
  });

  it("não produz staging parcial quando JSON está truncado", () => {
    expect(() => parseOqsJson('[{"modo":"lacuna"', "pediatria")).toThrow("JSON inválido");
  });
});

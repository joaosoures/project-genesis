import { describe, expect, it } from "vitest";
import {
  buildPreAulaImportPayload,
  normalizePreAulaText,
  parsePreAulaCsv,
  similarityScore,
  suggestMaterialMatches,
} from "@/lib/pre-aula";

describe("utilitários de questões pré-aula", () => {
  it("normaliza acentos, pontuação, caixa e espaços", () => {
    expect(normalizePreAulaText("  Pré-Eclâmpsia:  Grave! ")).toBe("pre eclampsia grave");
  });

  it("faz parsing de CSV com BOM, vírgulas, aspas e quebra de linha", () => {
    const csv = '\uFEFFMateria,Questao,Justificativa\nCardio,"Enunciado, com vírgula","Linha 1\nLinha 2"';
    expect(parsePreAulaCsv(csv)).toEqual([
      ["Materia", "Questao", "Justificativa"],
      ["Cardio", "Enunciado, com vírgula", "Linha 1\nLinha 2"],
    ]);
  });

  it("detecta ponto e vírgula sem quebrar vírgulas internas", () => {
    const csv = "Materia;Questao;Justificativa\nCardio;Questão curta;Texto, com vírgula";
    expect(parsePreAulaCsv(csv)[1]).toEqual(["Cardio", "Questão curta", "Texto, com vírgula"]);
  });

  it("prioriza correspondência exata normalizada", () => {
    const matches = suggestMaterialMatches("Pré Eclâmpsia", [
      { id: "1", nome: "Hipertensão", especialidade: "ginecologia_obstetricia" },
      { id: "2", nome: "Pré-eclâmpsia", especialidade: "ginecologia_obstetricia" },
    ]);
    expect(matches[0]).toMatchObject({ id: "2", score: 1 });
    expect(similarityScore("pré eclâmpsia", "Pré-eclâmpsia")).toBe(1);
  });

  it("mantém a ordem da planilha separadamente em cada material", () => {
    const base = {
      rowNumber: 2,
      materia: "Tema A",
      questao: "Q",
      alternativa_a: "A",
      alternativa_b: "B",
      alternativa_c: "C",
      alternativa_d: "D",
      alternativa_e: null,
      gabarito: "A",
      justificativa: "J",
    };
    const payload = buildPreAulaImportPayload(
      [base, { ...base, rowNumber: 3, materia: "Tema B" }, { ...base, rowNumber: 4 }],
      { "Tema A": "material-a", "Tema B": "material-b" },
      "clinica_medica",
    );
    expect(payload.map(({ material_id, ordem }) => [material_id, ordem])).toEqual([
      ["material-a", 1],
      ["material-b", 1],
      ["material-a", 2],
    ]);
  });
});

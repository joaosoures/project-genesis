import { describe, expect, it } from "vitest";
import { currentItem, punishmentIntensity, QuestaoRealState } from "@/lib/questoes-reais";

describe("Questões Reais helpers", () => {
  it("reduz linearmente a intensidade do castigo", () => {
    expect(punishmentIntensity(0, 4)).toBe(1);
    expect(punishmentIntensity(3, 4)).toBe(0);
    expect(punishmentIntensity(1, 3)).toBe(0.5);
  });

  it("preserva a questão confirmada atual para exibir feedback", () => {
    const state = {
      sessao: { fase: "base", posicao_base: 0, posicao_castigo: 0 },
      itens: [{ id: "item", tipo: "base", posicao: 0, confirmado_em: "2026-01-01" }],
    } as unknown as QuestaoRealState;
    expect(currentItem(state)?.id).toBe("item");
  });
});

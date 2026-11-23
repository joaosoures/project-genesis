import { describe, expect, it } from "vitest";
import { calcularSemanasUteis, distribuirEquilibrado, inserirAulaNaFila } from "@/hooks/useTrilhaPlano";
import { filterRegularMaterialsByTier, isExtraMaterial } from "@/lib/materialOrder";

describe("regras puras da Trilha", () => {
  it("reserva quatro semanas e distribui toda a cobertura", () => {
    const ids = Array.from({ length: 168 }, (_, i) => `a-${i}`);
    const plano = distribuirEquilibrado(ids, 43);
    expect(calcularSemanasUteis(43)).toBe(39);
    expect(Object.keys(plano)).toHaveLength(168);
    expect(Math.max(...Object.values(plano))).toBe(38);
  });

  it("insere na semana atual e desloca apenas pendências", () => {
    const result = inserirAulaNaFila({ a: 0, b: 0, c: 1, d: 2 }, "c", 0, 6, new Set(["a"]), 2);
    expect(result.alreadyInWeek).toBe(false);
    expect(result.distribuicao.c).toBe(0);
    expect(result.distribuicao.b).toBe(1);
    expect(result.distribuicao.a).toBe(0);
    expect(result.deslocamentos.map((item) => item.aula_id)).toContain("b");
  });

  it("é idempotente quando a matéria já está na semana", () => {
    const result = inserirAulaNaFila({ a: 0 }, "a", 0, 4, new Set(), 2);
    expect(result.alreadyInWeek).toBe(true);
    expect(result.deslocamentos).toHaveLength(0);
  });

  it("identifica extras e as exclui da cobertura por tier", () => {
    const materials = [
      { id: "regular", nome: "Tema", tier: 1 },
      { id: "extra", nome: "Aula extra de tema", tier: 1 },
    ];
    expect(isExtraMaterial(materials[1])).toBe(true);
    expect(filterRegularMaterialsByTier(materials, 1).map(({ id }) => id)).toEqual(["regular"]);
    expect(materials.find(({ id }) => id === "extra")).toBeDefined();
  });
});

import { describe, expect, it } from "vitest";
import { compareMaterialsByOrder, compareTrilhaMaterials, countRegularMaterialsByTier, isExtraMaterial } from "@/lib/materialOrder";

describe("ordem dos materiais", () => {
  it("mantém a ordenação original da página de materiais", () => {
    const materials = [
      { id: "extra-b", nome: "Aula extra de Beta", ordem_incidencia: 174 },
      { id: "main-2", nome: "2 - Tema B", ordem_incidencia: 2 },
      { id: "extra-a", nome: "Aula extra de Alfa", ordem_incidencia: 173 },
      { id: "main-1", nome: "1 - Tema A", ordem_incidencia: 1 },
    ];
    expect(materials.sort(compareMaterialsByOrder).map((material) => material.id)).toEqual([
      "main-1", "main-2", "extra-a", "extra-b",
    ]);
  });

  it("usa estritamente tier e ordem na Trilha, sem desempate alfabético", () => {
    const materials = [
      { id: "x", nome: "Zeta", tier: 1, ordem_incidencia: 4 },
      { id: "y", nome: "Alfa", tier: 2, ordem_incidencia: 1 },
      { id: "z", nome: "Omega", tier: 1, ordem_incidencia: 2 },
      { id: "tie-z", nome: "Zeta", tier: 1, ordem_incidencia: 2 },
      { id: "tie-a", nome: "Alfa", tier: 1, ordem_incidencia: 2 },
    ];
    expect(materials.sort(compareTrilhaMaterials).map((material) => material.id)).toEqual([
      "z", "tie-z", "tie-a", "x", "y",
    ]);
  });

  it("detecta extras sem diferenciar maiúsculas e exclui da contagem de tiers", () => {
    const materials = [
      { id: "a", nome: "Tema A", tier: 1 },
      { id: "b", nome: "Tema B", tier: 2 },
      { id: "c", nome: "AULA EXTRA - revisão", tier: 1 },
      { id: "d", nome: "Tema D", tier: 3 },
    ];
    expect(isExtraMaterial(materials[2])).toBe(true);
    expect(countRegularMaterialsByTier(materials)).toEqual({ 1: 1, 2: 1, 3: 1 });
  });
});

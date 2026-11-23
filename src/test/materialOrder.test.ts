import { describe, expect, it } from "vitest";
import {
  compareMaterialsByOrder,
  compareMaterialsByTierAndOrder,
  countRegularMaterialsByTier,
  distributeRegularMaterials,
  filterRegularMaterialsByTier,
} from "@/lib/materialOrder";

describe("ordem e seleção de materiais", () => {
  it("mantém a ordenação geral por ordem de incidência", () => {
    const materials = [
      { id: "extra-b", nome: "Aula extra de Beta", ordem_incidencia: 174 },
      { id: "main-2", nome: "2 - Tema B", ordem_incidencia: 2 },
      { id: "extra-a", nome: "Aula extra de Alfa", ordem_incidencia: 173 },
      { id: "main-1", nome: "1 - Tema A", ordem_incidencia: 1 },
    ];
    expect(materials.sort(compareMaterialsByOrder).map((material) => material.id)).toEqual(["main-1", "main-2", "extra-a", "extra-b"]);
  });

  it("ordena a trilha por tier e depois ordem sem desempatar pelo título", () => {
    const materials = [
      { id: "same-order-b", nome: "A Tema", tier: 1, ordem_incidencia: 4 },
      { id: "tier-2", nome: "0 Tema", tier: 2, ordem_incidencia: 1 },
      { id: "same-order-a", nome: "Z Tema", tier: 1, ordem_incidencia: 4 },
      { id: "tier-1-first", nome: "M Tema", tier: 1, ordem_incidencia: 2 },
    ];
    expect(materials.sort(compareMaterialsByTierAndOrder).map((material) => material.id)).toEqual(["tier-1-first", "same-order-b", "same-order-a", "tier-2"]);
  });

  it("exclui extras dos totais e da distribuição automática, mantendo-as na coleção manual", () => {
    const materials = [
      { id: "regular-1", nome: "Tema A", tier: 1, ordem_incidencia: 1 },
      { id: "regular-2", nome: "Tema B", tier: 2, ordem_incidencia: 2 },
      { id: "regular-3", nome: "Tema C", tier: 3, ordem_incidencia: 3 },
      { id: "extra", nome: "Aula extra de Tema D", tier: 1, ordem_incidencia: 4 },
    ];
    expect(countRegularMaterialsByTier(materials)).toEqual({ 1: 1, 2: 1, 3: 1 });
    expect(filterRegularMaterialsByTier(materials, 3).map((item) => item.id)).toEqual(["regular-1", "regular-2", "regular-3"]);
    expect(Object.keys(distributeRegularMaterials(materials, 3, 8))).toEqual(["regular-1", "regular-2", "regular-3"]);
    expect(materials.find((item) => item.id === "extra")).toBeDefined();
  });
});

import { describe, expect, it } from "vitest";
import { compareMaterialsByOrder } from "@/lib/materialOrder";

describe("ordem dos materiais", () => {
  it("mantém as aulas numeradas antes das extras, sem depender do texto do título", () => {
    const materials = [
      { id: "extra-b", nome: "Aula extra de Beta", ordem_incidencia: 174 },
      { id: "main-2", nome: "2 - Tema B", ordem_incidencia: 2 },
      { id: "extra-a", nome: "Aula extra de Alfa", ordem_incidencia: 173 },
      { id: "main-1", nome: "1 - Tema A", ordem_incidencia: 1 },
    ];

    expect(materials.sort(compareMaterialsByOrder).map((material) => material.id)).toEqual([
      "main-1",
      "main-2",
      "extra-a",
      "extra-b",
    ]);
  });
});

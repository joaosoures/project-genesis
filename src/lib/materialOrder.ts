export interface MaterialOrderItem {
  id: string;
  nome: string;
  ordem_incidencia?: number | null;
  tier?: number | null;
}

export function isExtraMaterial(material: Pick<MaterialOrderItem, "nome">): boolean {
  return /aula\s+extra/i.test(material.nome);
}

export function compareMaterialsByOrder(a: MaterialOrderItem, b: MaterialOrderItem): number {
  const orderA = a.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
}

export function compareMaterialsByTierAndOrder(a: MaterialOrderItem, b: MaterialOrderItem): number {
  const tierA = a.tier ?? Number.MAX_SAFE_INTEGER;
  const tierB = b.tier ?? Number.MAX_SAFE_INTEGER;
  const orderA = a.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  return tierA - tierB || orderA - orderB || a.id.localeCompare(b.id);
}

export function distributeRegularMaterials<T extends MaterialOrderItem>(materials: T[], maxTier: number, weeks: number, reserve = 4): Record<string, number> {
  const eligible = filterRegularMaterialsByTier(materials, maxTier).sort(compareMaterialsByTierAndOrder);
  const usefulWeeks = Math.max(1, Math.floor(weeks) - Math.min(Math.max(0, reserve), Math.max(0, Math.floor(weeks) - 1)));
  return Object.fromEntries(eligible.map((material, index) => [
    material.id,
    Math.min(usefulWeeks - 1, Math.floor((index * usefulWeeks) / Math.max(1, eligible.length))),
  ]));
}

export function filterRegularMaterialsByTier<T extends MaterialOrderItem>(materials: T[], maxTier: number): T[] {
  return materials.filter((material) => !isExtraMaterial(material) && (material.tier ?? 0) <= maxTier);
}

export function countRegularMaterialsByTier(materials: MaterialOrderItem[]): Record<1 | 2 | 3, number> {
  const counts: Record<1 | 2 | 3, number> = { 1: 0, 2: 0, 3: 0 };
  for (const material of materials) {
    if (isExtraMaterial(material) || (material.tier !== 1 && material.tier !== 2 && material.tier !== 3)) continue;
    counts[material.tier]++;
  }
  return counts;
}

export function distributeRegularMaterials<T extends MaterialOrderItem>(materials: T[], maxTier: number, weeks: number, reserve = 4): Record<string, number> {
  const eligible = filterRegularMaterialsByTier(materials, maxTier).sort(compareMaterialsByTierAndOrder);
  const totalWeeks = Math.max(1, Math.floor(weeks));
  const usefulWeeks = Math.max(1, totalWeeks - Math.min(Math.max(0, reserve), Math.max(0, totalWeeks - 1)));
  return Object.fromEntries(eligible.map((material, index) => [
    material.id,
    Math.min(usefulWeeks - 1, Math.floor((index * usefulWeeks) / Math.max(1, eligible.length))),
  ]));
}

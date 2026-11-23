export interface MaterialOrderItem {
  id: string;
  nome: string;
  ordem_incidencia?: number | null;
  tier?: number | null;
}

export function isExtraMaterial(material: Pick<MaterialOrderItem, "nome">): boolean {
  return /aula\s+extra/i.test(material.nome);
}

export function compareTrilhaMaterials(a: MaterialOrderItem, b: MaterialOrderItem): number {
  const tierA = a.tier ?? Number.MAX_SAFE_INTEGER;
  const tierB = b.tier ?? Number.MAX_SAFE_INTEGER;
  const orderA = a.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  return tierA - tierB || orderA - orderB;
}

export function getTrilhaEligibleMaterials<T extends MaterialOrderItem>(materials: T[], maxTier: number, manuallyIncludedIds: Set<string> = new Set()): T[] {
  return materials
    .filter((material) => isExtraMaterial(material)
      ? manuallyIncludedIds.has(material.id)
      : material.tier !== null && material.tier !== undefined && material.tier <= maxTier)
    .sort(compareTrilhaMaterials);
}

export function countRegularMaterialsByTier<T extends MaterialOrderItem>(materials: T[]) {
  const counts = { 1: 0, 2: 0, 3: 0 };
  for (const material of materials) {
    if (isExtraMaterial(material)) continue;
    if (material.tier === 1) counts[1]++;
    else if (material.tier === 2) counts[2]++;
    else if (material.tier === 3) counts[3]++;
  }
  return counts;
}

export function compareMaterialsByOrder(a: MaterialOrderItem, b: MaterialOrderItem): number {
  const orderA = a.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
}

export interface MaterialOrderItem {
  id: string;
  nome: string;
  ordem_incidencia?: number | null;
}

export function compareMaterialsByOrder(a: MaterialOrderItem, b: MaterialOrderItem): number {
  const orderA = a.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  const orderB = b.ordem_incidencia ?? Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id);
}

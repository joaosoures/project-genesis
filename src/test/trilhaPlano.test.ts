import { describe, expect, it } from "vitest";
import { calcularSemanasUteis, distribuirEquilibrado, inserirAulaNaFila, limparDadosDerivados, maxTierFor, normalizarSemanas } from "@/hooks/useTrilhaPlano";
import type { AulaPlano, TrilhaSettings } from "@/hooks/useTrilhaPlano";

describe("regras puras da Trilha", () => {
  it("distribui dinamicamente a seleção regular, sem números antigos fixos", () => {
    const ids = Array.from({ length: 168 }, (_, i) => `a-${i}`);
    const plano = distribuirEquilibrado(ids, 43);
    expect(calcularSemanasUteis(43)).toBe(39);
    expect(Object.keys(plano)).toHaveLength(ids.length);
    expect(Math.max(...Object.values(plano))).toBe(38);
    expect(maxTierFor("alta")).toBe(1);
    expect(maxTierFor("alta_media")).toBe(2);
    expect(maxTierFor("todas")).toBe(3);
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

  it("preserva extras apenas quando explicitamente incluídas e respeita conclusões ao normalizar", () => {
    const regular: AulaPlano = { id: "regular", nome: "Tema", ordem_incidencia: 2, especialidade: "cm", tier: 1, key_words: null, total_oqs: 4, link_material: null };
    const extra: AulaPlano = { ...regular, id: "extra", nome: "Aula extra: revisão", ordem_incidencia: 169 };
    const settings = { completos: ["regular"], completos_semana: { regular: 0 }, plano_overrides: { extra: 2 }, planos_semanais: { "0": ["old"] } } as unknown as TrilhaSettings;
    const kept = limparDadosDerivados(settings);
    expect(kept.completos).toEqual(["regular"]);
    expect(kept.completos_semana).toEqual({ regular: 0 });
    expect(kept.plano_overrides).toEqual({ extra: 2 });

    const result = normalizarSemanas({ regular: 0, extra: 1, stale: 0 }, [regular, extra], new Set(["regular"]), 2, 4);
    expect(result.distribuicao).toEqual({ regular: 0, extra: 1 });
  });
});

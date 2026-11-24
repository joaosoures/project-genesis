import { describe, expect, it } from "vitest";
import payload from "@/data/onboarding-oqs.json";
import { getOnboardingCompletionState } from "@/lib/onboarding";

describe("onboarding OQs", () => {
  it("preserves all 20 original items and their original sequence", () => {
    expect(payload.oqs).toHaveLength(20);
    expect(payload.oqs[0].comando).toContain("\n");
    expect(payload.oqs[19].comando).toContain("VPP");
    expect(payload.oqs.filter((item) => item.modo === "ABCDE")).toHaveLength(7);
    expect(payload.oqs.filter((item) => item.modo === "Lacuna")).toHaveLength(7);
    expect(payload.oqs.filter((item) => item.modo === "OQ Falta")).toHaveLength(6);
    expect(payload.oqs.every((item) => item.comando.length > 0 && item.explicacao.length > 0)).toBe(true);
  });

  it("shows completion guidance only when the first pass is complete and no regular queue remains", () => {
    expect(getOnboardingCompletionState({ onboardingTotal: 20, onboardingAnswered: 20, regularQueueTotal: 0, dataInicioPlano: null, provaData: null })).toBe("needs-trilha-setup");
    expect(getOnboardingCompletionState({ onboardingTotal: 20, onboardingAnswered: 20, regularQueueTotal: 0, dataInicioPlano: "2026-01-01", provaData: "2026-12-31" })).toBe("start-trilha");
    expect(getOnboardingCompletionState({ onboardingTotal: 20, onboardingAnswered: 20, regularQueueTotal: 1, dataInicioPlano: null, provaData: null })).toBe(null);
    expect(getOnboardingCompletionState({ onboardingTotal: 20, onboardingAnswered: 19, regularQueueTotal: 0, dataInicioPlano: null, provaData: null })).toBe(null);
  });
});

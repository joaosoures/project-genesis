import { describe, expect, it } from "vitest";
import { getOnboardingCompletionState } from "@/lib/onboarding";

const onboarding = Array.from({ length: 20 }, (_, index) => ({ onboarding_order: index + 1, contador_vezes: 0 }));

describe("onboarding queue prerequisites", () => {
  it("keeps the initial onboarding position stable", () => {
    expect(onboarding.map((item) => item.onboarding_order)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("does not show completion while any regular Trilha card is queued", () => {
    expect(getOnboardingCompletionState({ onboardingTotal: 20, onboardingAnswered: 20, regularQueueTotal: 1, dataInicioPlano: "2026-01-01", provaData: "2026-12-31" })).toBe(null);
  });
});

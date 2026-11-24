export type OnboardingCompletionState = "needs-trilha-setup" | "start-trilha" | null;

export function getOnboardingCompletionState(input: {
  onboardingTotal: number;
  onboardingAnswered: number;
  regularQueueTotal: number;
  dataInicioPlano: string | null;
  provaData: string | null;
}): OnboardingCompletionState {
  if (input.onboardingTotal !== 20 || input.onboardingAnswered < 20 || input.regularQueueTotal > 0) return null;
  return input.dataInicioPlano && input.provaData ? "start-trilha" : "needs-trilha-setup";
}

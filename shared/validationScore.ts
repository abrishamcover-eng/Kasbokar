export type ValidationSignals = {
  problemEvidence: number;
  customerClarity: number;
  marketEvidence: number;
  valueClarity: number;
  revenueEvidence: number;
};

const clamp = (value: number) => Math.max(0, Math.min(100, value));

/**
 * Returns a readiness score, not a probability of success.
 * Each signal is intentionally capped so one strong area cannot hide a risky gap.
 */
export function calculateValidationScore(signals: ValidationSignals): number {
  const weights = {
    problemEvidence: 0.24,
    customerClarity: 0.18,
    marketEvidence: 0.18,
    valueClarity: 0.18,
    revenueEvidence: 0.22,
  } as const;

  const score = Object.entries(weights).reduce((total, [key, weight]) => {
    const value = clamp(signals[key as keyof ValidationSignals]);
    return total + value * weight;
  }, 0);

  return Math.round(score);
}

export function validationLabel(score: number): string {
  if (score < 40) return "نیازمند شواهد بیشتر";
  if (score < 70) return "آماده طراحی آزمایش";
  return "قابل آزمایش در بازار";
}

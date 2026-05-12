export const WEEKS_PER_MONTH = 4.33;

export type AffordabilityInput = {
  hourlyWage: number;
  hoursPerWeek: number;
  monthlyCost: number;
};

export type AffordabilityResult = {
  monthlyIncome: number;
  affordabilityGap: number;
  coverageRatio: number;
  affordabilityScore: number;
};

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function calculateMonthlyIncome(hourlyWage: number, hoursPerWeek: number) {
  if (!Number.isFinite(hourlyWage) || !Number.isFinite(hoursPerWeek)) {
    throw new Error("Inputs must be finite numbers");
  }

  if (hourlyWage < 0 || hoursPerWeek < 0) {
    throw new Error("Inputs must be non-negative numbers");
  }

  return round(hourlyWage * hoursPerWeek * WEEKS_PER_MONTH);
}

export function calculateAffordability({
  hourlyWage,
  hoursPerWeek,
  monthlyCost,
}: AffordabilityInput): AffordabilityResult {
  if (monthlyCost <= 0) {
    throw new Error("Monthly cost must be greater than zero");
  }

  const monthlyIncome = calculateMonthlyIncome(hourlyWage, hoursPerWeek);
  const affordabilityGap = round(monthlyIncome - monthlyCost);
  const coverageRatio = round(monthlyIncome / monthlyCost, 4);
  const affordabilityScore = round(Math.min(200, Math.max(0, coverageRatio * 100)), 2);

  return {
    monthlyIncome,
    affordabilityGap,
    coverageRatio,
    affordabilityScore,
  };
}

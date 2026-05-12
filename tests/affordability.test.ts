import assert from "node:assert/strict";
import test from "node:test";
import { calculateAffordability, calculateMonthlyIncome } from "@/lib/affordability";

test("calculateMonthlyIncome uses 4.33 weeks per month", () => {
  const monthlyIncome = calculateMonthlyIncome(20, 40);
  assert.equal(monthlyIncome, 3464);
});

test("calculateAffordability returns deterministic outputs", () => {
  const result = calculateAffordability({
    hourlyWage: 20,
    hoursPerWeek: 40,
    monthlyCost: 3000,
  });

  assert.equal(result.monthlyIncome, 3464);
  assert.equal(result.affordabilityGap, 464);
  assert.equal(result.coverageRatio, 1.1547);
  assert.equal(result.affordabilityScore, 115.47);
});

test("calculateAffordability rejects invalid monthly costs", () => {
  assert.throws(
    () =>
      calculateAffordability({
        hourlyWage: 20,
        hoursPerWeek: 40,
        monthlyCost: 0,
      }),
    /Monthly cost must be greater than zero/
  );
});

test("calculateMonthlyIncome rejects negative values", () => {
  assert.throws(() => calculateMonthlyIncome(-1, 40), /non-negative/);
  assert.throws(() => calculateMonthlyIncome(20, -5), /non-negative/);
});

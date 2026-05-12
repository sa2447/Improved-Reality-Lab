# Compare API Contract

Endpoint: POST /api/compare

## Request body

{
  "states": ["NY", "NJ"],
  "hoursPerWeek": 40,
  "mode": "minimum_wage",
  "hourlyWage": 25,
  "datasetVersionId": 3
}

Notes:
- mode minimum_wage ignores hourlyWage.
- mode custom requires hourlyWage.
- mode profile requires authenticated user profile with hourlyWage or salary.

## Response highlights
- datasetVersionId
- formulas and constants
- states[] with monthlyCost, monthlyIncome, affordabilityGap, coverageRatio
- chartData with label and series arrays

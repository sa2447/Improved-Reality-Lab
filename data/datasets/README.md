# Dataset Input Format

Place importable dataset JSON files in this directory.

## Required top-level shape

{
  "sourceName": "string",
  "sourceUrl": "string",
  "effectiveDate": "YYYY-MM-DD",
  "states": [
    {
      "stateCode": "NY",
      "housing": 2400,
      "food": 750,
      "transportation": 420,
      "healthcare": 380,
      "utilities": 290,
      "taxes": 510,
      "minimumWage": 16.5,
      "livingWage": 28.25
    }
  ]
}

## Notes
- stateCode must be two uppercase letters.
- All numeric fields must be finite and non-negative.
- Import creates a new dataset version and upserts state rows by dataset version and state code.

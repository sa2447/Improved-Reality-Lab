import { auth } from "@/auth";
import { db } from "@/lib/db";
import { calculateAffordability, WEEKS_PER_MONTH } from "@/lib/affordability";
import { z } from "zod";

const compareSchema = z
  .object({
    states: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1).max(10),
    hoursPerWeek: z.number().positive().max(100).default(40),
    mode: z.enum(["minimum_wage", "custom", "profile"]).default("minimum_wage"),
    hourlyWage: z.number().nonnegative().optional(),
    datasetVersionId: z.number().int().positive().optional(),
  })
  .superRefine((payload, ctx) => {
    if (payload.mode === "custom" && payload.hourlyWage === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["hourlyWage"],
        message: "hourlyWage is required when mode is custom",
      });
    }
  });

export type ComparePayload = z.infer<typeof compareSchema>;

type CompareStateResult = {
  stateCode: string;
  monthlyCost: number;
  hourlyWageUsed: number;
  monthlyIncome: number;
  affordabilityGap: number;
  coverageRatio: number;
  affordabilityScore: number;
  costBreakdown: {
    housing: number;
    food: number;
    transportation: number;
    healthcare: number;
    utilities: number;
    taxes: number;
  };
};

const toNumber = (value: unknown) => Number(value ?? 0);

function normalizeStates(states: string[]) {
  return [...new Set(states.map((state) => state.trim().toUpperCase()))];
}

async function resolveDatasetVersionId(requested?: number) {
  if (requested) {
    const requestedVersion = await db.datasetVersion.findUnique({ where: { id: requested } });
    if (!requestedVersion) {
      throw new Error("Requested datasetVersionId was not found");
    }

    return requestedVersion.id;
  }

  const activeVersion = await db.datasetVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!activeVersion) {
    throw new Error("No active dataset version found");
  }

  return activeVersion.id;
}

async function resolveProfileHourlyWage() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Authentication required for profile mode");
  }

  const profile = await db.userProfile.findUnique({ where: { userId } });
  if (!profile) {
    throw new Error("User profile not found");
  }

  if (profile.hourlyWage) {
    return toNumber(profile.hourlyWage);
  }

  if (profile.salary) {
    return toNumber(profile.salary) / 2080;
  }

  throw new Error("Profile needs hourlyWage or salary for profile mode");
}

export async function compareStates(rawPayload: unknown) {
  const parsed = compareSchema.parse(rawPayload);
  const datasetVersionId = await resolveDatasetVersionId(parsed.datasetVersionId);
  const states = normalizeStates(parsed.states);

  const profiles = await db.stateCostProfile.findMany({
    where: {
      datasetVersionId,
      stateCode: { in: states },
    },
    orderBy: { stateCode: "asc" },
  });

  if (profiles.length !== states.length) {
    const found = new Set(profiles.map((profile) => profile.stateCode));
    const missing = states.filter((state) => !found.has(state));
    throw new Error(`Missing state data for: ${missing.join(", ")}`);
  }

  const profileHourlyWage =
    parsed.mode === "profile" ? await resolveProfileHourlyWage() : undefined;

  const stateResults: CompareStateResult[] = profiles.map((profile) => {
    const monthlyCost =
      toNumber(profile.housing) +
      toNumber(profile.food) +
      toNumber(profile.transportation) +
      toNumber(profile.healthcare) +
      toNumber(profile.utilities) +
      toNumber(profile.taxes);

    const hourlyWageUsed =
      parsed.mode === "minimum_wage"
        ? toNumber(profile.minimumWage)
        : parsed.mode === "custom"
          ? toNumber(parsed.hourlyWage)
          : toNumber(profileHourlyWage);

    const affordability = calculateAffordability({
      hourlyWage: hourlyWageUsed,
      hoursPerWeek: parsed.hoursPerWeek,
      monthlyCost,
    });

    return {
      stateCode: profile.stateCode,
      monthlyCost,
      hourlyWageUsed,
      monthlyIncome: affordability.monthlyIncome,
      affordabilityGap: affordability.affordabilityGap,
      coverageRatio: affordability.coverageRatio,
      affordabilityScore: affordability.affordabilityScore,
      costBreakdown: {
        housing: toNumber(profile.housing),
        food: toNumber(profile.food),
        transportation: toNumber(profile.transportation),
        healthcare: toNumber(profile.healthcare),
        utilities: toNumber(profile.utilities),
        taxes: toNumber(profile.taxes),
      },
    };
  });

  return {
    datasetVersionId,
    mode: parsed.mode,
    hoursPerWeek: parsed.hoursPerWeek,
    formulas: {
      monthlyIncome: "hourly_wage * hours_per_week * 4.33",
      monthlyCost:
        "housing + food + transportation + healthcare + utilities + taxes",
      affordabilityGap: "monthly_income - monthly_cost",
      coverageRatio: "monthly_income / monthly_cost",
    },
    constants: {
      weeksPerMonth: WEEKS_PER_MONTH,
    },
    states: stateResults,
    chartData: {
      labels: stateResults.map((state) => state.stateCode),
      coverageRatioSeries: stateResults.map((state) => state.coverageRatio),
      affordabilityGapSeries: stateResults.map((state) => state.affordabilityGap),
      monthlyCostSeries: stateResults.map((state) => state.monthlyCost),
      monthlyIncomeSeries: stateResults.map((state) => state.monthlyIncome),
    },
  };
}

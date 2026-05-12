import crypto from "node:crypto";
import { auth } from "@/auth";
import { db } from "@/lib/db";
import { compareStates } from "@/lib/compare-service";
import { z } from "zod";

const userProfileSchema = z.object({
  hourlyWage: z.number().nonnegative().optional(),
  annualSalary: z.number().nonnegative().optional(),
  hoursPerWeek: z.number().positive().max(100).optional(),
});

const chatRequestSchema = z.object({
  sessionId: z.string().min(6).optional(),
  message: z.string().min(1).max(5000),
  comparePayload: z.unknown().optional(),
  userProfile: userProfileSchema.optional(),
  datasetVersionId: z.number().int().positive().optional(),
});

const SYSTEM_PROMPT = `You are an affordability and cost-of-living assistant.
Use deterministic data and calculations only.
Do not invent statistics.
Do not provide speculative investing advice.
Summarize clearly and reference the provided numbers.`;

const GUEST_HOURLY_LIMIT = 20;
const USER_HOURLY_LIMIT = 100;
const CACHE_TTL_MINUTES = 30;
const PROMPT_LOGIC_VERSION = "v4";
const STATE_NAME_TO_CODE: Record<string, string> = {
  "alabama": "AL",
  "alaska": "AK",
  "arizona": "AZ",
  "arkansas": "AR",
  "california": "CA",
  "colorado": "CO",
  "connecticut": "CT",
  "delaware": "DE",
  "florida": "FL",
  "georgia": "GA",
  "hawaii": "HI",
  "idaho": "ID",
  "illinois": "IL",
  "indiana": "IN",
  "iowa": "IA",
  "kansas": "KS",
  "kentucky": "KY",
  "louisiana": "LA",
  "maine": "ME",
  "maryland": "MD",
  "massachusetts": "MA",
  "michigan": "MI",
  "minnesota": "MN",
  "mississippi": "MS",
  "missouri": "MO",
  "montana": "MT",
  "nebraska": "NE",
  "nevada": "NV",
  "new hampshire": "NH",
  "new jersey": "NJ",
  "new mexico": "NM",
  "new york": "NY",
  "north carolina": "NC",
  "north dakota": "ND",
  "ohio": "OH",
  "oklahoma": "OK",
  "oregon": "OR",
  "pennsylvania": "PA",
  "rhode island": "RI",
  "south carolina": "SC",
  "south dakota": "SD",
  "tennessee": "TN",
  "texas": "TX",
  "utah": "UT",
  "vermont": "VT",
  "virginia": "VA",
  "washington": "WA",
  "west virginia": "WV",
  "wisconsin": "WI",
  "wyoming": "WY",
  "district of columbia": "DC",
};

const STATE_CODE_SET = new Set(Object.values(STATE_NAME_TO_CODE));

type UserProfileInput = z.infer<typeof userProfileSchema>;

type FallbackAnswer = {
  text: string;
  comparison?: {
    primaryState: string | null;
    comparedStates: string[];
    affordabilityScore: number | null;
    comparisonData: Record<string, unknown>;
    chartData: Record<string, unknown>;
  };
};

function inferComparePayloadFromMessage(message: string, userProfile?: UserProfileInput) {
  const lower = message.toLowerCase();
  const states = new Set<string>();

  for (const [name, code] of Object.entries(STATE_NAME_TO_CODE)) {
    if (lower.includes(name)) {
      states.add(code);
    }
  }

  const explicitUpperRegex = /\b([A-Z]{2})\b/g;
  for (const match of message.matchAll(explicitUpperRegex)) {
    const code = match[1];
    if (STATE_CODE_SET.has(code)) {
      states.add(code);
    }
  }

  // Support lowercase code prompts like "... is ny" while avoiding false positives like "or".
  const contextualLowerRegex = /(?:\bis\b|\bin\b|\bfor\b|\bvs\b|\bversus\b|\bbetween\b)\s+([a-z]{2})\b/g;
  for (const match of lower.matchAll(contextualLowerRegex)) {
    const code = match[1].toUpperCase();
    if (STATE_CODE_SET.has(code)) {
      states.add(code);
    }
  }

  if (states.size === 0) {
    return null;
  }

  const hoursPerWeek = userProfile?.hoursPerWeek ?? 40;
  const derivedHourlyWage =
    userProfile?.hourlyWage ??
    (userProfile?.annualSalary !== undefined ? userProfile.annualSalary / 2080 : undefined);

  return {
    states: Array.from(states),
    mode: derivedHourlyWage !== undefined ? ("custom" as const) : ("minimum_wage" as const),
    hourlyWage: derivedHourlyWage,
    hoursPerWeek,
  };
}

function normalizePrompt(input: string) {
  return input.trim().toLowerCase().replace(/\s+/g, " ");
}

function hashPrompt(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function nextExpiry(minutes: number) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function getOrCreateSession(sessionId: string, userId?: string) {
  const existing = await db.chatSession.findUnique({ where: { sessionId } });

  if (existing) {
    if (userId && existing.userId !== userId) {
      await db.chatSession.update({
        where: { id: existing.id },
        data: { userId },
      });
    }

    return db.chatSession.findUniqueOrThrow({ where: { sessionId } });
  }

  return db.chatSession.create({
    data: {
      sessionId,
      userId,
    },
  });
}

async function enforceUsageCap(chatSessionId: string, userId?: string) {
  const cutoff = new Date(Date.now() - 60 * 60 * 1000);

  const where = userId
    ? { userId, eventType: "chat_request", createdAt: { gte: cutoff } }
    : { chatSessionId, eventType: "chat_request", createdAt: { gte: cutoff } };

  const count = await db.usageEvent.count({ where });
  const limit = userId ? USER_HOURLY_LIMIT : GUEST_HOURLY_LIMIT;

  if (count >= limit) {
    throw new Error("Rate limit exceeded");
  }
}

async function resolveDatasetVersionId(requested?: number) {
  if (requested) {
    const version = await db.datasetVersion.findUnique({ where: { id: requested } });
    if (!version) {
      throw new Error("dataset version not found");
    }

    return version.id;
  }

  const active = await db.datasetVersion.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
  });

  if (!active) {
    throw new Error("no active dataset version available");
  }

  return active.id;
}

async function getCachedResponse(promptHash: string, datasetVersionId: number) {
  return db.aiResponseCache.findFirst({
    where: {
      promptHash,
      datasetVersionId,
      expiresAt: { gt: new Date() },
    },
  });
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

function describeAffordabilityGap(affordabilityGap: number): string {
  const absoluteGap = Math.abs(affordabilityGap);

  if (affordabilityGap >= 0) {
    return `a positive affordability gap of ${formatCurrency(absoluteGap)} (monthly surplus)`;
  }

  return `a negative affordability gap of ${formatCurrency(absoluteGap)} (monthly shortfall)`;
}

function detectQuestionType(
  message: string,
): "minimum_wage" | "cost_of_living" | "coverage_ratio" | "affordability" | "general" {
  const lower = message.toLowerCase();

  if (lower.includes("affordable") || lower.includes("affordability") || lower.includes("how affordable")) {
    return "affordability";
  }

  if (lower.includes("coverage ratio")) return "coverage_ratio";
  if (lower.includes("minimum wage")) return "minimum_wage";
  if (lower.includes("cost") || lower.includes("expensive")) return "cost_of_living";

  return "general";
}

async function buildFallbackAnswer(
  message: string,
  comparePayload?: unknown,
  userProfile?: UserProfileInput,
): Promise<FallbackAnswer> {
  const resolvedComparePayload = comparePayload ?? inferComparePayloadFromMessage(message, userProfile);

  if (!resolvedComparePayload) {
    return {
      text: "I can help explain affordability comparisons. Mention one or more states (for example NJ or New Jersey) to get deterministic results.",
    };
  }

  const compare = await compareStates(resolvedComparePayload);
  const questionType = detectQuestionType(message);
  const isSingleState = compare.states.length === 1;

  const sortedByCoverage = [...compare.states].sort((a, b) => b.coverageRatio - a.coverageRatio);
  const winner = sortedByCoverage[0];
  const comparison = {
    primaryState: isSingleState ? compare.states[0].stateCode : winner?.stateCode ?? null,
    comparedStates: compare.states.map((s) => s.stateCode),
    affordabilityScore: winner?.affordabilityScore ?? null,
    comparisonData: {
      message,
      questionType,
      mode: compare.mode,
      hoursPerWeek: compare.hoursPerWeek,
      datasetVersionId: compare.datasetVersionId,
      states: compare.states,
    },
    chartData: compare.chartData as Record<string, unknown>,
  };

  if (isSingleState) {
    const only = compare.states[0];

    if (questionType === "minimum_wage") {
      return {
        text: `Minimum wage in ${only.stateCode} is ${formatCurrency(only.hourlyWageUsed)}/hour.`,
        comparison,
      };
    }

    if (questionType === "cost_of_living") {
      return {
        text: `Average monthly cost of living in ${only.stateCode} is ${formatCurrency(only.monthlyCost)}.`,
        comparison,
      };
    }

    if (questionType === "coverage_ratio") {
      return {
        text: `Coverage ratio in ${only.stateCode} is ${only.coverageRatio.toFixed(2)}.`,
        comparison,
      };
    }

    if (questionType === "affordability") {
      return {
        text: `${only.stateCode} affordability at ${formatCurrency(only.hourlyWageUsed)}/hour is: coverage ratio ${only.coverageRatio.toFixed(2)} with ${describeAffordabilityGap(only.affordabilityGap)}.`,
        comparison,
      };
    }

    return {
      text: [
        `${only.stateCode} has an estimated monthly cost of ${formatCurrency(only.monthlyCost)}.`,
        `Wage used: ${formatCurrency(only.hourlyWageUsed)}/hour, monthly income: ${formatCurrency(only.monthlyIncome)} at ${compare.hoursPerWeek} hours/week.`,
        `Affordability gap: ${formatCurrency(only.affordabilityGap)}, Coverage ratio: ${only.coverageRatio.toFixed(2)}.`,
      ].join(" "),
      comparison,
    };
  }

  if (questionType === "coverage_ratio") {
    return {
      text: `Highest coverage ratio is ${winner.stateCode} (${winner.coverageRatio.toFixed(2)}). Ratios: ${sortedByCoverage
        .map((s) => `${s.stateCode}: ${s.coverageRatio.toFixed(2)}`)
        .join(", ")}.`,
      comparison,
    };
  }

  if (questionType === "minimum_wage") {
    return {
      text: compare.states.map((s) => `${s.stateCode}: ${formatCurrency(s.hourlyWageUsed)}/hour`).join(", "),
      comparison,
    };
  }

  if (questionType === "cost_of_living") {
    return {
      text: compare.states.map((s) => `${s.stateCode}: ${formatCurrency(s.monthlyCost)}/month`).join(", "),
      comparison,
    };
  }

  if (questionType === "affordability") {
    return {
      text: `Most affordable by coverage ratio is ${winner.stateCode} (${winner.coverageRatio.toFixed(2)}). Details: ${sortedByCoverage
        .map((s) => `${s.stateCode}: ${describeAffordabilityGap(s.affordabilityGap)}, ratio ${s.coverageRatio.toFixed(2)}`)
        .join(", ")}.`,
      comparison,
    };
  }

  return {
    text: [
      `Compared ${compare.states.length} states.`,
      `Highest coverage ratio: ${winner.stateCode} at ${winner.coverageRatio.toFixed(2)}.`,
      `${winner.stateCode} monthly cost: ${formatCurrency(winner.monthlyCost)}, wage used: ${formatCurrency(winner.hourlyWageUsed)}/hour.`,
    ].join(" "),
    comparison,
  };
}

async function buildOpenAIAnswer(message: string, comparePayload?: unknown) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const compareContext = comparePayload ? JSON.stringify(await compareStates(comparePayload)) : "{}";

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `User question: ${message}\nContext: ${compareContext}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  return body.choices?.[0]?.message?.content ?? null;
}

export async function migrateSessionToUser(sessionId: string) {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Authentication required");
  }

  const updated = await db.chatSession.updateMany({
    where: { sessionId },
    data: { userId },
  });

  return { updatedCount: updated.count };
}

export async function sendChat(rawPayload: unknown) {
  const payload = chatRequestSchema.parse(rawPayload);
  const session = await auth();
  const userId = session?.user?.id;
  const sessionId = payload.sessionId ?? crypto.randomUUID();
  const chatSession = await getOrCreateSession(sessionId, userId);
  const datasetVersionId = await resolveDatasetVersionId(payload.datasetVersionId);

  await enforceUsageCap(chatSession.id, userId);

  const normalizedPrompt = normalizePrompt(payload.message);
  const profileSignature = JSON.stringify({
    hourlyWage: payload.userProfile?.hourlyWage,
    annualSalary: payload.userProfile?.annualSalary,
    hoursPerWeek: payload.userProfile?.hoursPerWeek,
  });
  const promptHash = hashPrompt(
    `${PROMPT_LOGIC_VERSION}:${datasetVersionId}:${normalizedPrompt}:${profileSignature}`,
  );
  const cached = await getCachedResponse(promptHash, datasetVersionId);
  const inferredComparePayload = payload.comparePayload ?? inferComparePayloadFromMessage(payload.message, payload.userProfile);

  await db.chatMessage.create({
    data: {
      sessionId: chatSession.id,
      role: "user",
      content: payload.message,
    },
  });

  let assistantMessage = "";
  let cacheHit = false;
  let comparison: FallbackAnswer["comparison"] | undefined;

  if (cached) {
    cacheHit = true;
    assistantMessage = String((cached.responsePayload as { text?: string })?.text ?? "");

    if (inferredComparePayload) {
      const fallback = await buildFallbackAnswer(payload.message, inferredComparePayload, payload.userProfile);
      comparison = fallback.comparison;
    }
  } else {
    const shouldUseDeterministic = Boolean(inferredComparePayload);

    const aiAnswer = shouldUseDeterministic
      ? null
      : await buildOpenAIAnswer(payload.message, payload.comparePayload);

    if (aiAnswer) {
      assistantMessage = aiAnswer;
    } else {
      const fallback = await buildFallbackAnswer(payload.message, inferredComparePayload, payload.userProfile);
      assistantMessage = fallback.text;
      comparison = fallback.comparison;
    }

    await db.aiResponseCache.create({
      data: {
        datasetVersionId,
        promptHash,
        normalizedPrompt,
        responsePayload: { text: assistantMessage },
        expiresAt: nextExpiry(CACHE_TTL_MINUTES),
      },
    });
  }

  const assistantRecord = await db.chatMessage.create({
    data: {
      sessionId: chatSession.id,
      role: "assistant",
      content: assistantMessage,
    },
  });

  await db.usageEvent.create({
    data: {
      userId,
      chatSessionId: chatSession.id,
      eventType: "chat_request",
      metadata: {
        cacheHit,
        datasetVersionId,
      },
    },
  });

  const messages = await db.chatMessage.findMany({
    where: { sessionId: chatSession.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  });

  return {
    sessionId,
    datasetVersionId,
    cacheHit,
    assistantMessage,
    assistantMessageId: assistantRecord.id,
    comparison,
    messages,
  };
}

export async function getChatHistory(sessionId: string) {
  const chatSession = await db.chatSession.findUnique({
    where: { sessionId },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  });

  if (!chatSession) {
    throw new Error("Chat session not found");
  }

  return {
    sessionId: chatSession.sessionId,
    userId: chatSession.userId,
    startedAt: chatSession.startedAt,
    messages: chatSession.messages,
  };
}

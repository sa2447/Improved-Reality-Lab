import { auth } from "@/auth";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  primaryState: z.string().regex(/^[A-Z]{2}$/).optional(),
  comparedStates: z.array(z.string().regex(/^[A-Z]{2}$/)).min(1),
  affordabilityScore: z.number().finite().optional(),
  datasetVersionId: z.number().int().positive().optional(),
  comparisonData: z.record(z.string(), z.unknown()),
  chartData: z.record(z.string(), z.unknown()),
});

const renameSchema = z.object({
  name: z.string().min(1).max(120),
});

function toJsonValue(value: Record<string, unknown>): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

async function requireUserId() {
  const session = await auth();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  return userId;
}

export async function createSavedComparison(rawPayload: unknown) {
  const userId = await requireUserId();
  const payload = createSchema.parse(rawPayload);

  const record = await db.savedComparison.create({
    data: {
      userId,
      name: payload.name ?? payload.primaryState ?? payload.comparedStates.join(" vs "),
      primaryState: payload.primaryState,
      comparedStates: payload.comparedStates,
      affordabilityScore: payload.affordabilityScore,
      datasetVersionId: payload.datasetVersionId,
      comparisonData: toJsonValue(payload.comparisonData),
      chartData: toJsonValue(payload.chartData),
    },
  });

  return record;
}

export async function listSavedComparisons(sort: "createdAt" | "affordabilityScore") {
  const userId = await requireUserId();

  return db.savedComparison.findMany({
    where: { userId },
    orderBy:
      sort === "affordabilityScore"
        ? { affordabilityScore: "desc" }
        : { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      primaryState: true,
      comparedStates: true,
      affordabilityScore: true,
      createdAt: true,
    },
  });
}

export async function getSavedComparison(id: string) {
  const userId = await requireUserId();

  const record = await db.savedComparison.findFirst({
    where: { id, userId },
  });

  if (!record) {
    throw new Error("Not found");
  }

  return record;
}

export async function renameSavedComparison(id: string, rawPayload: unknown) {
  const userId = await requireUserId();
  const payload = renameSchema.parse(rawPayload);

  const existing = await db.savedComparison.findFirst({ where: { id, userId } });
  if (!existing) {
    throw new Error("Not found");
  }

  return db.savedComparison.update({
    where: { id },
    data: { name: payload.name },
  });
}

export async function deleteSavedComparison(id: string) {
  const userId = await requireUserId();
  const existing = await db.savedComparison.findFirst({ where: { id, userId } });

  if (!existing) {
    throw new Error("Not found");
  }

  await db.savedComparison.delete({ where: { id } });
  return { deleted: true };
}

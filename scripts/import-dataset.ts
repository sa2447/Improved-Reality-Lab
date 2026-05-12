import "dotenv/config";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { datasetSchema } from "./dataset-schema";

const connectionString = process.env.DATABASE_URL;
const allowSelfSignedTls = process.env.PGSSL_ALLOW_SELF_SIGNED === "true";

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const pool = new Pool({
  connectionString,
  ...(allowSelfSignedTls ? { ssl: { rejectUnauthorized: false } } : {}),
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const inputPath = process.argv[2] ?? "data/datasets/sample-state-costs.json";
  const absolutePath = resolve(process.cwd(), inputPath);

  const raw = await readFile(absolutePath, "utf8");
  const parsed = datasetSchema.parse(JSON.parse(raw));

  await prisma.$transaction(async (tx) => {
    await tx.datasetVersion.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const datasetVersion = await tx.datasetVersion.create({
      data: {
        sourceName: parsed.sourceName,
        sourceUrl: parsed.sourceUrl,
        effectiveDate: new Date(parsed.effectiveDate),
        isActive: true,
      },
    });

    for (const state of parsed.states) {
      await tx.stateCostProfile.upsert({
        where: {
          datasetVersionId_stateCode: {
            datasetVersionId: datasetVersion.id,
            stateCode: state.stateCode,
          },
        },
        update: {
          ...state,
        },
        create: {
          datasetVersionId: datasetVersion.id,
          ...state,
        },
      });
    }

    console.log(`Imported dataset version ${datasetVersion.id}`);
    console.log(`States imported: ${parsed.states.length}`);
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });

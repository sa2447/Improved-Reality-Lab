import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "../src/lib/auth/password";

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

async function seedAdminUser() {
  const email = "demo@example.com";
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return;
  }

  const passwordHash = await hashPassword("demo12345");
  await prisma.user.create({
    data: {
      email,
      passwordHash,
      profile: {
        create: {},
      },
    },
  });
}

async function seedDataset() {
  const existing = await prisma.datasetVersion.findFirst({
    where: { sourceName: "seed-sample" },
  });

  if (existing) {
    return;
  }

  const datasetVersion = await prisma.datasetVersion.create({
    data: {
      sourceName: "seed-sample",
      sourceUrl: "local://seed",
      effectiveDate: new Date("2026-01-01T00:00:00.000Z"),
      isActive: true,
    },
  });

  const sampleStates = [
    {
      stateCode: "NY",
      housing: 2400,
      food: 750,
      transportation: 420,
      healthcare: 380,
      utilities: 290,
      taxes: 510,
      minimumWage: 16.5,
      livingWage: 28.25,
    },
    {
      stateCode: "NJ",
      housing: 2100,
      food: 700,
      transportation: 390,
      healthcare: 360,
      utilities: 260,
      taxes: 460,
      minimumWage: 15.49,
      livingWage: 25.4,
    },
    {
      stateCode: "CT",
      housing: 1900,
      food: 670,
      transportation: 340,
      healthcare: 350,
      utilities: 250,
      taxes: 430,
      minimumWage: 15.69,
      livingWage: 24.15,
    },
  ];

  for (const state of sampleStates) {
    await prisma.stateCostProfile.upsert({
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
}

async function main() {
  await seedAdminUser();
  await seedDataset();
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

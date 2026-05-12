import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var prisma: PrismaClient | undefined;
  var prismaPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
const allowSelfSignedTls = process.env.PGSSL_ALLOW_SELF_SIGNED === "true";

if (!connectionString) {
  throw new Error(
    "DATABASE_URL environment variable is not set. " +
    "Copy .env.example to .env and set the correct value, or pass it via Docker Compose."
  );
}

const pool =
  global.prismaPool ??
  new Pool({
    connectionString,
    ...(allowSelfSignedTls ? { ssl: { rejectUnauthorized: false } } : {}),
  });

const adapter = new PrismaPg(pool);

export const db =
  global.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prismaPool = pool;
  global.prisma = db;
}

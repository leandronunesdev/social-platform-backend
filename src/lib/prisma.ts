import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env or pass it when running the app."
  );
}

// RDS and other cloud Postgres often need SSL; strict cert validation can cause "User was denied access" (P1010)
const isRds = connectionString.includes("rds.amazonaws.com");
const adapterConfig = isRds
  ? { connectionString, ssl: { rejectUnauthorized: false } as const }
  : { connectionString };

const adapter = new PrismaPg(adapterConfig);
export const prisma = new PrismaClient({ adapter });

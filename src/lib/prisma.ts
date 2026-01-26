import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Add it to .env or pass it when running the app."
  );
}

const adapter = new PrismaPg({ connectionString });
export const prisma = new PrismaClient({ adapter });

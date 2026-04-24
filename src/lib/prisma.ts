import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.startsWith("postgresql://") && !url.startsWith("postgres://")) {
    throw new Error(
      "DATABASE_URL must be a PostgreSQL URL (postgresql://...). " +
        "Set it in .env locally and in Vercel → Project Settings → Environment Variables for production. " +
        "Get a free Postgres URL from Neon, Vercel Postgres, or Supabase."
    );
  }
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const client = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
  globalForPrisma.prisma = client;
  return client;
}

/** Lazy-initialized so Vercel build succeeds even when DATABASE_URL is not set at build time. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return (getPrisma() as unknown as Record<string | symbol, unknown>)[prop];
  },
});

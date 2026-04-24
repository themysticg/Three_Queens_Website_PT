#!/usr/bin/env node
/**
 * Run prisma migrate deploy only when it is safe to do so.
 *
 * Why skip on Vercel by default?
 * - Vercel builds can fail if another deploy/process temporarily holds Prisma's advisory lock.
 * - Deploying the app and applying migrations are safer as separate steps in this project.
 *
 * To force migrations during a build, set PRISMA_RUN_MIGRATE_DURING_BUILD=1.
 */
const { execSync } = require("node:child_process");

const url = process.env.DATABASE_URL || "";
const isPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");
const isVercelBuild = process.env.VERCEL === "1";
const forceBuildMigrate = process.env.PRISMA_RUN_MIGRATE_DURING_BUILD === "1";

if (!isPostgres) {
  console.warn(
    "Skipping prisma migrate deploy: DATABASE_URL must start with postgresql:// or postgres://. Set it in .env (and on Vercel) to deploy."
  );
  process.exit(0);
}

if (isVercelBuild && !forceBuildMigrate) {
  console.warn(
    "Skipping prisma migrate deploy during Vercel build to avoid advisory lock timeouts. Run `npx prisma migrate deploy` separately against production when schema changes are added."
  );
  process.exit(0);
}

execSync("npx prisma migrate deploy", { stdio: "inherit" });

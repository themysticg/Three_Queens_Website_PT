import { prisma } from "@/lib/prisma";

let ruleSchemaEnsured = false;

/**
 * Creates RuleCategory / RuleSection tables when missing (e.g. migrate not run yet).
 * Matches prisma/migrations/20260326120000_add_rule_categories/migration.sql — idempotent.
 */
export async function ensureRuleTables(): Promise<void> {
  if (ruleSchemaEnsured) return;

  try {
    await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "RuleCategory" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleCategory_pkey" PRIMARY KEY ("id")
);
`);

    await prisma.$executeRawUnsafe(`
CREATE TABLE IF NOT EXISTS "RuleSection" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RuleSection_pkey" PRIMARY KEY ("id")
);
`);

    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "RuleCategory_sortOrder_idx" ON "RuleCategory"("sortOrder");`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "RuleSection_categoryId_idx" ON "RuleSection"("categoryId");`
    );
    await prisma.$executeRawUnsafe(
      `CREATE INDEX IF NOT EXISTS "RuleSection_categoryId_sortOrder_idx" ON "RuleSection"("categoryId", "sortOrder");`
    );

    await prisma.$executeRawUnsafe(`
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'RuleSection_categoryId_fkey'
  ) THEN
    ALTER TABLE "RuleSection" ADD CONSTRAINT "RuleSection_categoryId_fkey"
      FOREIGN KEY ("categoryId") REFERENCES "RuleCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
`);

    ruleSchemaEnsured = true;
  } catch (error) {
    console.error("[ensureRuleTables] Failed to ensure rule tables:", error);
  }
}

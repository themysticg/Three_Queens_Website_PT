-- Add jobId to FormQuestion for per-job question sets
ALTER TABLE "FormQuestion" ADD COLUMN "jobId" TEXT NOT NULL DEFAULT '';

-- Drop old unique constraint
ALTER TABLE "FormQuestion" DROP CONSTRAINT IF EXISTS "FormQuestion_formType_questionKey_key";

-- Add new unique constraint including jobId
ALTER TABLE "FormQuestion" ADD CONSTRAINT "FormQuestion_formType_questionKey_jobId_key" UNIQUE ("formType", "questionKey", "jobId");

-- Update index
DROP INDEX IF EXISTS "FormQuestion_formType_isActive_sortOrder_idx";
CREATE INDEX "FormQuestion_formType_jobId_isActive_sortOrder_idx" ON "FormQuestion"("formType", "jobId", "isActive", "sortOrder");

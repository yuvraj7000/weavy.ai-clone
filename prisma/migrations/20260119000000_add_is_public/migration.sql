-- AlterTable
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "workflows_is_public_idx" ON "workflows"("is_public");


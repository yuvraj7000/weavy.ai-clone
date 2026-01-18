-- AlterTable
ALTER TABLE "workflows" ADD COLUMN IF NOT EXISTS "execution_logs" JSONB NOT NULL DEFAULT '[]';


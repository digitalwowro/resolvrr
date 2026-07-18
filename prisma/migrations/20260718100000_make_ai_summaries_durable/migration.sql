DROP INDEX IF EXISTS "AiSummaryCache_helpdeskConnectionId_expiresAt_idx";

ALTER TABLE "AiSummaryCache"
DROP COLUMN "expiresAt";

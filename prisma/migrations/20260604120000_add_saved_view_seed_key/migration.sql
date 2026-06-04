ALTER TABLE "SavedView" ADD COLUMN "seedKey" TEXT;

CREATE INDEX "SavedView_helpdeskConnectionId_seedKey_idx" ON "SavedView"("helpdeskConnectionId", "seedKey");

CREATE TABLE "AiSummaryCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT NOT NULL,
    "providerTicketId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "providerProtocol" TEXT NOT NULL,
    "modelFingerprint" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "sanitizationVersion" TEXT NOT NULL,
    "sourceFingerprint" TEXT NOT NULL,
    "sourceTicketNumber" TEXT NOT NULL,
    "sourceTicketUpdatedAt" TIMESTAMP(3),
    "sourceArticleCount" INTEGER NOT NULL,
    "encryptedSummary" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiSummaryCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_summary_cache_identity" ON "AiSummaryCache"("userId", "helpdeskConnectionId", "providerTicketId", "operation", "providerProtocol", "modelFingerprint", "promptVersion", "sanitizationVersion", "sourceFingerprint");
CREATE INDEX "AiSummaryCache_helpdeskConnectionId_expiresAt_idx" ON "AiSummaryCache"("helpdeskConnectionId", "expiresAt");
CREATE INDEX "AiSummaryCache_userId_helpdeskConnectionId_providerTicketId_idx" ON "AiSummaryCache"("userId", "helpdeskConnectionId", "providerTicketId");

ALTER TABLE "AiSummaryCache" ADD CONSTRAINT "AiSummaryCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AiSummaryCache" ADD CONSTRAINT "AiSummaryCache_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

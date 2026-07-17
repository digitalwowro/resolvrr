-- Persist per-user taskbar synchronization state and retryable local intent.

CREATE TYPE "TaskbarSyncCompatibility" AS ENUM ('UNKNOWN', 'SUPPORTED', 'UNSUPPORTED');
CREATE TYPE "TaskbarSyncOperationKind" AS ENUM ('OPEN', 'CLOSE', 'ACTIVATE', 'REORDER');

CREATE TABLE "TaskbarSyncState" (
  "id" TEXT NOT NULL,
  "helpdeskConnectionId" TEXT NOT NULL,
  "identityVersion" TEXT NOT NULL,
  "compatibility" "TaskbarSyncCompatibility" NOT NULL DEFAULT 'UNKNOWN',
  "contractVersion" TEXT,
  "initializedAt" TIMESTAMP(3),
  "lastSynchronizedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskbarSyncState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TaskbarSyncOperation" (
  "id" TEXT NOT NULL,
  "taskbarSyncStateId" TEXT NOT NULL,
  "dedupeKey" TEXT NOT NULL,
  "kind" "TaskbarSyncOperationKind" NOT NULL,
  "payloadJson" JSONB NOT NULL,
  "actionAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastErrorCode" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TaskbarSyncOperation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TaskbarSyncState_helpdeskConnectionId_key"
  ON "TaskbarSyncState"("helpdeskConnectionId");
CREATE UNIQUE INDEX "TaskbarSyncOperation_taskbarSyncStateId_dedupeKey_key"
  ON "TaskbarSyncOperation"("taskbarSyncStateId", "dedupeKey");
CREATE INDEX "TaskbarSyncOperation_taskbarSyncStateId_nextAttemptAt_idx"
  ON "TaskbarSyncOperation"("taskbarSyncStateId", "nextAttemptAt");

ALTER TABLE "TaskbarSyncState" ADD CONSTRAINT "TaskbarSyncState_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TaskbarSyncOperation" ADD CONSTRAINT "TaskbarSyncOperation_taskbarSyncStateId_fkey"
  FOREIGN KEY ("taskbarSyncStateId") REFERENCES "TaskbarSyncState"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

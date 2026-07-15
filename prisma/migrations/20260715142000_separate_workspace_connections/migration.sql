-- Separate shared workspace configuration from each user's authenticated provider connection.

ALTER TABLE "HelpdeskConnection" RENAME TO "Workspace";
ALTER TABLE "Workspace" RENAME COLUMN "userId" TO "ownerUserId";
ALTER TABLE "Workspace" RENAME CONSTRAINT "HelpdeskConnection_pkey" TO "Workspace_pkey";
ALTER TABLE "Workspace" DROP CONSTRAINT "HelpdeskConnection_userId_fkey";
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_ownerUserId_fkey"
  FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER INDEX "HelpdeskConnection_userId_idx" RENAME TO "Workspace_ownerUserId_idx";
ALTER INDEX "HelpdeskConnection_providerKey_idx" RENAME TO "Workspace_providerKey_idx";

CREATE TABLE "HelpdeskConnection" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "HelpdeskConnectionStatus" NOT NULL DEFAULT 'DISCONNECTED',
  "providerIdentityExternalId" TEXT,
  "providerIdentityDisplayName" TEXT,
  "identityVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HelpdeskConnection_pkey" PRIMARY KEY ("id")
);

INSERT INTO "HelpdeskConnection" (
  "id", "workspaceId", "userId", "status", "identityVersion", "createdAt", "updatedAt"
)
SELECT
  "id", "id", "ownerUserId", 'DISCONNECTED', 'migrated-' || "id", "createdAt", CURRENT_TIMESTAMP
FROM "Workspace";

-- Workspace owners must remain workspace administrators even if legacy data was incomplete.
INSERT INTO "WorkspaceMembership" (
  "id", "userId", "helpdeskConnectionId", "role",
  "canEditMyStyle", "canEditAiRephraseStyleOverrides", "createdAt", "updatedAt"
)
SELECT
  'migrated-owner-' || w."id", w."ownerUserId", w."id", 'ADMIN', true, true,
  CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "Workspace" w
WHERE NOT EXISTS (
  SELECT 1 FROM "WorkspaceMembership" m
  WHERE m."userId" = w."ownerUserId" AND m."helpdeskConnectionId" = w."id"
);

UPDATE "WorkspaceMembership" m
SET "role" = 'ADMIN'
FROM "Workspace" w
WHERE m."userId" = w."ownerUserId" AND m."helpdeskConnectionId" = w."id";

DO $$
DECLARE non_owner_activity_count BIGINT;
BEGIN
  SELECT COUNT(*) INTO non_owner_activity_count
  FROM "ProviderMutationLog" log
  JOIN "Workspace" workspace ON workspace."id" = log."helpdeskConnectionId"
  WHERE log."userId" <> workspace."ownerUserId";
  RAISE NOTICE 'Resolvrr migration: % historical provider mutations were made by non-owner members', non_owner_activity_count;
END $$;

-- Historical writes belong to the retained workspace, not to the owner's new
-- personal connection. New writes may additionally reference their personal connection.
ALTER TABLE "ProviderMutationLog" DROP CONSTRAINT "ProviderMutationLog_helpdeskConnectionId_fkey";
ALTER TABLE "ProviderMutationLog" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "ProviderMutationLog" ADD COLUMN "helpdeskConnectionId" TEXT;
ALTER TABLE "ProviderMutationLog" ADD CONSTRAINT "ProviderMutationLog_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Provider-derived data created through a shared credential cannot cross the identity boundary.
DELETE FROM "TicketSnapshotCache";
DELETE FROM "ThreadSnapshotCache";
DELETE FROM "AiSummaryCache";

DELETE FROM "UiPreference" p
USING "Workspace" w
WHERE p."helpdeskConnectionId" = w."id"
  AND p."userId" <> w."ownerUserId"
  AND p."key" = 'workspace.openTabs';

DELETE FROM "SavedView" v
USING "Workspace" w
WHERE v."helpdeskConnectionId" = w."id"
  AND v."ownerUserId" <> w."ownerUserId"
  AND v."seedKey" = 'my-work';

UPDATE "UiPreference"
SET "key" = 'activeWorkspaceId'
WHERE "helpdeskConnectionId" IS NULL AND "key" = 'activeConnectionId';

-- Shared records continue to reference the retained workspace IDs.
ALTER TABLE "WorkspaceMembership" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "SavedView" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "UiPreference" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "WorkspaceAiSetting" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "UserWorkspaceAiSetting" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "WorkspaceAiPrompt" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "WorkspaceAiRephraseStyle" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "UserAiRephraseStyleOverride" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";
ALTER TABLE "WorkspaceMyStyle" RENAME COLUMN "helpdeskConnectionId" TO "workspaceId";

ALTER TABLE "WorkspaceMembership" RENAME CONSTRAINT "WorkspaceMembership_helpdeskConnectionId_fkey" TO "WorkspaceMembership_workspaceId_fkey";
ALTER TABLE "SavedView" RENAME CONSTRAINT "SavedView_helpdeskConnectionId_fkey" TO "SavedView_workspaceId_fkey";
ALTER TABLE "UiPreference" RENAME CONSTRAINT "UiPreference_helpdeskConnectionId_fkey" TO "UiPreference_workspaceId_fkey";
ALTER TABLE "WorkspaceAiSetting" RENAME CONSTRAINT "WorkspaceAiSetting_helpdeskConnectionId_fkey" TO "WorkspaceAiSetting_workspaceId_fkey";
ALTER TABLE "UserWorkspaceAiSetting" RENAME CONSTRAINT "UserWorkspaceAiSetting_helpdeskConnectionId_fkey" TO "UserWorkspaceAiSetting_workspaceId_fkey";
ALTER TABLE "WorkspaceAiPrompt" RENAME CONSTRAINT "WorkspaceAiPrompt_helpdeskConnectionId_fkey" TO "WorkspaceAiPrompt_workspaceId_fkey";
ALTER TABLE "WorkspaceAiRephraseStyle" RENAME CONSTRAINT "WorkspaceAiRephraseStyle_helpdeskConnectionId_fkey" TO "WorkspaceAiRephraseStyle_workspaceId_fkey";
ALTER TABLE "UserAiRephraseStyleOverride" RENAME CONSTRAINT "UserAiRephraseStyleOverride_helpdeskConnectionId_fkey" TO "UserAiRephraseStyleOverride_workspaceId_fkey";
ALTER TABLE "WorkspaceMyStyle" RENAME CONSTRAINT "WorkspaceMyStyle_helpdeskConnectionId_fkey" TO "WorkspaceMyStyle_workspaceId_fkey";

-- Retarget credential and provider-derived relations to the new personal connection table.
ALTER TABLE "ProviderCredential" DROP CONSTRAINT "ProviderCredential_helpdeskConnectionId_fkey";
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TicketSnapshotCache" DROP CONSTRAINT "TicketSnapshotCache_helpdeskConnectionId_fkey";
ALTER TABLE "TicketSnapshotCache" ADD CONSTRAINT "TicketSnapshotCache_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ThreadSnapshotCache" DROP CONSTRAINT "ThreadSnapshotCache_helpdeskConnectionId_fkey";
ALTER TABLE "ThreadSnapshotCache" ADD CONSTRAINT "ThreadSnapshotCache_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiSummaryCache" DROP CONSTRAINT "AiSummaryCache_helpdeskConnectionId_fkey";
ALTER TABLE "AiSummaryCache" ADD CONSTRAINT "AiSummaryCache_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProviderMutationLog" ADD CONSTRAINT "ProviderMutationLog_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "HelpdeskConnection" ADD CONSTRAINT "HelpdeskConnection_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HelpdeskConnection" ADD CONSTRAINT "HelpdeskConnection_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "HelpdeskConnection_workspaceId_userId_key"
  ON "HelpdeskConnection"("workspaceId", "userId");
CREATE UNIQUE INDEX "HelpdeskConnection_workspaceId_providerIdentityExternalId_key"
  ON "HelpdeskConnection"("workspaceId", "providerIdentityExternalId");
CREATE INDEX "HelpdeskConnection_userId_idx" ON "HelpdeskConnection"("userId");
CREATE INDEX "HelpdeskConnection_workspaceId_idx" ON "HelpdeskConnection"("workspaceId");

ALTER TABLE "Workspace" DROP COLUMN "status";

-- Rename shared-scope indexes to match their new meaning.
ALTER INDEX "WorkspaceMembership_userId_helpdeskConnectionId_key" RENAME TO "WorkspaceMembership_userId_workspaceId_key";
ALTER INDEX "WorkspaceMembership_helpdeskConnectionId_idx" RENAME TO "WorkspaceMembership_workspaceId_idx";
ALTER INDEX "SavedView_helpdeskConnectionId_idx" RENAME TO "SavedView_workspaceId_idx";
ALTER INDEX "SavedView_helpdeskConnectionId_seedKey_idx" RENAME TO "SavedView_workspaceId_seedKey_idx";
ALTER INDEX "UiPreference_userId_helpdeskConnectionId_key_key" RENAME TO "UiPreference_userId_workspaceId_key_key";
ALTER INDEX "UserWorkspaceAiSetting_userId_helpdeskConnectionId_key" RENAME TO "UserWorkspaceAiSetting_userId_workspaceId_key";
ALTER INDEX "UserWorkspaceAiSetting_helpdeskConnectionId_idx" RENAME TO "UserWorkspaceAiSetting_workspaceId_idx";
ALTER INDEX "WorkspaceAiPrompt_helpdeskConnectionId_promptKey_key" RENAME TO "WorkspaceAiPrompt_workspaceId_promptKey_key";
ALTER INDEX "WorkspaceAiPrompt_helpdeskConnectionId_idx" RENAME TO "WorkspaceAiPrompt_workspaceId_idx";
ALTER INDEX "WorkspaceMyStyle_userId_helpdeskConnectionId_key" RENAME TO "WorkspaceMyStyle_userId_workspaceId_key";
ALTER INDEX "WorkspaceMyStyle_helpdeskConnectionId_idx" RENAME TO "WorkspaceMyStyle_workspaceId_idx";
ALTER INDEX "WorkspaceAiRephraseStyle_helpdeskConnectionId_seedKey_key" RENAME TO "WorkspaceAiRephraseStyle_workspaceId_seedKey_key";
ALTER INDEX "WorkspaceAiRephraseStyle_helpdeskConnectionId_sortOrder_idx" RENAME TO "WorkspaceAiRephraseStyle_workspaceId_sortOrder_idx";
ALTER INDEX "UserAiRephraseStyleOverride_userId_helpdeskConnectionId_sty_key" RENAME TO "UserAiRephraseStyleOverride_userId_workspaceId_styleId_key";
ALTER INDEX "UserAiRephraseStyleOverride_helpdeskConnectionId_idx" RENAME TO "UserAiRephraseStyleOverride_workspaceId_idx";
ALTER INDEX "ProviderMutationLog_helpdeskConnectionId_createdAt_idx" RENAME TO "ProviderMutationLog_workspaceId_createdAt_idx";
CREATE INDEX "ProviderMutationLog_helpdeskConnectionId_createdAt_idx"
  ON "ProviderMutationLog"("helpdeskConnectionId", "createdAt");

-- Remove old generic user prompt overrides and global My Style data. This app is still in dev,
-- so old personalized prompt/style rows are intentionally discarded.
DROP TABLE IF EXISTS "UserAiPromptOverride";
DROP TABLE IF EXISTS "UserMyStyle";

ALTER TABLE "WorkspaceAiSetting" DROP COLUMN IF EXISTS "allowUserPromptOverrides";

CREATE TYPE "WorkspaceMembershipRole" AS ENUM ('ADMIN', 'AGENT');

CREATE TABLE "WorkspaceMembership" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "helpdeskConnectionId" TEXT NOT NULL,
  "role" "WorkspaceMembershipRole" NOT NULL DEFAULT 'AGENT',
  "canEditMyStyle" BOOLEAN NOT NULL DEFAULT false,
  "canEditAiRephraseStyleOverrides" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceMyStyle" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "helpdeskConnectionId" TEXT NOT NULL,
  "encryptedStyle" TEXT NOT NULL,
  "keyVersion" TEXT NOT NULL DEFAULT 'v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceMyStyle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceAiRephraseStyle" (
  "id" TEXT NOT NULL,
  "helpdeskConnectionId" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "seedKey" TEXT,
  "encryptedPrompt" TEXT,
  "keyVersion" TEXT NOT NULL DEFAULT 'v1',
  "sortOrder" INTEGER NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceAiRephraseStyle_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAiRephraseStyleOverride" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "helpdeskConnectionId" TEXT NOT NULL,
  "styleId" TEXT NOT NULL,
  "encryptedPrompt" TEXT NOT NULL,
  "keyVersion" TEXT NOT NULL DEFAULT 'v1',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UserAiRephraseStyleOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceMembership_userId_helpdeskConnectionId_key"
  ON "WorkspaceMembership"("userId", "helpdeskConnectionId");
CREATE INDEX "WorkspaceMembership_helpdeskConnectionId_idx"
  ON "WorkspaceMembership"("helpdeskConnectionId");

CREATE UNIQUE INDEX "WorkspaceMyStyle_userId_helpdeskConnectionId_key"
  ON "WorkspaceMyStyle"("userId", "helpdeskConnectionId");
CREATE INDEX "WorkspaceMyStyle_helpdeskConnectionId_idx"
  ON "WorkspaceMyStyle"("helpdeskConnectionId");

CREATE UNIQUE INDEX "WorkspaceAiRephraseStyle_helpdeskConnectionId_seedKey_key"
  ON "WorkspaceAiRephraseStyle"("helpdeskConnectionId", "seedKey");
CREATE INDEX "WorkspaceAiRephraseStyle_helpdeskConnectionId_sortOrder_idx"
  ON "WorkspaceAiRephraseStyle"("helpdeskConnectionId", "sortOrder");

CREATE UNIQUE INDEX "UserAiRephraseStyleOverride_userId_helpdeskConnectionId_styleId_key"
  ON "UserAiRephraseStyleOverride"("userId", "helpdeskConnectionId", "styleId");
CREATE INDEX "UserAiRephraseStyleOverride_helpdeskConnectionId_idx"
  ON "UserAiRephraseStyleOverride"("helpdeskConnectionId");

ALTER TABLE "WorkspaceMembership"
  ADD CONSTRAINT "WorkspaceMembership_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMembership"
  ADD CONSTRAINT "WorkspaceMembership_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceMyStyle"
  ADD CONSTRAINT "WorkspaceMyStyle_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceMyStyle"
  ADD CONSTRAINT "WorkspaceMyStyle_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "WorkspaceAiRephraseStyle"
  ADD CONSTRAINT "WorkspaceAiRephraseStyle_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserAiRephraseStyleOverride"
  ADD CONSTRAINT "UserAiRephraseStyleOverride_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAiRephraseStyleOverride"
  ADD CONSTRAINT "UserAiRephraseStyleOverride_helpdeskConnectionId_fkey"
  FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAiRephraseStyleOverride"
  ADD CONSTRAINT "UserAiRephraseStyleOverride_styleId_fkey"
  FOREIGN KEY ("styleId") REFERENCES "WorkspaceAiRephraseStyle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "WorkspaceMembership" (
  "id",
  "userId",
  "helpdeskConnectionId",
  "role",
  "canEditMyStyle",
  "canEditAiRephraseStyleOverrides",
  "updatedAt"
)
SELECT
  'cm_' || "id",
  "userId",
  "id",
  'ADMIN',
  true,
  true,
  CURRENT_TIMESTAMP
FROM "HelpdeskConnection"
ON CONFLICT ("userId", "helpdeskConnectionId") DO NOTHING;

INSERT INTO "WorkspaceAiRephraseStyle" (
  "id",
  "helpdeskConnectionId",
  "label",
  "seedKey",
  "sortOrder",
  "updatedAt"
)
SELECT 'rs_professional_' || "id", "id", 'Professional', 'professional', 10, CURRENT_TIMESTAMP
FROM "HelpdeskConnection"
ON CONFLICT ("helpdeskConnectionId", "seedKey") DO NOTHING;

INSERT INTO "WorkspaceAiRephraseStyle" (
  "id",
  "helpdeskConnectionId",
  "label",
  "seedKey",
  "sortOrder",
  "updatedAt"
)
SELECT 'rs_friendly_' || "id", "id", 'Friendly', 'friendly', 20, CURRENT_TIMESTAMP
FROM "HelpdeskConnection"
ON CONFLICT ("helpdeskConnectionId", "seedKey") DO NOTHING;

INSERT INTO "WorkspaceAiRephraseStyle" (
  "id",
  "helpdeskConnectionId",
  "label",
  "seedKey",
  "sortOrder",
  "updatedAt"
)
SELECT 'rs_empathetic_' || "id", "id", 'Empathetic', 'empathetic', 30, CURRENT_TIMESTAMP
FROM "HelpdeskConnection"
ON CONFLICT ("helpdeskConnectionId", "seedKey") DO NOTHING;

INSERT INTO "WorkspaceAiRephraseStyle" (
  "id",
  "helpdeskConnectionId",
  "label",
  "seedKey",
  "sortOrder",
  "updatedAt"
)
SELECT 'rs_concise_' || "id", "id", 'Concise', 'concise', 40, CURRENT_TIMESTAMP
FROM "HelpdeskConnection"
ON CONFLICT ("helpdeskConnectionId", "seedKey") DO NOTHING;

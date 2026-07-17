-- Workspace-owned outbound signature policy and encrypted Resolvrr templates.

CREATE TYPE "WorkspaceSignatureSource" AS ENUM ('NONE', 'ZAMMAD', 'RESOLVRR');

ALTER TABLE "Workspace"
  ADD COLUMN "signatureSource" "WorkspaceSignatureSource" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "signatureVersion" TEXT;

UPDATE "Workspace"
SET "signatureVersion" = md5(random()::text || clock_timestamp()::text || "id");

ALTER TABLE "Workspace"
  ALTER COLUMN "signatureVersion" SET NOT NULL;

CREATE TABLE "WorkspaceSignatureTemplate" (
  "id" TEXT NOT NULL,
  "workspaceId" TEXT NOT NULL,
  "scopeKey" TEXT NOT NULL,
  "groupExternalId" TEXT,
  "encryptedBodyHtml" TEXT NOT NULL,
  "keyVersion" TEXT NOT NULL DEFAULT 'v1',
  "contextVersion" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WorkspaceSignatureTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkspaceSignatureTemplateRevision" (
  "id" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "contextVersion" TEXT NOT NULL,
  "encryptedBodyHtml" TEXT NOT NULL,
  "keyVersion" TEXT NOT NULL DEFAULT 'v1',
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkspaceSignatureTemplateRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceSignatureTemplate_workspaceId_scopeKey_key"
  ON "WorkspaceSignatureTemplate"("workspaceId", "scopeKey");
CREATE INDEX "WorkspaceSignatureTemplate_workspaceId_idx"
  ON "WorkspaceSignatureTemplate"("workspaceId");
CREATE INDEX "WorkspaceSignatureTemplate_workspaceId_groupExternalId_idx"
  ON "WorkspaceSignatureTemplate"("workspaceId", "groupExternalId");
CREATE INDEX "WorkspaceSignatureTemplateRevision_templateId_createdAt_idx"
  ON "WorkspaceSignatureTemplateRevision"("templateId", "createdAt");
CREATE INDEX "WorkspaceSignatureTemplateRevision_createdByUserId_idx"
  ON "WorkspaceSignatureTemplateRevision"("createdByUserId");

ALTER TABLE "WorkspaceSignatureTemplate"
  ADD CONSTRAINT "WorkspaceSignatureTemplate_workspaceId_fkey"
  FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceSignatureTemplateRevision"
  ADD CONSTRAINT "WorkspaceSignatureTemplateRevision_templateId_fkey"
  FOREIGN KEY ("templateId") REFERENCES "WorkspaceSignatureTemplate"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WorkspaceSignatureTemplateRevision"
  ADD CONSTRAINT "WorkspaceSignatureTemplateRevision_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

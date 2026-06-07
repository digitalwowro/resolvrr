ALTER TABLE "WorkspaceAiSetting" ADD COLUMN "allowUserPromptOverrides" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "WorkspaceAiPrompt" (
    "id" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "encryptedPrompt" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAiPrompt_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserAiPromptOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT NOT NULL,
    "promptKey" TEXT NOT NULL,
    "encryptedPrompt" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserAiPromptOverride_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WorkspaceAiPrompt_helpdeskConnectionId_promptKey_key" ON "WorkspaceAiPrompt"("helpdeskConnectionId", "promptKey");
CREATE INDEX "WorkspaceAiPrompt_helpdeskConnectionId_idx" ON "WorkspaceAiPrompt"("helpdeskConnectionId");
CREATE UNIQUE INDEX "UserAiPromptOverride_userId_helpdeskConnectionId_promptKey_key" ON "UserAiPromptOverride"("userId", "helpdeskConnectionId", "promptKey");
CREATE INDEX "UserAiPromptOverride_helpdeskConnectionId_idx" ON "UserAiPromptOverride"("helpdeskConnectionId");

ALTER TABLE "WorkspaceAiPrompt" ADD CONSTRAINT "WorkspaceAiPrompt_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAiPromptOverride" ADD CONSTRAINT "UserAiPromptOverride_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserAiPromptOverride" ADD CONSTRAINT "UserAiPromptOverride_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TYPE "WorkspaceAiPolicy" AS ENUM ('DISABLED', 'ADMIN_MANAGED', 'USER_PROVIDED');
CREATE TYPE "AiProviderProtocol" AS ENUM ('OPENAI_COMPATIBLE', 'ANTHROPIC_COMPATIBLE');

CREATE TABLE "WorkspaceAiSetting" (
    "helpdeskConnectionId" TEXT NOT NULL,
    "policy" "WorkspaceAiPolicy" NOT NULL DEFAULT 'DISABLED',
    "providerProtocol" "AiProviderProtocol",
    "baseUrl" TEXT,
    "modelName" TEXT,
    "encryptedApiKey" TEXT,
    "keyVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkspaceAiSetting_pkey" PRIMARY KEY ("helpdeskConnectionId")
);

CREATE TABLE "UserWorkspaceAiSetting" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT NOT NULL,
    "providerProtocol" "AiProviderProtocol" NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "encryptedApiKey" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserWorkspaceAiSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserWorkspaceAiSetting_userId_helpdeskConnectionId_key" ON "UserWorkspaceAiSetting"("userId", "helpdeskConnectionId");
CREATE INDEX "UserWorkspaceAiSetting_helpdeskConnectionId_idx" ON "UserWorkspaceAiSetting"("helpdeskConnectionId");

ALTER TABLE "WorkspaceAiSetting" ADD CONSTRAINT "WorkspaceAiSetting_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserWorkspaceAiSetting" ADD CONSTRAINT "UserWorkspaceAiSetting_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserWorkspaceAiSetting" ADD CONSTRAINT "UserWorkspaceAiSetting_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

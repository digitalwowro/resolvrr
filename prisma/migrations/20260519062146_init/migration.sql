-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "HelpdeskConnectionStatus" AS ENUM ('ACTIVE', 'DISCONNECTED', 'AUTH_FAILED');

-- CreateEnum
CREATE TYPE "SavedViewVisibility" AS ENUM ('PERSONAL', 'SHARED');

-- CreateEnum
CREATE TYPE "TicketState" AS ENUM ('NEW', 'OPEN', 'PENDING_REMINDER', 'PENDING_CLOSE', 'CLOSED');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordLogin" (
    "userId" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordLogin_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionTokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HelpdeskConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "status" "HelpdeskConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HelpdeskConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCredential" (
    "id" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT NOT NULL,
    "scheme" TEXT NOT NULL,
    "encryptedPayload" TEXT NOT NULL,
    "keyVersion" TEXT NOT NULL DEFAULT 'v1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedView" (
    "id" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT,
    "name" TEXT NOT NULL,
    "visibility" "SavedViewVisibility" NOT NULL DEFAULT 'PERSONAL',
    "iconName" TEXT,
    "colorName" TEXT,
    "filterJson" JSONB NOT NULL,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SavedView_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSavedViewPreference" (
    "userId" TEXT NOT NULL,
    "savedViewId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSavedViewPreference_pkey" PRIMARY KEY ("userId","savedViewId")
);

-- CreateTable
CREATE TABLE "TicketSnapshotCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT NOT NULL,
    "sourceSavedViewId" TEXT,
    "providerTicketId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customerDisplayName" TEXT,
    "customerExternalId" TEXT,
    "ownerDisplayName" TEXT,
    "ownerExternalId" TEXT,
    "groupDisplayName" TEXT,
    "groupExternalId" TEXT,
    "state" "TicketState",
    "priority" "TicketPriority",
    "pendingUntil" TIMESTAMP(3),
    "providerUpdatedAt" TIMESTAMP(3),
    "tagNamesJson" JSONB NOT NULL,
    "capabilityJson" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TicketSnapshotCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ThreadSnapshotCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT NOT NULL,
    "providerTicketId" TEXT NOT NULL,
    "messageMetadataJson" JSONB NOT NULL,
    "encryptedSanitizedContent" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ThreadSnapshotCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UiPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT,
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UiPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderMutationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "helpdeskConnectionId" TEXT NOT NULL,
    "providerKey" TEXT NOT NULL,
    "providerTicketId" TEXT,
    "capability" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorKind" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderMutationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppPolicy" (
    "key" TEXT NOT NULL,
    "valueJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppPolicy_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionTokenHash_key" ON "Session"("sessionTokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");

-- CreateIndex
CREATE INDEX "HelpdeskConnection_userId_idx" ON "HelpdeskConnection"("userId");

-- CreateIndex
CREATE INDEX "HelpdeskConnection_providerKey_idx" ON "HelpdeskConnection"("providerKey");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCredential_helpdeskConnectionId_scheme_key" ON "ProviderCredential"("helpdeskConnectionId", "scheme");

-- CreateIndex
CREATE INDEX "SavedView_ownerUserId_idx" ON "SavedView"("ownerUserId");

-- CreateIndex
CREATE INDEX "SavedView_helpdeskConnectionId_idx" ON "SavedView"("helpdeskConnectionId");

-- CreateIndex
CREATE INDEX "SavedView_visibility_idx" ON "SavedView"("visibility");

-- CreateIndex
CREATE INDEX "UserSavedViewPreference_userId_position_idx" ON "UserSavedViewPreference"("userId", "position");

-- CreateIndex
CREATE INDEX "TicketSnapshotCache_helpdeskConnectionId_expiresAt_idx" ON "TicketSnapshotCache"("helpdeskConnectionId", "expiresAt");

-- CreateIndex
CREATE INDEX "TicketSnapshotCache_sourceSavedViewId_idx" ON "TicketSnapshotCache"("sourceSavedViewId");

-- CreateIndex
CREATE UNIQUE INDEX "TicketSnapshotCache_userId_helpdeskConnectionId_providerTic_key" ON "TicketSnapshotCache"("userId", "helpdeskConnectionId", "providerTicketId");

-- CreateIndex
CREATE INDEX "ThreadSnapshotCache_helpdeskConnectionId_expiresAt_idx" ON "ThreadSnapshotCache"("helpdeskConnectionId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "ThreadSnapshotCache_userId_helpdeskConnectionId_providerTic_key" ON "ThreadSnapshotCache"("userId", "helpdeskConnectionId", "providerTicketId");

-- CreateIndex
CREATE INDEX "UiPreference_userId_idx" ON "UiPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UiPreference_userId_helpdeskConnectionId_key_key" ON "UiPreference"("userId", "helpdeskConnectionId", "key");

-- CreateIndex
CREATE INDEX "ProviderMutationLog_userId_createdAt_idx" ON "ProviderMutationLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderMutationLog_helpdeskConnectionId_createdAt_idx" ON "ProviderMutationLog"("helpdeskConnectionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PasswordLogin" ADD CONSTRAINT "PasswordLogin_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HelpdeskConnection" ADD CONSTRAINT "HelpdeskConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCredential" ADD CONSTRAINT "ProviderCredential_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedView" ADD CONSTRAINT "SavedView_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedViewPreference" ADD CONSTRAINT "UserSavedViewPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSavedViewPreference" ADD CONSTRAINT "UserSavedViewPreference_savedViewId_fkey" FOREIGN KEY ("savedViewId") REFERENCES "SavedView"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSnapshotCache" ADD CONSTRAINT "TicketSnapshotCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSnapshotCache" ADD CONSTRAINT "TicketSnapshotCache_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TicketSnapshotCache" ADD CONSTRAINT "TicketSnapshotCache_sourceSavedViewId_fkey" FOREIGN KEY ("sourceSavedViewId") REFERENCES "SavedView"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadSnapshotCache" ADD CONSTRAINT "ThreadSnapshotCache_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ThreadSnapshotCache" ADD CONSTRAINT "ThreadSnapshotCache_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UiPreference" ADD CONSTRAINT "UiPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UiPreference" ADD CONSTRAINT "UiPreference_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMutationLog" ADD CONSTRAINT "ProviderMutationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderMutationLog" ADD CONSTRAINT "ProviderMutationLog_helpdeskConnectionId_fkey" FOREIGN KEY ("helpdeskConnectionId") REFERENCES "HelpdeskConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

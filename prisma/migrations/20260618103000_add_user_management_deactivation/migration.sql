ALTER TABLE "User" ADD COLUMN "deactivatedAt" TIMESTAMP(3);

ALTER TABLE "ProviderMutationLog" DROP CONSTRAINT "ProviderMutationLog_userId_fkey";
ALTER TABLE "ProviderMutationLog" ADD CONSTRAINT "ProviderMutationLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

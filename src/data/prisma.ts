import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/config/env";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaSchemaRevision?: string;
};
const prismaSchemaRevision = "20260718100000-durable-ai-summaries";

function isCurrentPrismaClient(
  client: PrismaClient | undefined,
): client is PrismaClient {
  return Boolean(
    globalForPrisma.prismaSchemaRevision === prismaSchemaRevision &&
    client?.workspaceAiPrompt &&
      client.workspaceAiRephraseStyle &&
      client.userAiRephraseStyleOverride &&
      client.workspaceMyStyle &&
      client.workspaceMembership,
  );
}

function prismaClient() {
  // Next dev hot reload can keep a global client from an older generated schema.
  if (isCurrentPrismaClient(globalForPrisma.prisma)) {
    return globalForPrisma.prisma;
  }

  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
  });
}

// Prisma 7 uses a driver adapter; this module is the single server-side client boundary.
export const prisma = prismaClient();

if (env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaRevision = prismaSchemaRevision;
}

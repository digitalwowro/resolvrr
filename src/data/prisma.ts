import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { env } from "@/config/env";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function hasPromptModelDelegates(
  client: PrismaClient | undefined,
): client is PrismaClient {
  return Boolean(client?.workspaceAiPrompt && client.userAiPromptOverride);
}

function prismaClient() {
  // Next dev hot reload can keep a global client from an older generated schema.
  if (hasPromptModelDelegates(globalForPrisma.prisma)) {
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
}

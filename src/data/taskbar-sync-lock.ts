import { prisma } from "@/data/prisma";
import type { Prisma } from "@/generated/prisma/client";

const taskbarLockSeed = 748_212_337;

export async function withTaskbarSyncLock<T>(
  helpdeskConnectionId: string,
  operation: (transaction: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`resolvrr:taskbar:${helpdeskConnectionId}`}, ${taskbarLockSeed})
      )::text AS lock_value
    `;
    return operation(transaction);
  }, {
    maxWait: 10_000,
    timeout: 60_000,
  });
}

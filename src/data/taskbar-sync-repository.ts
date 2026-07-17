import type { Prisma } from "@/generated/prisma/client";
import {
  orderTicketTaskbarOperations,
  ticketTaskbarCommandIsSatisfied,
  type TicketTaskbarCommand,
  type TicketTaskbarSnapshot,
} from "@/core/ticket-taskbar";

export type StoredTaskbarOperation = {
  id: string;
  command: TicketTaskbarCommand;
};

export type StoredTaskbarState = {
  id: string;
  compatibility: "UNKNOWN" | "SUPPORTED" | "UNSUPPORTED";
  initializedAt: Date | null;
};

type TaskbarSyncDb = Pick<
  Prisma.TransactionClient,
  "taskbarSyncOperation" | "taskbarSyncState"
>;

function operationKey(request: TicketTaskbarCommand) {
  if (request.kind === "reorder") return "order";
  if (request.kind === "activate" || request.kind === "deactivate") return "active";
  return `ticket:${request.ticketExternalId}`;
}

function dbKind(request: TicketTaskbarCommand) {
  return request.kind.toUpperCase() as
    "OPEN" | "CLOSE" | "ACTIVATE" | "DEACTIVATE" | "REORDER";
}

function validTicketId(value: unknown): value is string {
  return typeof value === "string" &&
    value.trim() === value &&
    value.length > 0 &&
    value.length <= 128;
}

function parseCommand(
  value: unknown,
  expectedKind?: string,
): TicketTaskbarCommand | null {
  if (!value || typeof value !== "object" || !("kind" in value)) return null;
  const kind = (value as { kind?: unknown }).kind;
  if (
    typeof kind !== "string" ||
    (expectedKind && kind.toUpperCase() !== expectedKind)
  ) {
    return null;
  }
  if (kind === "deactivate") return { kind };
  if (kind === "reorder") {
    const ids = (value as { ticketExternalIds?: unknown }).ticketExternalIds;
    return Array.isArray(ids) &&
      ids.length <= 20 &&
      ids.every(validTicketId) &&
      new Set(ids).size === ids.length
      ? { kind, ticketExternalIds: ids }
      : null;
  }
  const id = (value as { ticketExternalId?: unknown }).ticketExternalId;
  return (kind === "open" || kind === "close" || kind === "activate") &&
    validTicketId(id)
    ? { kind, ticketExternalId: id }
    : null;
}

export async function ensureTaskbarState(
  db: TaskbarSyncDb,
  helpdeskConnectionId: string,
  identityVersion: string,
): Promise<StoredTaskbarState> {
  const existing = await db.taskbarSyncState.findUnique({
    where: { helpdeskConnectionId },
  });
  if (existing?.identityVersion === identityVersion) return existing;
  if (existing) {
    await db.taskbarSyncState.delete({ where: { id: existing.id } });
  }
  return db.taskbarSyncState.create({
    data: { helpdeskConnectionId, identityVersion },
  });
}

export async function enqueueTaskbarOperation(
  db: TaskbarSyncDb,
  stateId: string,
  request: TicketTaskbarCommand,
): Promise<void> {
  const now = new Date();
  await db.taskbarSyncOperation.upsert({
    where: {
      taskbarSyncStateId_dedupeKey: {
        taskbarSyncStateId: stateId,
        dedupeKey: operationKey(request),
      },
    },
    create: {
      taskbarSyncStateId: stateId,
      dedupeKey: operationKey(request),
      kind: dbKind(request),
      payloadJson: request,
      actionAt: now,
      nextAttemptAt: now,
    },
    update: {
      kind: dbKind(request),
      payloadJson: request,
      actionAt: now,
      attemptCount: 0,
      nextAttemptAt: now,
      lastErrorCode: null,
    },
  });
  if (request.kind === "close") {
    const active = await db.taskbarSyncOperation.findUnique({
      where: {
        taskbarSyncStateId_dedupeKey: {
          taskbarSyncStateId: stateId,
          dedupeKey: "active",
        },
      },
      select: { id: true, payloadJson: true },
    });
    const command = active ? parseCommand(active.payloadJson) : null;
    if (active && command?.kind === "activate" && command.ticketExternalId === request.ticketExternalId) {
      await db.taskbarSyncOperation.delete({ where: { id: active.id } });
    }
    const order = await db.taskbarSyncOperation.findUnique({
      where: {
        taskbarSyncStateId_dedupeKey: {
          taskbarSyncStateId: stateId,
          dedupeKey: "order",
        },
      },
      select: { id: true, payloadJson: true },
    });
    const orderCommand = order ? parseCommand(order.payloadJson) : null;
    if (order && orderCommand?.kind === "reorder") {
      const remainingIds = orderCommand.ticketExternalIds.filter(
        (id) => id !== request.ticketExternalId,
      );
      if (remainingIds.length === 0) {
        await db.taskbarSyncOperation.delete({ where: { id: order.id } });
      } else if (remainingIds.length !== orderCommand.ticketExternalIds.length) {
        await db.taskbarSyncOperation.update({
          where: { id: order.id },
          data: {
            payloadJson: { kind: "reorder", ticketExternalIds: remainingIds },
            actionAt: now,
            attemptCount: 0,
            nextAttemptAt: now,
            lastErrorCode: null,
          },
        });
      }
    }
  }
}

export async function dueTaskbarOperations(
  db: TaskbarSyncDb,
  stateId: string,
  now: Date,
): Promise<StoredTaskbarOperation[]> {
  const rows = await db.taskbarSyncOperation.findMany({
    where: { taskbarSyncStateId: stateId, nextAttemptAt: { lte: now } },
    orderBy: [{ actionAt: "asc" }, { createdAt: "asc" }],
    take: 20,
  });
  const valid: StoredTaskbarOperation[] = [];
  for (const row of rows) {
    const command = parseCommand(row.payloadJson, row.kind);
    if (command) valid.push({ id: row.id, command });
    else await db.taskbarSyncOperation.delete({ where: { id: row.id } });
  }
  return orderTicketTaskbarOperations(valid);
}

export async function completeTaskbarSync(
  db: TaskbarSyncDb,
  stateId: string,
  operationIds: string[],
  contractVersion: string,
  initializedAt: Date,
  synchronizedAt: Date,
): Promise<void> {
  await db.taskbarSyncOperation.deleteMany({ where: { id: { in: operationIds } } });
  await db.taskbarSyncState.update({
    where: { id: stateId },
    data: {
      compatibility: "SUPPORTED",
      contractVersion,
      initializedAt,
      lastSynchronizedAt: synchronizedAt,
      lastErrorCode: null,
    },
  });
}

export async function failTaskbarSync(
  db: TaskbarSyncDb,
  stateId: string,
  operationIds: string[],
  errorCode: string,
  retryable: boolean,
): Promise<void> {
  void retryable;
  const now = Date.now();
  await db.taskbarSyncState.update({
    where: { id: stateId },
    data: { lastErrorCode: errorCode },
  });
  await db.taskbarSyncOperation.updateMany({
    where: { id: { in: operationIds } },
    data: {
      attemptCount: { increment: 1 },
      lastErrorCode: errorCode,
      nextAttemptAt: new Date(now + 60_000),
    },
  });
}

export async function markTaskbarIncompatible(
  db: TaskbarSyncDb,
  stateId: string,
): Promise<void> {
  await db.taskbarSyncOperation.deleteMany({
    where: { taskbarSyncStateId: stateId },
  });
  await db.taskbarSyncState.update({
    where: { id: stateId },
    data: {
      compatibility: "UNSUPPORTED",
      lastErrorCode: "taskbar-incompatible",
    },
  });
}

export async function pendingTaskbarOperations(
  db: TaskbarSyncDb,
  stateId: string,
) {
  const rows = await db.taskbarSyncOperation.findMany({
    where: { taskbarSyncStateId: stateId },
    orderBy: [{ actionAt: "asc" }, { createdAt: "asc" }],
    select: { kind: true, payloadJson: true },
  });
  return rows.flatMap((row) => {
    const command = parseCommand(row.payloadJson, row.kind);
    return command ? [command] : [];
  });
}

export async function satisfiedTaskbarOperationIds(
  db: TaskbarSyncDb,
  stateId: string,
  snapshot: TicketTaskbarSnapshot,
) {
  const rows = await db.taskbarSyncOperation.findMany({
    where: { taskbarSyncStateId: stateId },
    select: { id: true, kind: true, payloadJson: true },
  });
  const satisfiedIds: string[] = [];
  for (const row of rows) {
    const command = parseCommand(row.payloadJson, row.kind);
    if (!command) {
      await db.taskbarSyncOperation.delete({ where: { id: row.id } });
    } else if (ticketTaskbarCommandIsSatisfied(command, snapshot)) {
      satisfiedIds.push(row.id);
    }
  }
  return satisfiedIds;
}

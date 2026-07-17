import { ProviderError } from "@/core/providers";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  loadTicketProviderContextForConnection,
  readUnavailableForProviderError,
} from "@/features/tickets/connection-context";
import {
  completeTaskbarSync,
  dueTaskbarOperations,
  enqueueTaskbarOperation,
  ensureTaskbarState,
  failTaskbarSync,
  markTaskbarIncompatible,
  pendingTaskbarOperations,
  satisfiedTaskbarOperationIds,
} from "@/data/taskbar-sync-repository";
import { withTaskbarSyncLock } from "@/data/taskbar-sync-lock";
import type { TaskbarSyncRequest, WorkspaceTaskbarSyncResult } from "./model";

function pendingFields(commands: Awaited<ReturnType<typeof pendingTaskbarOperations>>) {
  const pendingActivation = commands.find((command) => command.kind === "activate");
  return {
    unsynchronizedTicketExternalIds: [...new Set(commands.flatMap((command) =>
      command.kind === "reorder" ? command.ticketExternalIds
        : command.kind === "deactivate" ? [] : [command.ticketExternalId],
    ))],
    pendingOpenTicketExternalIds: commands.flatMap((command) =>
      command.kind === "open" ? [command.ticketExternalId] : [],
    ),
    pendingCloseTicketExternalIds: commands.flatMap((command) =>
      command.kind === "close" ? [command.ticketExternalId] : [],
    ),
    ...(pendingActivation?.kind === "activate"
      ? { pendingActiveTicketExternalId: pendingActivation.ticketExternalId }
      : {}),
    activeNotSynchronized: commands.some((command) =>
      command.kind === "activate" || command.kind === "deactivate",
    ),
    orderNotSynchronized: commands.some((command) => command.kind === "reorder"),
  };
}

export async function synchronizeWorkspaceTaskbar(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  helpdeskConnectionId: string,
  expectedIdentityVersion: string,
  request: TaskbarSyncRequest,
): Promise<WorkspaceTaskbarSyncResult> {
  const ownedConnection = await repository.findForUser(
    userId,
    helpdeskConnectionId,
  );
  if (
    !ownedConnection ||
    ownedConnection.identityVersion !== expectedIdentityVersion
  ) {
    return {
      status: "unavailable",
      reason: "no-active-connection",
      retryable: false,
      ...pendingFields([]),
    };
  }
  const provider = await loadTicketProviderContextForConnection(
    repository,
    registry,
    encryptionKey,
    userId,
    helpdeskConnectionId,
    "mutation",
  );
  return withTaskbarSyncLock(helpdeskConnectionId, async (transaction) => {
    const currentConnections = await transaction.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "HelpdeskConnection"
      WHERE "id" = ${helpdeskConnectionId}
        AND "userId" = ${userId}
        AND "identityVersion" = ${expectedIdentityVersion}
      FOR SHARE
    `;
    if (currentConnections.length !== 1) {
      return {
        status: "unavailable",
        reason: "no-active-connection",
        retryable: false,
        ...pendingFields([]),
      };
    }
    const state = await ensureTaskbarState(
      transaction,
      helpdeskConnectionId,
      ownedConnection.identityVersion,
    );
    if (state.compatibility === "UNSUPPORTED") {
      return {
        status: "unavailable",
        reason: "taskbar-incompatible",
        retryable: false,
        ...pendingFields([]),
      };
    }
    if (request.kind !== "reconcile") {
      await enqueueTaskbarOperation(transaction, state.id, request);
    }
    if (provider.status === "unavailable") {
      return {
        ...provider,
        ...pendingFields(await pendingTaskbarOperations(transaction, state.id)),
      };
    }
    const { context, plugin } = provider.value;
    if (context.connection.identityVersion !== expectedIdentityVersion) {
      return {
        status: "unavailable",
        reason: "no-active-connection",
        retryable: false,
        ...pendingFields([]),
      };
    }
    if (
      !plugin.capabilities.includes("ticket-taskbar:sync") ||
      !plugin.readTicketTaskbar || !plugin.syncTicketTaskbar
    ) {
      await markTaskbarIncompatible(transaction, state.id);
      return {
        status: "unavailable",
        reason: "taskbar-incompatible",
        retryable: false,
        ...pendingFields([]),
      };
    }

    const due = await dueTaskbarOperations(transaction, state.id, new Date());
    try {
      const result = due.length > 0
        ? await plugin.syncTicketTaskbar(context, due.map((operation) => operation.command))
        : { snapshot: await plugin.readTicketTaskbar(context), confirmedCommandIndexes: [] };
      const now = new Date();
      const confirmedIds = result.confirmedCommandIndexes.flatMap((index) =>
        due[index] ? [due[index].id] : [],
      );
      const satisfiedIds = await satisfiedTaskbarOperationIds(
        transaction,
        state.id,
        result.snapshot,
      );
      await completeTaskbarSync(
        transaction,
        state.id,
        [...new Set([...confirmedIds, ...satisfiedIds])],
        result.snapshot.contractVersion,
        state.initializedAt ?? now,
        now,
      );
      const pending = await pendingTaskbarOperations(transaction, state.id);
      const activeItems = result.snapshot.items.filter((item) => item.active);
      return {
        status: "available",
        activeSelectionReliable: result.snapshot.activeSelectionReliable,
        initial: state.initializedAt === null,
        ticketExternalIds: result.snapshot.items.map((item) => item.ticketExternalId),
        ...(activeItems.length === 1
          ? { activeTicketExternalId: activeItems[0].ticketExternalId }
          : {}),
        ...pendingFields(pending),
        synchronizedAt: now.toISOString(),
      };
    } catch (error) {
      const incompatible = error instanceof ProviderError &&
        error.kind === "provider-data-mismatch" &&
        error.diagnosticCode?.startsWith("taskbar-contract-") === true;
      if (incompatible) await markTaskbarIncompatible(transaction, state.id);
      else await failTaskbarSync(
        transaction,
        state.id,
        due.map((operation) => operation.id),
        error instanceof ProviderError ? error.diagnosticCode ?? error.kind : "taskbar-sync-failed",
        error instanceof ProviderError ? error.retryable : true,
      );
      const unavailable = incompatible
        ? { reason: "taskbar-incompatible" as const, retryable: false }
        : readUnavailableForProviderError(error);
      return {
        status: "unavailable",
        reason: unavailable.reason,
        retryable: unavailable.retryable,
        ...pendingFields(await pendingTaskbarOperations(transaction, state.id)),
      };
    }
  });
}

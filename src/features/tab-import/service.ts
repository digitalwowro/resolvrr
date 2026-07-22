import { ProviderError } from "@/core/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  loadTicketProviderContextForConnection,
  readUnavailableForProviderError,
} from "@/features/tickets/connection-context";
import type { ProviderRegistry } from "@/providers";
import { safeLogMetadata } from "@/security/safe-log";
import type {
  WorkspaceTabImportResult,
} from "./model";

type WorkspaceTabImportUnavailableReason = Extract<
  WorkspaceTabImportResult,
  { status: "unavailable" }
>["reason"];

function recordImport(
  status: "available" | "unavailable",
  startedAt: number,
  details: { count?: number; reason?: string; retryable?: boolean },
) {
  console.info(
    "Ticket tab import",
    safeLogMetadata({
      count: details.count,
      durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      reason: details.reason,
      retryable: details.retryable,
      status,
    }),
  );
}

function unavailable(
  startedAt: number,
  reason: WorkspaceTabImportUnavailableReason,
  retryable = false,
): WorkspaceTabImportResult {
  recordImport("unavailable", startedAt, { reason, retryable });
  return { status: "unavailable", reason, retryable };
}

export async function importWorkspaceTicketTabs(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  helpdeskConnectionId: string,
  expectedIdentityVersion: string,
): Promise<WorkspaceTabImportResult> {
  const startedAt = performance.now();
  const provider = await loadTicketProviderContextForConnection(
    repository,
    registry,
    encryptionKey,
    userId,
    helpdeskConnectionId,
    "lookup",
    expectedIdentityVersion,
  );
  if (provider.status === "unavailable") {
    return unavailable(startedAt, provider.reason, provider.retryable);
  }
  const { context, plugin } = provider.value;
  if (
    !plugin.capabilities.includes("ticket-tabs:import") ||
    !plugin.readTicketTabs
  ) {
    return unavailable(startedAt, "unsupported-capability");
  }

  try {
    const snapshot = await plugin.readTicketTabs(context);
    const ticketExternalIds = snapshot.ticketExternalIds;
    recordImport("available", startedAt, { count: ticketExternalIds.length });
    return { status: "available", ticketExternalIds };
  } catch (error) {
    if (
      error instanceof ProviderError &&
      error.kind === "provider-data-mismatch" &&
      error.diagnosticCode?.startsWith("tab-import-contract-")
    ) {
      return unavailable(startedAt, "tab-import-incompatible");
    }
    const result = readUnavailableForProviderError(error);
    return unavailable(startedAt, result.reason, result.retryable);
  }
}

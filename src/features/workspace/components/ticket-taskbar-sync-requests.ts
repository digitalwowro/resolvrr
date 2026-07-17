import type {
  TaskbarSyncRequest,
  WorkspaceTaskbarSyncResult,
} from "@/features/taskbar-sync/model";
import { workspaceOpenTabsLimit } from "@/features/workspace/workspace-tab-state";

export type LocalTaskbarRequest = Exclude<
  TaskbarSyncRequest,
  { kind: "reconcile" }
>;

export function sameTaskbarIds(left: string[], right: string[]) {
  return left.length === right.length &&
    left.every((value, index) => value === right[index]);
}

export function taskbarRequestKey(request: LocalTaskbarRequest) {
  if (request.kind === "reorder") return "order";
  if (request.kind === "activate" || request.kind === "deactivate") return "active";
  return `ticket:${request.ticketExternalId}`;
}

export function taskbarRequestTicketIds(request: LocalTaskbarRequest) {
  if (request.kind === "reorder") return request.ticketExternalIds;
  return request.kind === "deactivate" ? [] : [request.ticketExternalId];
}

export function cappedTaskbarProviderIds(
  ticketIds: string[],
  activeTicketId?: string,
) {
  const capped = ticketIds.slice(0, workspaceOpenTabsLimit);
  if (
    !activeTicketId ||
    capped.includes(activeTicketId) ||
    !ticketIds.includes(activeTicketId)
  ) {
    return capped;
  }
  return [...capped.slice(0, workspaceOpenTabsLimit - 1), activeTicketId];
}

export function taskbarRequestRemainsPending(
  request: LocalTaskbarRequest,
  result: WorkspaceTaskbarSyncResult,
) {
  if (
    result.status === "unavailable" &&
    result.reason === "taskbar-incompatible"
  ) {
    return false;
  }
  const unavailable = result.status === "unavailable";
  if (request.kind === "open") {
    const staged = result.pendingOpenTicketExternalIds.includes(
      request.ticketExternalId,
    );
    return unavailable && !staged;
  }
  if (request.kind === "close") {
    const staged = result.pendingCloseTicketExternalIds.includes(
      request.ticketExternalId,
    );
    return unavailable && !staged;
  }
  if (request.kind === "activate" || request.kind === "deactivate") {
    return unavailable && !result.activeNotSynchronized;
  }
  return unavailable && !result.orderNotSynchronized;
}

export function taskbarDraftCheckTicketIds(
  localTicketIds: string[],
  remoteTicketIds: Set<string>,
  pendingOpenTicketIds: Set<string>,
  mergedSourceTicketIds: Set<string>,
) {
  return localTicketIds.filter((id) =>
    !remoteTicketIds.has(id) &&
    !pendingOpenTicketIds.has(id) &&
    !mergedSourceTicketIds.has(id)
  );
}

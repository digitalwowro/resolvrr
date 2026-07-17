import type { LoadWorkspaceTicketDetailAction } from "@/features/tickets/detail-action-result";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import type {
  TaskbarSyncRequest,
  WorkspaceTaskbarSyncResult,
} from "@/features/taskbar-sync/model";
import type { CommunicationDraftPersistenceScope } from "./ticket-communication-draft-persistence";

export type SynchronizeWorkspaceTaskbarAction = (
  request: TaskbarSyncRequest,
  helpdeskConnectionId: string,
  identityVersion: string,
) => Promise<WorkspaceTaskbarSyncResult>;

export type TicketTaskbarSyncOptions = {
  action?: SynchronizeWorkspaceTaskbarAction;
  activeTicketId?: string;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  openTicketTabs: WorkspaceTicketTab[];
  reconcileOpenTicketTabs(
    tabs: WorkspaceTicketTab[],
    protectedTicketIds: string[],
    activeTicketId?: string,
  ): void;
  scope?: Omit<CommunicationDraftPersistenceScope, "ticketExternalId">;
  ticketTabs: WorkspaceTicketTab[];
};

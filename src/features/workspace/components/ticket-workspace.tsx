import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type { LoadWorkspaceTicketListPageAction } from "@/features/tickets/list-page-action-result";
import {
  allTicketsSavedViewId,
  type WorkspaceSavedView,
} from "@/features/saved-views";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import {
  noTicketCommunicationCapabilities,
  type TicketCommunicationCapabilities,
  type TicketCustomerReplyActionState,
  type TicketCustomerReplyPayload,
  type TicketInternalNoteActionState,
  type TicketInternalNotePayload,
} from "@/features/tickets/communication-model";
import type { TicketListReadResult } from "@/features/tickets/read-model";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import { workspaceTicketListGroups } from "@/features/tickets/workspace-adapter";
import { TicketWorkspaceDisplay } from "./ticket-workspace-display";
import {
  type WorkspaceMenuConnection,
  type WorkspaceProfileAction,
  WorkspaceHeader,
} from "./workspace-header";
import { UnavailableState } from "./workspace-states";

type TicketWorkspaceProps = {
  addTicketCustomerReplyAction?(
    request: TicketCustomerReplyPayload,
  ): Promise<TicketCustomerReplyActionState>;
  addTicketInternalNoteAction?(
    request: TicketInternalNotePayload,
  ): Promise<TicketInternalNoteActionState>;
  columns: WorkspaceTicketColumn[];
  communicationCapabilities?: TicketCommunicationCapabilities;
  connections: WorkspaceMenuConnection[];
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  listResult: TicketListReadResult;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  logoutAction(formData: FormData): void | Promise<void>;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  rows: WorkspaceTicketRow[];
  savedViews?: WorkspaceSavedView[];
  selectedSavedViewId?: string;
  selectedTicketId?: string;
  setActiveConnectionAction(formData: FormData): void | Promise<void>;
  tabs: WorkspaceTicketTab[];
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userEmail: string;
};

const unavailableTicketDetailAction: LoadWorkspaceTicketDetailAction = async () => ({
  status: "unavailable",
  reason: "provider-temporary-failure",
  retryable: true,
});

const unavailableInternalNoteAction = async (): Promise<TicketInternalNoteActionState> => ({
  status: "failed",
  message: "This workspace cannot add internal notes.",
});

const unavailableCustomerReplyAction = async (): Promise<TicketCustomerReplyActionState> => ({
  status: "failed",
  message: "This workspace cannot send customer replies.",
});

const profileActions: WorkspaceProfileAction[] = [
  {
    id: "manage-workspaces",
    label: "Manage workspaces",
    href: "/workspace/connections",
  },
];

export function TicketWorkspace({
  addTicketCustomerReplyAction,
  addTicketInternalNoteAction,
  columns,
  communicationCapabilities,
  connections,
  detail,
  detailResult,
  listResult,
  loadTicketDetailAction,
  loadTicketListPageAction,
  logoutAction,
  metadataMutationCapabilities,
  rows,
  savedViews,
  selectedSavedViewId,
  selectedTicketId,
  setActiveConnectionAction,
  tabs,
  updateTicketMetadataAction,
  userEmail,
}: TicketWorkspaceProps) {
  const providedLoadTicketDetailAction = Boolean(loadTicketDetailAction);
  const effectiveLoadTicketDetailAction =
    loadTicketDetailAction ?? unavailableTicketDetailAction;
  const effectiveMetadataMutationCapabilities =
    metadataMutationCapabilities ??
    (listResult.status === "available"
      ? listResult.metadataMutationCapabilities
      : undefined);
  const effectiveCommunicationCapabilities =
    communicationCapabilities ??
    (listResult.status === "available"
      ? listResult.communicationCapabilities
      : noTicketCommunicationCapabilities);

  return (
    <main className="flex h-screen min-h-screen flex-col overflow-hidden">
      {listResult.status === "unavailable" ? (
        <>
          <WorkspaceHeader
            actions={profileActions}
            connections={connections}
            logoutAction={logoutAction}
            setActiveConnectionAction={setActiveConnectionAction}
            userEmail={userEmail}
          />
          <UnavailableState reason={listResult.reason} />
        </>
      ) : (
        <TicketWorkspaceDisplay
          addTicketCustomerReplyAction={
            addTicketCustomerReplyAction ?? unavailableCustomerReplyAction
          }
          addTicketInternalNoteAction={
            addTicketInternalNoteAction ?? unavailableInternalNoteAction
          }
          actions={profileActions}
          columns={columns}
          communicationCapabilities={effectiveCommunicationCapabilities}
          connections={connections}
          detail={detail}
          detailResult={detailResult}
          loadTicketDetailAction={effectiveLoadTicketDetailAction}
          loadTicketListPageAction={loadTicketListPageAction}
          logoutAction={logoutAction}
          metadataMutationCapabilities={effectiveMetadataMutationCapabilities}
          providerGroupingEnabled={
            listResult.queryCapabilities?.providerGrouping === true
          }
          nextListCursor={listResult.nextCursor}
          initialListGroups={workspaceTicketListGroups(listResult.buckets)}
          providerSortEnabled={listResult.queryCapabilities?.providerSort === true}
          refreshTicketDetailAfterMetadataSave={providedLoadTicketDetailAction}
          rows={rows}
          savedViews={
            savedViews ?? [{ id: allTicketsSavedViewId, label: "All tickets" }]
          }
          selectedSavedViewId={selectedSavedViewId ?? allTicketsSavedViewId}
          selectedTicketId={selectedTicketId}
          setActiveConnectionAction={setActiveConnectionAction}
          tabs={tabs}
          totalListCount={listResult.totalCount}
          updateTicketMetadataAction={updateTicketMetadataAction}
          userEmail={userEmail}
        />
      )}
    </main>
  );
}

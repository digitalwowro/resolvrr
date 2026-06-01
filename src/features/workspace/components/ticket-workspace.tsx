import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type { LoadWorkspaceTicketListPageAction } from "@/features/tickets/list-page-action-result";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import {
  allTicketsSavedViewId,
  type WorkspaceSavedView,
} from "@/features/saved-views";
import type {
  SaveWorkspaceOpenTabsStateAction,
  WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import {
  noTicketCommunicationCapabilities,
  type TicketCommunicationCapabilities,
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
  columns: WorkspaceTicketColumn[];
  communicationCapabilities?: TicketCommunicationCapabilities;
  connections: WorkspaceMenuConnection[];
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  listResult: TicketListReadResult;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  logoutAction(formData: FormData): void | Promise<void>;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  rows: WorkspaceTicketRow[];
  savedViews?: WorkspaceSavedView[];
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
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

const unavailableLinkTargetSearchAction: SearchWorkspaceTicketLinkTargetsAction =
  async () => ({
    status: "unavailable",
    reason: "unsupported-capability",
    retryable: false,
  });

const profileActions: WorkspaceProfileAction[] = [
  {
    id: "manage-workspaces",
    label: "Manage workspaces",
    href: "/workspace/connections",
  },
];

export function TicketWorkspace({
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
  searchTicketLinkTargetsAction,
  savedViews,
  initialWorkspaceOpenTabsState,
  saveWorkspaceOpenTabsStateAction,
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
          initialWorkspaceOpenTabsState={initialWorkspaceOpenTabsState}
          saveWorkspaceOpenTabsStateAction={saveWorkspaceOpenTabsStateAction}
          selectedSavedViewId={selectedSavedViewId ?? allTicketsSavedViewId}
          selectedTicketId={selectedTicketId}
          setActiveConnectionAction={setActiveConnectionAction}
          searchTicketLinkTargetsAction={
            searchTicketLinkTargetsAction ?? unavailableLinkTargetSearchAction
          }
          tabs={tabs}
          totalListCount={listResult.totalCount}
          updateTicketMetadataAction={updateTicketMetadataAction}
          userEmail={userEmail}
        />
      )}
    </main>
  );
}

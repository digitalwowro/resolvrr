"use client";

import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type { LoadWorkspaceTicketListPageAction } from "@/features/tickets/list-page-action-result";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import type {
  LoadWorkspaceNotificationsAction,
  MarkWorkspaceNotificationsReadAction,
} from "@/features/notifications";
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
  ConnectionProviderOption,
  HelpdeskConnectionActionResult,
  HelpdeskConnectionFormAction,
  WorkspaceSettingsConnection,
} from "@/features/helpdesk-connections/service-types";
import { useMemo, useState } from "react";
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
  WorkspaceHeader,
} from "./workspace-header";
import { UnavailableState } from "./workspace-states";
import {
  WorkspaceSettingsDialog,
  type WorkspaceSettingsSection,
} from "./workspace-settings-dialog";

type TicketWorkspaceProps = {
  columns: WorkspaceTicketColumn[];
  communicationCapabilities?: TicketCommunicationCapabilities;
  connections: WorkspaceMenuConnection[];
  connectionProviderOptions?: ConnectionProviderOption[];
  createConnectionAction?: HelpdeskConnectionFormAction;
  deleteConnectionAction?: HelpdeskConnectionFormAction;
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  disableConnectionAction?: HelpdeskConnectionFormAction;
  listResult: TicketListReadResult;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  loadWorkspaceNotificationsAction?: LoadWorkspaceNotificationsAction;
  searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  logoutAction(formData: FormData): void | Promise<void>;
  markWorkspaceNotificationsReadAction?: MarkWorkspaceNotificationsReadAction;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  rows: WorkspaceTicketRow[];
  savedViews?: WorkspaceSavedView[];
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  selectedSavedViewId?: string;
  selectedTicketId?: string;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  tabs: WorkspaceTicketTab[];
  updateConnectionAction?: HelpdeskConnectionFormAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userEmail: string;
  validateConnectionAction?: HelpdeskConnectionFormAction;
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

const unavailableNotificationsAction: LoadWorkspaceNotificationsAction =
  async () => ({
    status: "unavailable",
    reason: "unsupported-capability",
    retryable: false,
  });

const unavailableNotificationMarkReadAction: MarkWorkspaceNotificationsReadAction =
  async () => ({
    status: "failed",
    reason: "unsupported-capability",
    retryable: false,
  });

function workspaceSettingsConnectionFromMenu(
  connection: WorkspaceMenuConnection,
): WorkspaceSettingsConnection {
  return {
    id: connection.id,
    label: connection.label,
    providerKey: connection.providerKey ?? "unknown",
    providerLabel: connection.providerLabel ?? connection.providerKey ?? "Unknown provider",
    baseUrl: connection.baseUrl ?? "",
    status: connection.status ?? "disconnected",
    active: connection.active,
  };
}

export function TicketWorkspace({
  columns,
  communicationCapabilities,
  connections,
  connectionProviderOptions = [],
  createConnectionAction,
  deleteConnectionAction,
  detail,
  detailResult,
  disableConnectionAction,
  listResult,
  loadTicketDetailAction,
  loadTicketListPageAction,
  loadWorkspaceNotificationsAction,
  logoutAction,
  markWorkspaceNotificationsReadAction,
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
  updateConnectionAction,
  updateTicketMetadataAction,
  userEmail,
  validateConnectionAction,
}: TicketWorkspaceProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<WorkspaceSettingsSection>("workspaces");
  const providedLoadTicketDetailAction = Boolean(loadTicketDetailAction);
  const effectiveLoadTicketDetailAction =
    loadTicketDetailAction ?? unavailableTicketDetailAction;
  const effectiveLoadWorkspaceNotificationsAction =
    loadWorkspaceNotificationsAction ?? unavailableNotificationsAction;
  const effectiveMarkWorkspaceNotificationsReadAction =
    markWorkspaceNotificationsReadAction ??
    unavailableNotificationMarkReadAction;
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
  const settingsConnections = useMemo(
    () => connections.map(workspaceSettingsConnectionFromMenu),
    [connections],
  );

  function openSettings(section: WorkspaceSettingsSection) {
    setSettingsSection(section);
    setSettingsOpen(true);
  }

  return (
    <main className="flex h-screen min-h-screen flex-col overflow-hidden">
      {listResult.status === "unavailable" ? (
        <>
          <WorkspaceHeader
            connections={connections}
            logoutAction={logoutAction}
            onOpenSettings={openSettings}
            setActiveConnectionAction={setActiveConnectionAction}
            userEmail={userEmail}
          />
          <UnavailableState
            onOpenWorkspaces={() => openSettings("workspaces")}
            reason={listResult.reason}
          />
        </>
      ) : (
        <TicketWorkspaceDisplay
          columns={columns}
          communicationCapabilities={effectiveCommunicationCapabilities}
          connections={connections}
          detail={detail}
          detailResult={detailResult}
          loadTicketDetailAction={effectiveLoadTicketDetailAction}
          loadTicketListPageAction={loadTicketListPageAction}
          loadWorkspaceNotificationsAction={
            effectiveLoadWorkspaceNotificationsAction
          }
          logoutAction={logoutAction}
          markWorkspaceNotificationsReadAction={
            effectiveMarkWorkspaceNotificationsReadAction
          }
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
          onOpenSettings={openSettings}
        />
      )}
      {settingsOpen ? (
        <WorkspaceSettingsDialog
          connections={settingsConnections}
          createConnectionAction={createConnectionAction}
          deleteConnectionAction={deleteConnectionAction}
          disableConnectionAction={disableConnectionAction}
          initialSection={settingsSection}
          onClose={() => setSettingsOpen(false)}
          providerOptions={connectionProviderOptions}
          setActiveConnectionAction={
            setActiveConnectionAction as HelpdeskConnectionFormAction
          }
          updateConnectionAction={updateConnectionAction}
          userEmail={userEmail}
          validateConnectionAction={validateConnectionAction}
        />
      ) : null}
    </main>
  );
}

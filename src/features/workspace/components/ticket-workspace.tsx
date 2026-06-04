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
import type {
  DeleteWorkspaceSavedViewAction,
  LoadWorkspaceSavedViewsSettingsAction,
  ReorderWorkspaceSavedViewsAction,
  SaveWorkspaceSavedViewAction,
  SavedViewSettingsData,
  SetDefaultWorkspaceSavedViewAction,
} from "@/features/saved-views/settings-model";
import {
  allTicketsSavedViewId,
  savedViewDisabledLabel,
  savedViewQueryRejection,
  type WorkspaceSavedView,
} from "@/features/saved-views/workspace";
import { compileSavedViewConditions } from "@/features/saved-views/conditions";
import type { AuthUserRole } from "@/auth/types";
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
import type { TicketListQueryCapabilities } from "@/core/providers";
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
  deleteSavedViewAction?: DeleteWorkspaceSavedViewAction;
  deleteConnectionAction?: HelpdeskConnectionFormAction;
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  disableConnectionAction?: HelpdeskConnectionFormAction;
  listResult: TicketListReadResult;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  loadSavedViewsSettingsAction?: LoadWorkspaceSavedViewsSettingsAction;
  loadWorkspaceNotificationsAction?: LoadWorkspaceNotificationsAction;
  searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  logoutAction(formData: FormData): void | Promise<void>;
  markWorkspaceNotificationsReadAction?: MarkWorkspaceNotificationsReadAction;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  rows: WorkspaceTicketRow[];
  savedViews?: WorkspaceSavedView[];
  initialSavedViewSettingsData?: SavedViewSettingsData;
  reorderSavedViewsAction?: ReorderWorkspaceSavedViewsAction;
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  saveSavedViewAction?: SaveWorkspaceSavedViewAction;
  selectedSavedViewId?: string;
  selectedTicketId?: string;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  setDefaultSavedViewAction?: SetDefaultWorkspaceSavedViewAction;
  tabs: WorkspaceTicketTab[];
  updateConnectionAction?: HelpdeskConnectionFormAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userEmail: string;
  userRole?: AuthUserRole;
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

export function workspaceSavedViewOptionsFromSettingsData(
  data: SavedViewSettingsData,
  previousOptions: WorkspaceSavedView[],
  capabilities?: TicketListQueryCapabilities,
): WorkspaceSavedView[] {
  if (data.views.length === 0) {
    return [{ id: allTicketsSavedViewId, label: "All tickets" }];
  }

  const previousById = new Map(
    previousOptions.map((option) => [option.id, option]),
  );

  return data.views.map((view) => {
    const previous = previousById.get(view.id);
    const query =
      view.conditions.length > 0
        ? compileSavedViewConditions({
            conditions: view.conditions,
            currentUser: data.currentUser,
          })
        : previous?.query;
    const disabledReason = query
      ? savedViewQueryRejection(query, capabilities)
      : previous?.disabledReason;

    const option: WorkspaceSavedView = {
      ...previous,
      id: view.id,
      label: view.name,
      isDefault: view.isDefault,
      ...(query ? { query } : {}),
    };

    if (disabledReason) {
      return {
        ...option,
        disabledLabel: savedViewDisabledLabel(disabledReason),
        disabledReason,
      };
    }

    delete option.disabledLabel;
    delete option.disabledReason;
    return option;
  });
}

export function TicketWorkspace({
  columns,
  communicationCapabilities,
  connections,
  connectionProviderOptions = [],
  createConnectionAction,
  deleteSavedViewAction,
  deleteConnectionAction,
  detail,
  detailResult,
  disableConnectionAction,
  listResult,
  loadTicketDetailAction,
  loadTicketListPageAction,
  loadSavedViewsSettingsAction,
  loadWorkspaceNotificationsAction,
  logoutAction,
  markWorkspaceNotificationsReadAction,
  metadataMutationCapabilities,
  rows,
  searchTicketLinkTargetsAction,
  savedViews,
  initialSavedViewSettingsData,
  reorderSavedViewsAction,
  initialWorkspaceOpenTabsState,
  saveWorkspaceOpenTabsStateAction,
  saveSavedViewAction,
  selectedSavedViewId,
  selectedTicketId,
  setActiveConnectionAction,
  setDefaultSavedViewAction,
  tabs,
  updateConnectionAction,
  updateTicketMetadataAction,
  userEmail,
  userRole = "USER",
  validateConnectionAction,
}: TicketWorkspaceProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSection, setSettingsSection] =
    useState<WorkspaceSettingsSection>("workspaces");
  const [workspaceSavedViewOptions, setWorkspaceSavedViewOptions] = useState<
    WorkspaceSavedView[]
  >(() => savedViews ?? [{ id: allTicketsSavedViewId, label: "All tickets" }]);
  const [savedViewSettingsData, setSavedViewSettingsData] = useState(
    initialSavedViewSettingsData,
  );
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
            workspaceSavedViewOptions
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
          deleteSavedViewAction={deleteSavedViewAction}
          disableConnectionAction={disableConnectionAction}
          initialSection={settingsSection}
          initialSavedViewData={savedViewSettingsData}
          loadSavedViewsSettingsAction={loadSavedViewsSettingsAction}
          onClose={() => setSettingsOpen(false)}
          onSavedViewDataChange={(data) => {
            setSavedViewSettingsData(data);
            setWorkspaceSavedViewOptions((currentOptions) =>
              workspaceSavedViewOptionsFromSettingsData(
                data,
                currentOptions,
                listResult.status === "available"
                  ? listResult.queryCapabilities
                  : undefined,
              ),
            );
          }}
          providerOptions={connectionProviderOptions}
          reorderSavedViewsAction={reorderSavedViewsAction}
          saveSavedViewAction={saveSavedViewAction}
          setActiveConnectionAction={
            setActiveConnectionAction as HelpdeskConnectionFormAction
          }
          setDefaultSavedViewAction={setDefaultSavedViewAction}
          updateConnectionAction={updateConnectionAction}
          userEmail={userEmail}
          userRole={userRole}
          validateConnectionAction={validateConnectionAction}
        />
      ) : null}
    </main>
  );
}
